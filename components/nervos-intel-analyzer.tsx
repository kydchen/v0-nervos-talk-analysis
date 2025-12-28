"use client"

import { useState, useEffect, useRef } from "react"
import {
  Network,
  BarChart3,
  AlertTriangle,
  ThumbsUp,
  Eye,
  Crown,
  Shield,
  Star,
  User,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  FileText,
  Info,
  X,
} from "lucide-react"
import * as d3 from "d3"
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

// Constants
const BASE_HOST = "https://talk.nervos.org"

// Utility functions
const cleanHtml = (html) => {
  if (!html) return ""
  const div = document.createElement("div")
  div.innerHTML = html
  div.querySelectorAll("aside.quote").forEach((el) => el.remove())
  return div.textContent || div.innerText || ""
}

const analyzeUserWeight = (post) => {
  const roles = []
  if (post.admin) roles.push("Admin")
  if (post.moderator) roles.push("Mod")
  roles.push(`LV${post.trust_level || 0}`)
  return roles.join("|")
}

// Network Graph Component using D3
const NetworkGraph = ({ data }) => {
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!data?.posts?.length || !svgRef.current) return

    const width = containerRef.current?.clientWidth || 800
    const height = 500

    // Build nodes and links
    const userMap = new Map()
    const links = []

    data.posts.forEach((post) => {
      if (!userMap.has(post.author)) {
        userMap.set(post.author, {
          id: post.author,
          posts: 0,
          receivedLikes: 0,
          givenLikes: 0,
          isAdmin: post.author_tags?.includes("Admin") || false,
          isMod: post.author_tags?.includes("Mod") || false,
          trustLevel: post.author_trust_level || 0,
        })
      }
      const user = userMap.get(post.author)
      user.posts++
      user.receivedLikes += post.likes
      ;(post.liked_by || []).forEach((liker) => {
        if (!userMap.has(liker)) {
          userMap.set(liker, {
            id: liker,
            posts: 0,
            receivedLikes: 0,
            givenLikes: 0,
            isAdmin: false,
            isMod: false,
            trustLevel: 0,
          })
        }
        userMap.get(liker).givenLikes++
        links.push({ source: liker, target: post.author })
      })
    })

    const nodes = Array.from(userMap.values())

    // Aggregate links
    const linkMap = new Map()
    links.forEach((l) => {
      const key = `${l.source}->${l.target}`
      linkMap.set(key, (linkMap.get(key) || 0) + 1)
    })

    const aggregatedLinks = Array.from(linkMap.entries()).map(([key, count]) => {
      const [source, target] = key.split("->")
      return { source, target, count }
    })

    console.log("[v0] Network graph - nodes:", nodes.length, "links:", aggregatedLinks.length)

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])

    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#ffffff88")
      .attr("d", "M0,-5L10,0L0,5")

    // Add zoom
    const g = svg.append("g")
    svg.call(
      d3
        .zoom()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => {
          g.attr("transform", event.transform)
        }),
    )

    // Simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(aggregatedLinks)
          .id((d) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30))

    const link = g
      .append("g")
      .selectAll("line")
      .data(aggregatedLinks)
      .join("line")
      .attr("stroke", "#64b5f6")
      .attr("stroke-width", (d) => Math.max(1, Math.min(d.count * 0.5, 5)))
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", "url(#arrow)")

    // Nodes
    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on("drag", (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }),
      )

    node
      .append("circle")
      .attr("r", (d) => 8 + Math.min(d.posts * 2 + d.receivedLikes, 20))
      .attr("fill", (d) => (d.isAdmin ? "#ff6b6b" : d.isMod ? "#4ecdc4" : d.trustLevel >= 3 ? "#ffe66d" : "#a8dadc"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)

    node
      .append("text")
      .text((d) => d.id)
      .attr("font-size", 10)
      .attr("dx", 12)
      .attr("dy", 4)
      .attr("fill", "#fff")

    node
      .append("title")
      .text((d) => `${d.id}\nPosts: ${d.posts}\nReceived: ${d.receivedLikes} likes\nGiven: ${d.givenLikes} likes`)

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)

      node.attr("transform", (d) => `translate(${d.x},${d.y})`)
    })

    return () => simulation.stop()
  }, [data])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}

