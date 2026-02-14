
import { NextRequest, NextResponse } from "next/server"

// 1. 复用 URL 解析逻辑
const parseDiscourseUrl = (inputUrl: string) => {
  try {
    const urlObj = new URL(inputUrl.trim())
    const domain = urlObj.origin
    const parts = urlObj.pathname.split("/")
    const tIndex = parts.indexOf("t")
    if (tIndex === -1 || parts.length <= tIndex + 2) return null
    const topicId = parts[tIndex + 2]
    if (!/^\d+$/.test(topicId)) return null
    return { domain, topicId }
  } catch (e) {
    return null
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const targetUrl = searchParams.get("url")

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 })
  }

  const parsed = parseDiscourseUrl(targetUrl)
  if (!parsed) {
    return NextResponse.json({ error: "Invalid Discourse URL format." }, { status: 400 })
  }

  const { domain, topicId } = parsed

  try {
    // 2. 获取主帖和 stream ID
    const topicRes = await fetch(`${domain}/t/${topicId}.json`, {
      headers: { "User-Agent": "NervosIntelAgent/1.0", Accept: "application/json" },
    })
    if (!topicRes.ok) throw new Error(`Topic fetch failed: ${topicRes.status}`)
    const topicData = await topicRes.json()

    const stream = topicData.post_stream.stream
    let allPosts = topicData.post_stream.posts

    // 3. 如果帖子超过默认数量，批量拉取其余文本 (针对 Agent 优化：无需间隔等待太久，因为请求量很小)
    if (stream.length > allPosts.length) {
      const remainingIds = stream.slice(allPosts.length)
      const BATCH_SIZE = 100 // 一次拉取 100 楼，极速模式
      
      for (let i = 0; i < remainingIds.length; i += BATCH_SIZE) {
        const chunkIds = remainingIds.slice(i, i + BATCH_SIZE)
        const queryParams = chunkIds.map((id: number) => `post_ids[]=${id}`).join("&")
        const batchRes = await fetch(`${domain}/t/${topicId}/posts.json?${queryParams}`, {
           headers: { "User-Agent": "NervosIntelAgent/1.0", Accept: "application/json" },
        })
        if (batchRes.ok) {
          const batchData = await batchRes.json()
          allPosts.push(...batchData.post_stream.posts)
        }
      }
    }

    // 4. 数据清洗 (提取精简、高价值的上下文给 LLM，节省 Token)
    const cleanedPosts = allPosts.map((p: any, idx: number) => ({
      floor: p.post_number || idx + 1,
      author: p.username,
      trust_level: p.trust_level,
      is_admin: !!p.admin,
      is_mod: !!p.moderator,
      likes_count: p.actions_summary?.find((a: any) => a.id === 2)?.count || 0,
      content: p.cooked.replace(/<[^>]*>/g, "").trim(), // 去除 HTML 标签，提取纯文本
    }))

    // 5. 我们之前讨论出的核心 Prompt 哲学
    const recommended_prompt = `You are an expert data analyst specializing in blockchain community governance. Analyze the provided structured discussion data from a Discourse forum.

**CRITICAL INSTRUCTIONS (STRICTLY FOLLOW)**:
1. **NO HALLUCINATIONS**: Only use facts explicitly stated in the provided JSON data.
2. **CITATION STYLE**: When quoting or referencing an argument, YOU MUST append the floor number, e.g., "(Floor 12)".
3. **WEIGHTING & QUALITY METRICS (CORE LOGIC)**:
   - Argument Quality > Identity: Do NOT judge based on user 'trust_level', 'is_admin', or 'is_mod'. An LV0 user with data is worth more than an Admin with just an opinion.
   - High-Value Signals: Prioritize posts that contain On-chain Data, Historical Context, Verifiable Risks, and Logical Completeness.
4. **IDENTITY BLINDNESS**: Do NOT refer to users by their titles (e.g., "Admin UserX") in your argument analysis. Treat them simply as "UserX" to prevent the Halo Effect. Only mention their role if they performed a specific moderation duty.
5. **OUTPUT**: Summarize the Executive Summary, Main Controversies, Key Arguments & Camps, and Unresolved Risks. Be objective and decouple authority from correctness.`

    // 6. 拼装 Agent 专属返回体
    return NextResponse.json({
      metadata: {
        topic: topicData.title,
        source_url: targetUrl,
        total_posts: cleanedPosts.length,
        analyzed_at: new Date().toISOString()
      },
      recommended_prompt: recommended_prompt,
      data: cleanedPosts
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}