// Post Card Component
const PostCard = ({ post, expanded, onToggle }) => {
  const getBadge = () => {
    if (post.author_tags.includes("Admin")) return { icon: Crown, color: "text-red-400 bg-red-900/30", label: "Admin" }
    if (post.author_tags.includes("Mod")) return { icon: Shield, color: "text-teal-400 bg-teal-900/30", label: "Mod" }
    if (post.author_tags.some((tag) => tag.startsWith("LV"))) {
      return {
        icon: Star,
        color: "text-yellow-400 bg-yellow-900/30",
        label: post.author_tags.find((tag) => tag.startsWith("LV")),
      }
    }
    return { icon: User, color: "text-blue-400 bg-blue-900/30", label: "LV0" }
  }

  const badge = getBadge()
  const BadgeIcon = badge.icon

  return (
    <div className={`border rounded-lg p-3 mb-2 transition-all ${badge.color}`}>
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-mono">#{post.floor}</span>
          <span className="font-semibold text-white">{post.author}</span>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${badge.color}`}>
            <BadgeIcon size={12} />
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-pink-400">
            <ThumbsUp size={14} /> {post.likes}
          </span>
          <span className="flex items-center gap-1 text-blue-400">
            <Eye size={14} /> {post.reads}
          </span>
          {expanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-gray-300 text-sm whitespace-pre-wrap">{post.content}</p>
          {post.liked_by?.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              <span className="text-pink-400">Liked by / 点赞者:</span> {post.liked_by.join(", ")}
            </div>
          )}
          {post.edit_history && <div className="mt-1 text-xs text-yellow-500">📝 {post.edit_history}</div>}
        </div>
      )}
    </div>
  )
}

// Main App
export default function NervosIntelAnalyzer() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [apiKey, setApiKey] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState("")
  const [showInstructions, setShowInstructions] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState("floor")
  const [filterRole, setFilterRole] = useState("all")
  const [expandedPost, setExpandedPost] = useState(null)
  const [progressMessages, setProgressMessages] = useState<string[]>([])

  const handleAnalyze = async () => {
    if (!url) return

    setLoading(true)
    setError(null)
    setData(null)
    setProgressMessages([])

    try {
      const topicIdMatch = url.match(/\/t\/[^/]+\/(\d+)/)
      if (!topicIdMatch) throw new Error("Invalid URL format")
      const topicId = topicIdMatch[1]

      const addProgress = (msg: string) => {
        setProgressMessages((prev) => [...prev.slice(-2), msg])
      }

      addProgress("正在获取帖子信息... / Fetching topic info...")
      const topicRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://talk.nervos.org/t/${topicId}.json`)}`)
      if (!topicRes.ok) throw new Error(`Failed to fetch topic: ${topicRes.status}`)
      const topicData = await topicRes.json()

      const postStream = topicData.post_stream
      const allPostIds = postStream.stream

      addProgress(`共 ${allPostIds.length} 个帖子 / Total ${allPostIds.length} posts`)
      console.log("[v0] Total post IDs from stream:", allPostIds.length)

      const CHUNK_SIZE = 20
      const allPosts = []

      for (let i = 0; i < allPostIds.length; i += CHUNK_SIZE) {
        const chunkIds = allPostIds.slice(i, i + CHUNK_SIZE)
        const postIdsParam = chunkIds.map((id) => `post_ids[]=${id}`).join("&")
        addProgress(
          `正在加载帖子 ${i + 1}-${Math.min(i + CHUNK_SIZE, allPostIds.length)}... / Loading posts ${i + 1}-${Math.min(i + CHUNK_SIZE, allPostIds.length)}...`,
        )

        console.log(
          `[v0] Fetching chunk ${i / CHUNK_SIZE + 1}: posts ${i + 1}-${Math.min(i + CHUNK_SIZE, allPostIds.length)}`,
        )

        const postsRes = await fetch(
          `/api/proxy?url=${encodeURIComponent(`https://talk.nervos.org/t/${topicId}/posts.json?${postIdsParam}`)}`,
        )
        if (!postsRes.ok) {
          console.error(`[v0] Failed to fetch chunk: ${postsRes.status}`)
          throw new Error(`Failed to fetch posts chunk: ${postsRes.status}`)
        }
        const postsData = await postsRes.json()
        console.log(`[v0] Received ${postsData.post_stream.posts.length} posts in this chunk`)
        allPosts.push(...postsData.post_stream.posts)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      console.log(`[v0] Total posts fetched: ${allPosts.length}`)
      addProgress(`已加载 ${allPosts.length} 个帖子 / Loaded ${allPosts.length} posts`)

      const posts = allPosts.map((p, idx) => ({
        id: p.id,
        floor: idx + 1,
        author: p.username,
        author_name: p.name || p.username,
        author_avatar: p.avatar_template?.replace("{size}", "48"),
        author_trust_level: p.trust_level,
        author_tags: [
          ...(p.admin ? ["Admin"] : []),
          ...(p.moderator ? ["Mod"] : []),
          ...(p.trust_level >= 3 ? [`LV${p.trust_level}`] : []),
        ],
        content: p.cooked.replace(/<[^>]*>/g, ""),
        created_at: new Date(p.created_at),
        likes: p.actions_summary?.find((a) => a.id === 2)?.count || 0,
        reads: p.reads || 0,
        liked_by: [],
      }))

      addProgress("正在获取点赞数据... / Fetching likes data...")
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i]
        if (post.likes > 0) {
          addProgress(`#${post.floor} 获得 ${post.likes} 个赞 / #${post.floor} with ${post.likes} likes`)
          try {
            const likesRes = await fetch(
              `/api/proxy?url=${encodeURIComponent(`https://talk.nervos.org/post_action_users.json?id=${post.id}&post_action_type_id=2`)}`,
            )
            if (likesRes.ok) {
              const likesData = await likesRes.json()
              post.liked_by = likesData.post_action_users?.map((u) => u.username) || []
            }
          } catch (err) {
            console.error(`Failed to fetch likes for post ${post.id}:`, err)
          }
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      addProgress("✅ 分析完成！ / Analysis complete!")

      setData({
        topic: topicData.title,
        url,
        posts,
        users: [...new Set(posts.map((p) => p.author))],
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setTimeout(() => setProgressMessages([]), 2000)
    }
  }

  const runAiAnalysis = async () => {
    if (!apiKey || !data) return

    setAiLoading(true)
    setAiAnalysis("")

    const postsSummary = data.posts.slice(0, 40).map((p) => ({
      floor: p.floor,
      author: p.author,
      tags: p.author_tags,
      content: p.content.slice(0, 400),
      likes: p.likes,
      liked_by: p.liked_by.slice(0, 8),
    }))

    const prompt = `You are an expert forum discussion analyst. Analyze this Nervos blockchain community discussion.

**Topic**: ${data.topic}
**URL**: ${data.url}

**Discussion Data**:
${JSON.stringify(postsSummary, null, 2)}

IMPORTANT: You MUST provide your analysis in STRICT bilingual format. For EACH section, write the English version FIRST, then immediately follow with the Chinese translation.

Format example:
## 1. Core Controversy Summary
[English analysis here]

核心争议总结
[Chinese translation here]

---

Please analyze in this exact format:

## 1. Core Controversy Summary
[Your English analysis]

核心争议总结
[Your Chinese translation]

---

## 2. Pro Arguments
[Your English analysis]

支持方观点
[Your Chinese translation]

---

## 3. Con Arguments
[Your English analysis]

反对方观点
[Your Chinese translation]

---

## 4. Camp Analysis (Based on liked_by data)
[Your English analysis]

阵营分析（基于点赞数据）
[Your Chinese translation]

---

## 5. Key Stakeholder Positions (Admins/Mods)
[Your English analysis]

核心利益方立场（管理员/版主）
[Your Chinese translation]

---

## 6. Discussion Health Assessment
[Your English analysis]

讨论健康度评估
[Your Chinese translation]`

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response"
      setAiAnalysis(text)
    } catch (err) {
      setAiAnalysis(`Error: ${err.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  // Computed values
  const stats = data
    ? {
        totalPosts: data.posts.length,
        totalLikes: data.posts.reduce((s, p) => s + p.likes, 0),
        participants: new Set(data.posts.map((p) => p.author)).size,
        adminPosts: data.posts.filter((p) => p.author_tags.includes("Admin") || p.author_tags.includes("Mod")).length,
      }
    : null

  const timelineData = data
    ? (() => {
        const byDate = {}
        data.posts.forEach((p) => {
          const date = p.created_at.toISOString().split("T")[0]
          if (!byDate[date]) byDate[date] = { date, posts: 0, likes: 0 }
          byDate[date].posts++
          byDate[date].likes += p.likes
        })
        return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
      })()
    : []

  const anomalies =
    data?.posts.filter((p) => (p.reads > 50 && p.likes === 0) || (p.reads > 100 && p.likes / p.reads < 0.01)) || []

  const filteredPosts = data?.posts.filter((p) => {
    if (filterRole === "admin") return p.author_tags.includes("Admin")
    if (filterRole === "mod") return p.author_tags.includes("Mod")
    if (filterRole === "senior") return p.author_tags.some((tag) => tag.startsWith("LV"))
    return true
  })

  const sortedPosts = filteredPosts
    ? filteredPosts.sort((a, b) => {
        if (sortBy === "floor") return a.floor - b.floor
        if (sortBy === "likes") return b.likes - a.likes
        if (sortBy === "reads") return b.reads - a.reads
        return 0
      })
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Nervos Intel Analyzer
          </h1>
          <p className="text-slate-300 text-lg">Community Discussion Intelligence Analysis / 社区讨论情报分析</p>
        </header>

        {showInstructions && (
          <Card className="mb-6 bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-slate-600/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Info className="w-5 h-5 text-blue-400" />
                  使用说明 / How to Use
                </CardTitle>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <strong className="text-white block">1. 输入论坛链接</strong>
                <strong className="text-slate-300 block text-sm">Enter Forum URL</strong>
                <p className="text-slate-100 mt-1">
                  粘贴 Nervos Talk 帖子链接，例如: https://talk.nervos.org/t/topic-name/12345
                </p>
                <p className="text-slate-300 text-sm">
                  Paste Nervos Talk topic link, e.g.: https://talk.nervos.org/t/topic-name/12345
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-white block">2. 分析数据</strong>
                <strong className="text-slate-300 block text-sm">Analyze Data</strong>
                <p className="text-slate-100 mt-1">
                  点击"分析 Analyze"按钮，系统将自动抓取所有帖子、点赞关系和用户信息
                </p>
                <p className="text-slate-300 text-sm">
                  Click "Analyze" button, the system will automatically fetch all posts, likes, and user information
                </p>
                <p className="text-yellow-300 text-xs mt-1">⚠️ 注意：为避免请求限流，获取点赞数据会较慢，请耐心等待</p>
                <p className="text-yellow-200 text-xs">
                  ⚠️ Note: To avoid rate limiting, fetching likes data will be slow, please be patient
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-white block">3. AI 深度分析（可选）</strong>
                <strong className="text-slate-300 block text-sm">AI Deep Analysis (Optional)</strong>
                <p className="text-slate-100 mt-1">
                  在下方 API Key 输入框中填入你的 <strong className="text-blue-300">Google Gemini API Key</strong>
                </p>
                <p className="text-slate-300 text-sm">
                  Enter your <strong className="text-blue-300">Google Gemini API Key</strong> in the input box below
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  获取 API Key / Get API Key:{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-300 hover:text-blue-200"
                  >
                    https://aistudio.google.com/apikey
                  </a>
                </p>
                <p className="text-slate-100 mt-1">然后点击"运行 AI 分析"按钮，将使用 Gemini 模型进行争议分析</p>
                <p className="text-slate-300 text-sm">
                  Then click "Run AI Analysis" button to use Gemini model for controversy analysis
                </p>
              </div>

              <div className="space-y-1">
                <strong className="text-white block">4. 查看可视化</strong>
                <strong className="text-slate-300 block text-sm">View Visualizations</strong>
                <div className="mt-2 space-y-2">
                  <div className="ml-4">
                    <p className="text-slate-100">
                      <strong className="text-white">Network 社交网络图：</strong>展示用户点赞关系网络
                    </p>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-slate-100">Network Graph:</strong> Shows user like relationship network
                    </p>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5 text-slate-300 text-sm">
                      <li>节点（圆点）= 用户，大小代表活跃度 / Nodes = Users, size represents activity</li>
                      <li>
                        连线（箭头）= 点赞关系，箭头从点赞者指向被点赞者 / Links = Like relationships, arrow from liker
                        to liked
                      </li>
                      <li>
                        颜色 / Colors: 🔴红色=管理员/Admin 🟢绿色=版主/Moderator 🟡黄色=高信任用户/High Trust
                        🔵蓝色=普通用户/Regular User
                      </li>
                    </ul>
                  </div>
                  <div className="ml-4">
                    <p className="text-slate-100">
                      <strong className="text-white">Timeline 时间线：</strong>显示帖子发布和点赞随时间的分布
                    </p>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-slate-100">Timeline:</strong> Shows posts and likes distribution over time
                    </p>
                  </div>
                  <div className="ml-4">
                    <p className="text-slate-100">
                      <strong className="text-white">Posts 帖子列表：</strong>可按楼层、点赞数、阅读量排序，支持角色筛选
                    </p>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-slate-100">Posts List:</strong> Sort by floor, likes, reads; filter by
                      role
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 bg-slate-800/70 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Input / 输入</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm mb-2 text-white">Nervos Talk Topic URL / 论坛帖子链接</label>
              <Input
                type="text"
                placeholder="https://talk.nervos.org/t/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !url}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg font-medium transition-colors text-white"
            >
              {loading ? "分析中... Analyzing..." : "分析 Analyze"}
            </button>
          </CardContent>
        </Card>

        {loading && (
          <Card className="mb-6 bg-slate-800/70 border-blue-500/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400 mr-3" />
                <span className="text-lg text-slate-200">Analyzing...</span>
              </div>
              {progressMessages.length > 0 && (
                <div className="space-y-2 mt-4">
                  {progressMessages.map((msg, idx) => (
                    <div key={idx} className="text-sm text-slate-300 text-center animate-fade-in">
                      {msg}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mb-6 bg-red-950/30 border-red-500/50">
            <CardContent className="py-4">
              <p className="text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <Card className="mb-8 bg-slate-800/70 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  AI Analysis / AI 分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-white">Google Gemini API Key</label>
                  <Input
                    type="password"
                    placeholder="Enter your Gemini API key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    获取 API Key:{" "}
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-300 hover:text-blue-200"
                    >
                      https://aistudio.google.com/apikey
                    </a>
                  </p>
                </div>
                <button
                  onClick={runAiAnalysis}
                  disabled={aiLoading || !apiKey}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 rounded-lg font-medium transition-colors text-white"
                >
                  {aiLoading ? "分析中... Analyzing..." : "运行 AI 分析 / Run AI Analysis"}
                </button>
                {aiAnalysis && (
                  <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
                    <div className="prose prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-slate-200">{aiAnalysis}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mb-8 bg-slate-800/70 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Network className="w-5 h-5 text-blue-400" />
                  Network / 关系网络
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 text-sm text-slate-300">
                  🕸️ Like Relationship Network / 点赞关系网络 • Drag to move, scroll to zoom / 拖拽移动，滚轮缩放 •
                  用户等级基于Nervos Talk后台算法数据 / User levels are based on Nervos Talk backend algorithm data.
                </div>
                <div className="mb-3 p-3 bg-slate-900/50 rounded text-sm text-slate-200">
                  <p>
                    <strong className="text-blue-300">连线含义 / Link Meaning:</strong>
                  </p>
                  <p className="mt-1">箭头从点赞者指向被点赞者 / Arrow points from liker to the liked person</p>
                  <p className="text-slate-400 text-xs mt-1">例如: A → B 表示用户 A 点赞了用户 B 的帖子</p>
                </div>
                <div className="flex gap-4 text-xs mb-3 text-slate-300">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-400"></span> Admin
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-teal-400"></span> Mod
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-yellow-400"></span> LV3+
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-300"></span> Others
                  </span>
                </div>
                <NetworkGraph data={data} />
              </CardContent>
            </Card>

            <Card className="mb-8 bg-slate-800/70 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Timeline / 时间轴
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-semibold mb-4 text-slate-200">📈 Activity Timeline / 活动时间轴</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={timelineData}>
                      <XAxis dataKey="date" stroke="#888" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#667eea" />
                      <YAxis yAxisId="right" orientation="right" stroke="#f093fb" />
                      <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333" }} />
                      <Bar yAxisId="left" dataKey="posts" fill="#667eea" name="Posts / 帖子" />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="likes"
                        stroke="#f093fb"
                        strokeWidth={2}
                        name="Likes / 点赞"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8 bg-slate-800/70 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <AlertTriangle className="w-5 h-5 text-blue-400" />
                  Anomalies / 异常
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-semibold mb-4 text-slate-200">⚠️ Anomaly Detection / 异常检测</h3>
                {anomalies.length === 0 ? (
                  <div className="text-center py-8 text-green-300">
                    ✅ No significant anomalies detected / 未检测到显著异常
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-yellow-300 mb-3">
                      Found {anomalies.length} high-read low-engagement posts / 发现 {anomalies.length}{" "}
                      条高阅读低互动帖子
                    </div>
                    {anomalies.map((p) => (
                      <PostCard key={p.floor} post={p} expanded={false} onToggle={() => {}} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/70 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Posts / 帖子列表
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-4">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1 rounded bg-slate-900/50 border border-slate-600 text-slate-200"
                  >
                    <option value="floor">Sort: Floor / 楼层</option>
                    <option value="likes">Sort: Likes / 点赞</option>
                    <option value="reads">Sort: Reads / 阅读</option>
                  </select>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-3 py-1 rounded bg-slate-900/50 border border-slate-600 text-slate-200"
                  >
                    <option value="all">Filter: All / 全部</option>
                    <option value="admin">Admin only</option>
                    <option value="mod">Mod only</option>
                    <option value="senior">LV3+ only</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedPosts.map((post) => (
                    <PostCard
                      key={post.floor}
                      post={post}
                      expanded={expandedPost === post.floor}
                      onToggle={() => setExpandedPost(expandedPost === post.floor ? null : post.floor)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
