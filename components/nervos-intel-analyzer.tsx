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
  Download,
  Trash2,
  Github,
  ExternalLink,
} from "lucide-react"
import * as d3 from "d3"
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Image from "next/image" // Added Image import

// // Constants
// const BASE_HOST = "https://talk.nervos.org"
// --- Helper: docode Discourse URL ---
// like:
// https://talk.nervos.org/t/topic-name/12345
// https://forum.arbitrum.foundation/t/topic-name/12345/42
const parseDiscourseUrl = (inputUrl: string) => {
  try {
    const urlObj = new URL(inputUrl.trim())
    const domain = urlObj.origin 
    
    const parts = urlObj.pathname.split('/')
    
    const tIndex = parts.indexOf('t')
    
    if (tIndex === -1 || parts.length <= tIndex + 2) {
      return null
    }

    const topicId = parts[tIndex + 2] 

    if (!/^\d+$/.test(topicId)) {
        return null
    }

    return { domain, topicId }
  } catch (e) {
    console.error("Invalid URL", e)
    return null
  }
}

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
// 1. add showAdminRoles 
const NetworkGraph = ({ 
  data, 
  userSummaries, 
  showAdminRoles 
}: { 
  data: any; 
  userSummaries?: Record<string, string>; 
  showAdminRoles: boolean 
}) => {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [hoveredNode, setHoveredNode] = useState<{ id: string; summary?: string } | null>(null)

  // 2. showAdminRoles to button
  useEffect(() => {
    if (!data?.posts?.length || !svgRef.current) return

    const width = containerRef.current?.clientWidth || 800
    const height = 500

    // --- 3. color ---
    // const getNodeColor = (d: any) => {
    //   // model 1: equal (close) - blue
    //   if (!showAdminRoles) {
    //     return "#60a5fa" // Blue-400
    //   }

    //   // Model 2: role (open)
    //   if (d.isAdmin) return "#ef4444"       // 🔴 Red-500 (Admin)
    //   if (d.isMod) return "#22c55e"         // 🟢 Green-500 (Mod)
    //   if (d.trustLevel >= 3) return "#facc15" // 🟡 Yellow-400 (High Trust / LV3+)
      
    //   // Normal user
    //   return "#60a5fa" // 🔵 Blue-400 (Regular)
    // }
    // ... inside NetworkGraph component ...

    const getNodeColor = (d: any) => {
      // model 1: equal (close) - blue
      if (!showAdminRoles) {
        return "#60a5fa" // Blue-400
      }

      // Model 2: role (open)
      if (d.isAdmin) return "#ef4444"       // 🔴 Red-500 (Admin)
      if (d.isMod) return "#22c55e"         // 🟢 Green-500 (Mod)
      
      // Trust Levels
      if (d.trustLevel >= 3) return "#facc15" // 🟡 Yellow-400 (L3+)
      if (d.trustLevel === 2) return "#3b82f6" // 🔵 Blue-500 (L2)
      if (d.trustLevel === 1) return "#94a3b8" // ⚪ Slate-400 (L1)
      
      // LV0 / Visitor
      return "#475569" // ⚫ Slate-600 (L0)
    }



    // --- Data Processing ---
    const userMap = new Map()
    const links = []

    data.posts.forEach((post) => {
      if (!userMap.has(post.author)) {
        userMap.set(post.author, {
          id: post.author,
          posts: 0,
          receivedLikes: 0,
          givenLikes: 0,
          isAdmin: false,
          isMod: false,
          trustLevel: 0,
        })
      }
      const user = userMap.get(post.author)
      user.posts++
      user.receivedLikes += post.likes
      if (post.author_tags?.includes("Admin")) user.isAdmin = true
      if (post.author_tags?.includes("Mod")) user.isMod = true
      if (post.author_trust_level > user.trustLevel) user.trustLevel = post.author_trust_level
      ;(post.liked_by || []).forEach((liker) => {
        if (!userMap.has(liker))
          userMap.set(liker, {
            id: liker,
            posts: 0,
            receivedLikes: 0,
            givenLikes: 0,
            isAdmin: false,
            isMod: false,
            trustLevel: 0,
          })
        userMap.get(liker).givenLikes++
        links.push({ source: liker, target: post.author })
      })
    })

    const nodes = Array.from(userMap.values())
    const d3Links = links.map((d) => ({ ...d }))

    // --- D3 Drawing ---
    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
    const g = svg.append("g")

    svg.call(
      d3
        .zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => g.attr("transform", event.transform)),
    )

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(d3Links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => 15 + Math.min(d.posts * 2 + d.receivedLikes, 30)))

    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(d3Links)
      .join("line")
      .attr("stroke", "#64b5f6")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)

    const arrow = g
      .append("g")
      .attr("class", "arrows")
      .selectAll("path")
      .data(d3Links)
      .join("path")
      .attr("d", "M0,-4 L8,0 L0,4")
      .attr("fill", "#64b5f6")
      .attr("opacity", 0.6)

    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>().on("start", dragstarted).on("drag", dragged).on("end", dragended))

    node
      .append("circle")
      .attr("r", (d: any) => 8 + Math.min(d.posts * 2 + d.receivedLikes, 20))
      // 4. 正确应用颜色函数
      .attr("fill", (d: any) => getNodeColor(d)) 
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2)

    node
      .append("text")
      .text((d: any) => d.id)
      .attr("font-size", 11)
      .attr("dx", 14)
      .attr("dy", 4)
      .attr("fill", "#fff")
      .attr("font-weight", "500")
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 2px #000")

    // --- Interactions ---
    const isConnected = (a: any, b: any) => d3Links.some((l) => l.source.id === a.id && l.target.id === b.id)

    const fade = (opacity: number) => (event: any, d: any) => {
      if (opacity === 1) {
        setHoveredNode(null)
      } else {
        setHoveredNode({
          id: d.id,
          summary: userSummaries?.[d.id] || "No AI summary available yet (Run AI Analysis first).",
        })
      }

      if (opacity === 1) {
        node.style("opacity", 1)
        link.style("stroke-opacity", 0.4).attr("stroke", "#64b5f6")
        arrow.attr("opacity", 0.6).attr("fill", "#64b5f6")
        return
      }
      // Hover 时的 Spotlight 效果：
      // 被关注的节点 + 连接它的节点 = 不透明
      // 其他节点 = 透明度 0.1
      node.style("opacity", (o: any) => (o.id === d.id || isConnected(o, d) ? 1 : 0.1))
      link
        .style("stroke-opacity", (o: any) => (o.target.id === d.id ? 1 : 0.05))
        .attr("stroke", (o: any) => (o.target.id === d.id ? "#fbbf24" : "#64b5f6"))
      arrow
        .attr("opacity", (o: any) => (o.target.id === d.id ? 1 : 0.05))
        .attr("fill", (o: any) => (o.target.id === d.id ? "#fbbf24" : "#64b5f6"))
    }

    node.on("mouseover", fade(0.1)).on("mouseout", fade(1))

    simulation.on("tick", () => {
      nodes.forEach((d: any) => {
        d.x = Math.max(20, Math.min(width - 20, d.x))
        d.y = Math.max(20, Math.min(height - 20, d.y))
      })
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)
      arrow.attr("transform", (d: any) => {
        const dx = d.target.x - d.source.x
        const dy = d.target.y - d.source.y
        const midX = (d.source.x + d.target.x) / 2
        const midY = (d.source.y + d.target.y) / 2
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)
        return `translate(${midX}, ${midY}) rotate(${angle})`
      })
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
      fade(0.1)(event, d)
    }
    function dragged(event: any, d: any) {
      d.fx = event.x
      d.fy = event.y
    }
    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
      fade(1)(event, d)
    }

    return () => simulation.stop()
  }, [data, userSummaries, showAdminRoles])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      {/* AI Card */}
      {hoveredNode && userSummaries && userSummaries[hoveredNode.id] && (
        <div className="absolute bottom-4 left-4 max-w-[300px] z-10 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-slate-900/90 backdrop-blur-md border border-purple-500/50 rounded-xl p-4 shadow-2xl shadow-purple-900/20">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-700/50 pb-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
              <span className="text-purple-300 font-bold text-sm">AI Persona / AI 画像</span>
            </div>
            <p className="text-lg font-bold text-white mb-1">{hoveredNode.id}</p>
            <p className="text-slate-300 text-sm italic leading-relaxed">"{userSummaries[hoveredNode.id]}"</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Post Card Component
const PostCard = ({ post, expanded, onToggle }) => {
  // const getBadge = () => {
  //   if (post.author_tags.includes("Admin")) return { icon: Crown, color: "text-red-400 bg-red-900/30", label: "Admin" }
  //   if (post.author_tags.includes("Mod")) return { icon: Shield, color: "text-teal-400 bg-teal-900/30", label: "Mod" }
  //   if (post.author_tags.some((tag) => tag.startsWith("LV"))) {
  //     return {
  //       icon: Star,
  //       color: "text-yellow-400 bg-yellow-900/30",
  //       label: post.author_tags.find((tag) => tag.startsWith("LV")),
  //     }
  //   }
  //   return { icon: User, color: "text-blue-400 bg-blue-900/30", label: "LV0" }
  // }
  const getBadge = () => {
    // 1. Admin (Red)
    if (post.author_tags?.includes("Admin")) {
      return { 
        icon: Crown, 
        color: "text-red-400 bg-red-900/30", 
        label: "Admin" 
      }
    }
    
    // 2. Mod (Green)
    if (post.author_tags?.includes("Mod")) {
      return { 
        icon: Shield, 
        color: "text-teal-400 bg-teal-900/30", 
        label: "Mod" 
      }
    }

    // 3. Trust Levels (post.author_trust_level)
    const tl = post.author_trust_level
    
    // LV3+ (GLD - Lv+3 Star)
    if (tl >= 3) {
      return { 
        icon: Star, 
        color: "text-yellow-400 bg-yellow-900/30", 
        label: `LV${tl}` 
      }
    }
    
    // LV2 (Blue)
    if (tl === 2) {
      return { 
        icon: User, 
        color: "text-blue-400 bg-blue-900/30", 
        label: "LV2" 
      }
    }

    // LV1 (Gray Blue)
    if (tl === 1) {
      return { 
        icon: User, 
        color: "text-slate-300 bg-slate-800/50", 
        label: "LV1" 
      }
    }
    
    // LV0 / Default (Gray)
    return { 
      icon: User, 
      color: "text-slate-500 bg-slate-900/30", 
      label: "LV0" 
    }
  }


  const badge = getBadge()
  const BadgeIcon = badge.icon

  return (
    <div
      id={`post-${post.floor}`} //add id for jump
      className={`border rounded-lg p-3 mb-2 transition-all ${badge.color} scroll-mt-20`}
    >
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
  const [isKeyVerified, setIsKeyVerified] = useState(false)
  const [availableModels, setAvailableModels] = useState<{ name: string; displayName: string }[]>([])
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash") // Default Flash 2.5
  const [verifying, setVerifying] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState("floor")
  const [filterRole, setFilterRole] = useState("all")
  const [expandedPost, setExpandedPost] = useState(null)
  const [showAdminRoles, setShowAdminRoles] = useState(false) // default close
  const [progressMessages, setProgressMessages] = useState<string[]>([])
  const [userSummaries, setUserSummaries] = useState<Record<string, string>>({})

  // Read Local API Key
  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key")
    if (savedKey) {
      setApiKey(savedKey)
    }
  }, [])

  // Clear Key
  const handleClearKey = () => {
    setApiKey("")
    setIsKeyVerified(false)
    setAvailableModels([])
    localStorage.removeItem("gemini_api_key")
  }

  // --- Text render + Floor link + MD ---
  const MarkdownRenderer = ({ content }: { content: string }) => {
    if (!content) return null

    // A. Internal Helper
    const parseFloorLinks = (text: string) => {
      const citationRegex = /([$$（]\s*(?:Floor|楼层)\s*(?:(?:\d+)(?:[,，\s]|Floor|楼层)*)+[$$）])/gi
      const parts = text.split(citationRegex)

      return parts.map((part, index) => {
        if (citationRegex.test(part)) {
          const subParts = part.split(/(\d+)/g)
          return (
            <span key={index} className="text-slate-500 text-sm mx-1">
              {subParts.map((subPart, subIndex) => {
                if (/^\d+$/.test(subPart)) {
                  const floor = Number.parseInt(subPart)
                  return (
                    <span
                      key={subIndex}
                      className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-mono bg-blue-900/30 px-1 rounded transition-colors"
                      onClick={() => {
                        const el = document.getElementById(`post-${floor}`)
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" })
                          el.classList.add("ring-2", "ring-yellow-400", "scale-[1.02]")
                          setTimeout(() => el.classList.remove("ring-2", "ring-yellow-400", "scale-[1.02]"), 2000)
                        } else {
                          alert(`Post #${floor} hidden. / 楼层 #${floor} 不可见。`)
                        }
                      }}
                    >
                      {subPart}
                    </span>
                  )
                }
                return <span key={subIndex}>{subPart}</span>
              })}
            </span>
          )
        }
        return part
      })
    }

    // B. **Bold**
    const parseBold = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g)
      return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="text-white font-bold">
              {parseFloorLinks(part.slice(2, -2))}
            </strong>
          )
        }
        return <span key={index}>{parseFloorLinks(part)}</span>
      })
    }

    // C. Main Loop
    return (
      <div className="space-y-2 font-sans">
        {content.split("\n").map((line, index) => {
          const trimmed = line.trim()
          if (!trimmed) return <div key={index} className="h-2" />

          // 1. ## Title
          if (trimmed.startsWith("## ")) {
            return (
              <h3
                key={index}
                className="text-l font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-3 pb-2 border-b border-slate-700/50"
              >
                {trimmed.replace("## ", "")}
              </h3>
            )
          }

          // 2. (---)
          if (trimmed === "---") {
            return <hr key={index} className="border-slate-700/50 my-3" />
          }

          // 3. (* Item  - Item)
          if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            return (
              <div key={index} className="flex gap-3 ml-2">
                <span className="text-blue-300 text-[15px] mt-1.5 text-xs">●</span>
                <span className="text-slate-300 leading-relaxed flex-1 text-[15px]">
                  {parseBold(trimmed.substring(2))}
                </span>
              </div>
            )
          }

          // 4. Normal
          return (
            <p key={index} className="text-slate-300 leading-relaxed text-[15px]">
              {parseBold(line)}
            </p>
          )
        })}
      </div>
    )
  }

  const handleAnalyze = async () => {
    if (!url) return

    setLoading(true)
    setError(null)
    setData(null)
    setProgressMessages([])

    try {
      // const topicIdMatch = url.match(/\/t\/[^/]+\/(\d+)/)
      // if (!topicIdMatch) throw new Error("Invalid URL format")
      // const topicId = topicIdMatch[1]
      const parsed = parseDiscourseUrl(url)
      if (!parsed) throw new Error("Invalid URL format. Please use a valid Discourse topic link.")
      const { domain, topicId } = parsed

      const addProgress = (msg: string) => {
        setProgressMessages((prev) => [...prev.slice(-2), msg])
      }

      addProgress("正在获取帖子信息... / Fetching topic info...")

      // const topicRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://talk.nervos.org/t/${topicId}.json`)}`)
      const topicRes = await fetch(`/api/proxy?url=${encodeURIComponent(`${domain}/t/${topicId}.json`)}`)
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

        // const postsRes = await fetch(
        //   `/api/proxy?url=${encodeURIComponent(`https://talk.nervos.org/t/${topicId}/posts.json?${postIdsParam}`)}`,
        // )

        const postsRes = await fetch(
          `/api/proxy?url=${encodeURIComponent(`${domain}/t/${topicId}/posts.json?${postIdsParam}`)}`,
        )
        if (!postsRes.ok) {
          console.error(`[v0] Failed to fetch chunk: ${postsRes.status}`)
          throw new Error(`Failed to fetch posts chunk: ${postsRes.status}`)
        }
        const postsData = await postsRes.json()
        console.log(`[v0] Received ${postsData.post_stream.posts.length} posts in this chunk`)
        allPosts.push(...postsData.post_stream.posts)
        await new Promise((resolve) => setTimeout(resolve, 200))
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
            // const likesRes = await fetch(
            //   `/api/proxy?url=${encodeURIComponent(`https://talk.nervos.org/post_action_users.json?id=${post.id}&post_action_type_id=2`)}`,
            // )
            const likesRes = await fetch(
              `/api/proxy?url=${encodeURIComponent(`${domain}/post_action_users.json?id=${post.id}&post_action_type_id=2`)}`,
            )
            if (likesRes.ok) {
              const likesData = await likesRes.json()
              post.liked_by = likesData.post_action_users?.map((u) => u.username) || []
            }
          } catch (err) {
            console.error(`Failed to fetch likes for post ${post.id}:`, err)
          }
          await new Promise((resolve) => setTimeout(resolve, 50))
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

  const handleDownloadJson = () => {
    if (!data) return

    const dateStr = new Date().toISOString().split("T")[0]
    const topicId = url.match(/\/t\/[^/]+\/(\d+)/)?.[1] || "unknown"
    const fileName = `nervos-talk-analysis-${topicId}-${dateStr}.json`

    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })

    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const verifyApiKey = async () => {
    if (!apiKey) return
    setVerifying(true)
    setError(null)
    setAvailableModels([])

    try {
      // Gemini list
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)

      if (!response.ok)
        throw new Error("API Key 无效或无法访问 Google 服务 / The API key is invalid or cannot access Google services.")

      const data = await response.json()

      const models = data.models
        .filter((m: any) => m.supportedGenerationMethods.includes("generateContent") && m.name.includes("gemini"))
        .map((m: any) => ({
          name: m.name.replace("models/", ""),
          displayName: m.displayName,
        }))
        .sort((a, b) => b.name.localeCompare(a.name))

      if (models.length === 0) {
        setAvailableModels([
          { name: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
          { name: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
        ])
      } else {
        setAvailableModels(models)
      }

      setIsKeyVerified(true)
      if (models.length > 0) setSelectedModel(models[0].name)

      localStorage.setItem("gemini_api_key", apiKey) // local API Key
    } catch (err) {
      setError(err instanceof Error ? err.message : "API Key 验证失败 / API Key verification failed.")
      setIsKeyVerified(false)
    } finally {
      setVerifying(false)
    }
  }

  // V1 prompts
  //   const runAiAnalysis = async () => {
  //     if (!apiKey || !data) return

  //     setAiLoading(true)
  //     setAiAnalysis("")

  //     const postsSummary = data.posts.slice(0, 40).map((p) => ({
  //       floor: p.floor,
  //       author: p.author,
  //       tags: p.author_tags,
  //       content: p.content.slice(0, 400),
  //       likes: p.likes,
  //       liked_by: p.liked_by.slice(0, 8),
  //     }))

  //     const prompt = `You are an expert forum discussion analyst. Analyze this Nervos blockchain community discussion.

  // **Topic**: ${data.topic}
  // **URL**: ${data.url}

  // **Discussion Data**:
  // ${JSON.stringify(postsSummary, null, 2)}

  // IMPORTANT: You MUST provide your analysis in STRICT bilingual format. For EACH section, write the English version FIRST, then immediately follow with the Chinese translation.

  // Format example:
  // ## 1. Core Controversy Summary
  // [English analysis here]

  // 核心争议总结
  // [Chinese translation here]

  // ---

  // Please analyze in this exact format:

  // ## 1. Core Controversy Summary
  // [Your English analysis]

  // 核心争议总结
  // [Your Chinese translation]

  // ---

  // ## 2. Pro Arguments
  // [Your English analysis]

  // 支持方观点
  // [Your Chinese translation]

  // ---

  // ## 3. Con Arguments
  // [Your English analysis]

  // 反对方观点
  // [Your Chinese translation]

  // ---

  // ## 4. Camp Analysis (Based on liked_by data)
  // [Your English analysis]

  // 阵营分析（基于点赞数据）
  // [Your Chinese translation]

  // ---

  // ## 5. Key Stakeholder Positions (Admins/Mods)
  // [Your English analysis]

  // 核心利益方立场（管理员/版主）
  // [Your Chinese translation]

  // ---

  // ## 6. Discussion Health Assessment
  // [Your English analysis]

  // 讨论健康度评估
  // [Your Chinese translation]`

  //     try {
  //       const response = await fetch(
  //         `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
  //         {
  //           method: "POST",
  //           headers: { "Content-Type": "application/json" },
  //           body: JSON.stringify({
  //             contents: [{ parts: [{ text: prompt }] }],
  //           }),
  //         },
  //       )

  //       if (!response.ok) {
  //         const errorText = await response.text()
  //         throw new Error(`API Error ${response.status}: ${errorText}`)
  //       }

  //       const result = await response.json()
  //       const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response"
  //       setAiAnalysis(text)
  //     } catch (err) {
  //       setAiAnalysis(`Error: ${err.message}`)
  //     } finally {
  //       setAiLoading(false)
  //     }
  //   }

  const runAiAnalysis = async () => {
    if (!apiKey || !data) return

    setAiLoading(true)
    setAiAnalysis("")

    const postsSummary = data.posts.slice(0, 1000).map((p) => ({
      floor: p.floor,
      author: p.author,
      date: p.created_at,
      is_admin_mod: p.author_tags.some((t) => ["Admin", "Mod"].includes(t)),
      content: p.content.slice(0, 50000), // Content Length
      likes: p.likes,
      liked_by: p.liked_by || [],
    }))

    const prompt = `You are an expert data analyst specializing in blockchain community governance. Analyze the provided JSON discussion data.

**Context**:
- Topic: ${data.topic}
- URL: ${data.url}
- Total Posts Loaded: ${data.posts.length}

**Data to Analyze**:
${JSON.stringify(postsSummary, null, 2)}

**Critical Instructions (STRICTLY FOLLOW)**:
1. **NO HALLUCINATIONS**: Only use facts explicitly stated in the JSON data. Do not invent dates, events, or external project histories (e.g., if the text doesn't mention a 3-year history, do not say it).
2. **CITATION STYLE**: When quoting a user or referencing a specific argument, **YOU MUST** append the floor number in parentheses, e.g., *"UserA argued that... (Floor 12)"*.
3. **TIMELINE ACCURACY**: Use the 'date' field in the JSON to determine the actual duration of the discussion.
4. **BILINGUAL**: Provide the analysis in English first, followed immediately by Chinese.

**5. WEIGHTING & QUALITY METRICS (CORE LOGIC)**:
- **Argument Quality > Identity**: Do NOT judge based on user Trust Level or Title. An LV0 user with data is worth more than an Admin with just an opinion.
- **High-Value Signals**: Give higher visibility to posts that contain:
  * **On-chain Data**: Citing transaction hashes, address activity, or hashrate charts.
  * **Historical Context**: Referencing past proposals (e.g., "See RFC-0023").
  * **Verifiable Risks**: Pointing out specific code flaws or economic attack vectors.
  * **Logical Completeness**: Structuring arguments with clear premises and conclusions.
- **Low-Value Signals**: Downweight emotional vents, blind agreement ("LFG", "Agree"), or ad hominem attacks.

**6. IDENTITY BLINDNESS**: 
- **Do NOT** refer to users by their titles (e.g., "Admin UserX") in the argument analysis. Treat them simply as "UserX".
- **Independent Voices**: Specifically look for and highlight logical, independent opinions from non-core team members (non-proposal team, non-Admins/Mods)..


**OUTPUT FORMAT REQUIREMENT (CRITICAL)**:
You must output TWO parts separated by a specific delimiter "|||JSON_DATA|||".

**PART 1: The Markdown Report**
**Analysis Format**:

## 1. Proposal Facts & Executive Summary / 提案事实与核心摘要
**Proposal Facts** (If this is a proposal/grant request, extract these details. If not, mark N/A):
* **Requested Amount**: [e.g., $50,000 / 2M CKB]
* **Team/Author**: [Who is building this?]
* **Est. Timeline**: [e.g., Q3 2025]

**Executive Summary**:
[Summarize the discussion timeline, the main conflict, and the conclusion/outcome. Be concise.]
[Chinese Translation]

---

## 2. Main Controversies / 主要争议点
[List specific technical or governance disagreements found in the text.Don't just list them; explain the logic clash (e.g., "Ideological conflict: Web5 vs. Traditional Bridges").]
[Chinese Translation]

---

## 3. Key Arguments & Camps / 核心观点与阵营
[Identify the Pro/Con sides. **Prioritize users who provided Evidence/Data (as defined in instruction #5)**. If a fresh/low-LV user made a great point, Highlight them.**Cite Floor Numbers**.]
[Chinese Translation]

---

## 4. Unresolved Questions & Risks / 待澄清问题与风险
[What questions asked by the community remain unanswered by the team? What are the biggest risks identified? **Cite Floor Numbers**.]
[Chinese Translation]

---

## 5. Discussion Atmosphere & Health / 讨论氛围与健康度
[Analyze if the discussion is constructive or toxic. Only mention Admins/Mods if they actively intervened (e.g., warnings, closures) to maintain order; otherwise, do not mention their presence.]
[Chinese Translation]

**PART 2: User Personas (JSON)**
After the report, output the delimiter "|||JSON_DATA|||", followed strictly by a JSON object mapping usernames to a **single sentence summary (under 20 words)** of their stance or persona in this specific discussion. Use English.
**CRITICAL**: The summary must focus on their **ARGUMENT** (e.g., "Cites on-chain data to oppose...") or **BEHAVIOR**, strictly excluding their role/title (e.g., do NOT say "An admin who...").
Format:
{
  "username1": "Strongly supports the proposal citing liquidity needs.",
  "username2": "Skeptical about the budget and questions the team's history.",
  "sonami": "Proposal author, defending the technical architecture."
}
`

    try {
      // selectedModel
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
            },
          }),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response" // obtain content

      // 1.Split content
      const parts = rawText.split("|||JSON_DATA|||")

      // 2. the first part is Markdown report，to aiAnalysis
      setAiAnalysis(parts[0].trim())

      // 3. if part 2
      if (parts.length > 1) {
        try {
          // data clean
          const jsonStr = parts[1]
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim()

          // to state
          const summaries = JSON.parse(jsonStr)
          setUserSummaries(summaries)
        } catch (e) {
          console.error("Failed to parse user summaries JSON", e)
          // if error
        }
      }
    } catch (err) {
      setAiAnalysis(`Error: ${err instanceof Error ? err.message : String(err)}`)
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
        <div className="flex justify-center mb-6">
          <Image
            src="/images/nervos-token-assets-black-20background.png"
            alt="Nervos"
            width={200}
            height={200}
            className="h-10 w-auto"
          />
        </div>

        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Nervos Intel Analyzer
          </h1>
          <p className="text-slate-300 text-lg">Community Discussion Intelligence Analysis / 社区讨论情报分析</p>
        </header>

        {showInstructions && (
          <Card className="mb-8 bg-gradient-to-br from-slate-900/95 to-slate-950/95 border-slate-700/50 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="border-b border-slate-800/50 pb-4">
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center gap-2 text-white text-xl">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Info className="w-5 h-2 text-blue-400" />
                  </div>
                  <span>使用说明 / How to Use</span>
                </CardTitle>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              
              {/* Step 1: Input */}
              <div className="grid grid-cols-[auto_1fr] gap-4">
                <div className="flex flex-col items-center">
                   <div className="w-8 h-8 rounded-full bg-blue-900/30 text-blue-400 flex items-center justify-center font-bold border border-blue-500/30">1</div>
                   <div className="w-0.5 h-full bg-slate-800 mt-2"></div>
                </div>
                <div className="pb-2">
                   <h3 className="text-white font-medium text-lg">输入论坛链接 / Enter URL</h3>
                   <p className="text-slate-400 text-sm mt-1">
                     粘贴 Nervos Talk 帖子链接 (Paste link): <br/>
                     <code className="bg-slate-950 px-2 py-0.5 rounded text-blue-300 font-mono text-xs select-all">https://talk.nervos.org/t/topic/12345</code>
                   </p>
                </div>
              </div>

              {/* Step 2: Analyze */}
              <div className="grid grid-cols-[auto_1fr] gap-4">
                <div className="flex flex-col items-center">
                   <div className="w-8 h-8 rounded-full bg-blue-900/30 text-blue-400 flex items-center justify-center font-bold border border-blue-500/30">2</div>
                   <div className="w-0.5 h-full bg-slate-800 mt-2"></div>
                </div>
                <div className="pb-2">
                   <h3 className="text-white font-medium text-lg">获取数据 / Fetch Data</h3>
                   <p className="text-slate-400 text-sm mt-1">
                     Click <strong className="text-blue-400">Analyze</strong>，for all floors data。
                   </p>
                   <div className="flex items-start gap-2 mt-2 bg-yellow-900/10 border border-yellow-700/30 p-2 rounded text-xs text-yellow-200/80">
                      <span className="text-yellow-500 text-base">⚠️</span>
                      <span>
                        点赞数据获取较慢（防限流）。<br/>
                        Fetching likes is slow to avoid rate limits.
                      </span>
                   </div>
                </div>
              </div>

              {/* Step 3: AI Analysis */}
              <div className="grid grid-cols-[auto_1fr] gap-4">
                <div className="flex flex-col items-center">
                   <div className="w-8 h-8 rounded-full bg-purple-900/30 text-purple-400 flex items-center justify-center font-bold border border-purple-500/30">3</div>
                   <div className="w-0.5 h-full bg-slate-800 mt-2"></div>
                </div>
                <div className="pb-2">
                   <h3 className="text-white font-medium text-lg flex items-center gap-2">
                     AI 深度分析 / AI Analysis 
                     <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">Core</span>
                   </h3>
                   <p className="text-slate-400 text-sm mt-1">
                     Input <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-400 hover:underline">Gemini API Key</a>.
                   </p>
                   <ul className="list-disc list-inside ml-2 mt-2 space-y-1 text-slate-300 text-sm">
                      <li><strong className="text-purple-300">Click-to-Verify:</strong> Citation <code className="text-xs bg-slate-800 px-1 rounded">(Floor X)</code>.</li>
                      <li><strong className="text-purple-300">Identity Blindness:</strong> AI based on evidence，ignore title。</li>
                   </ul>
                </div>
              </div>

              {/* Step 4: Visualization (Updated) */}
              <div className="grid grid-cols-[auto_1fr] gap-4">
                <div className="flex flex-col items-center">
                   <div className="w-8 h-8 rounded-full bg-green-900/30 text-green-400 flex items-center justify-center font-bold border border-green-500/30">4</div>
                </div>
                <div>
                   <h3 className="text-white font-medium text-lg">交互式图谱 / Interactive Graph</h3>
                   <div className="mt-2 space-y-3 bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                      
                      {/* AI Persona Feature */}
                      <div>
                        <p className="text-white text-sm font-bold flex items-center gap-2">
                           🤖 AI Persona / AI 画像
                           <span className="text-[10px] bg-blue-500 text-white px-1.5 rounded">NEW</span>
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                           Hover over any node to see an AI-generated summary of their stance.<br/>
                           <span className="text-slate-500">鼠标悬停在节点上，即可查看 AI 对该用户立场的“一句话总结”。</span>
                        </p>
                      </div>

                      <div className="w-full h-px bg-slate-700/50"></div>

                      {/* View Modes */}
                      <div>
                        <p className="text-white text-sm font-bold">👁️ View Modes / 视角模式</p>
                        <ul className="mt-1 space-y-1.5">
                           <li className="text-xs text-slate-300 flex items-start gap-2">
                              <span className="bg-blue-500/20 text-blue-300 px-1 rounded border border-blue-500/30 whitespace-nowrap">Default</span>
                              <span>
                                 <strong>Equal Mode (平权模式):</strong> Nodes are blue. Size = Activity. No hierarchy colors.<br/>
                                 <span className="text-slate-500">全员蓝色，大小代表活跃度，隐藏身份以避免光环效应。</span>
                              </span>
                           </li>

                           <li className="text-xs text-slate-300 flex items-start gap-2">
                              <span className="bg-purple-500/20 text-purple-300 px-1 rounded border border-purple-500/30 whitespace-nowrap mt-0.5">Toggle</span>
                              <div className="flex-1 space-y-2">
                                {/* 1. 身份图例 (根据新逻辑更新颜色) */}
                                <div>
                                  <strong className="text-white">Reveal Roles (揭示身份):</strong>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-slate-300 font-mono text-[11px]">
                                    <span className="flex items-center gap-1.5" title="Administrator">
                                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Admin
                                    </span>
                                    <span className="flex items-center gap-1.5" title="Moderator">
                                      <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Mod
                                    </span>
                                    <span className="flex items-center gap-1.5" title="Trust Level 3+">
                                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> LV3+
                                    </span>
                                    <span className="flex items-center gap-1.5" title="Trust Level 2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> LV2
                                    </span>
                                    <span className="flex items-center gap-1.5" title="Trust Level 1">
                                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> LV1
                                    </span>
                                    <span className="flex items-center gap-1.5" title="Trust Level 0 / Visitor">
                                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span> LV0
                                    </span>
                                  </div>
                                </div>

                                {/* 2. 信任等级说明 (叠甲部分) */}
                                <div className="text-xs text-blue-200/90 bg-blue-950/40 rounded p-2 border border-blue-500/20 flex flex-col gap-1.5">
                                    <div className="flex items-start gap-2">
                                        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
                                        <div className="leading-relaxed">
                                            <p>Normally, Trust Levels (LV) are assigned automatically based on engagement.</p>
                                            <p className="text-blue-300/70 mt-0.5">通常情况下，信任等级 (LV) 会根据互动情况自动分配。</p>
                                        </div>
                                    </div>
                                    <a 
                                      href="https://blog.discourse.org/2018/06/understanding-discourse-trust-levels/" 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-white transition-colors underline flex items-center gap-1 ml-5 self-start"
                                    >
                                      Learn more <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                              </div>
                            </li>  


                        </ul>
                      </div>

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

            <div className="flex gap-3">
              <button
                onClick={handleAnalyze}
                disabled={loading || !url}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg font-medium transition-colors text-white flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    分析中... Analyzing...
                  </>
                ) : (
                  "分析 Analyze"
                )}
              </button>

              {/* 仅当有数据时显示下载按钮 */}
              {data && (
                <button
                  onClick={handleDownloadJson}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-green-400 border border-slate-600 hover:border-green-500/50 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg"
                  title="Download Raw JSON Data"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">JSON</span>
                </button>
              )}
            </div>
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
                  AI Analysis / AI 分析 ⚠️ AI may make mistakes / AI 可能会出错 ⚠️
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="block text-sm text-white">
                    Google Gemini API Key （输入后，点击Verify获取模型列表 After entering the API Key, click Verify to
                    get the model list.）
                  </label>

                  {/* API Key input window + buttons */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="password"
                        placeholder="Enter your Gemini API key..."
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value)
                          setIsKeyVerified(false)
                          setAvailableModels([])
                        }}
                        className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 w-full pr-8"
                      />

                      {apiKey && (
                        <button
                          onClick={handleClearKey}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 transition-colors"
                          title="Clear saved key / 清除保存的 Key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={verifyApiKey}
                      disabled={!apiKey || verifying}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        isKeyVerified
                          ? "bg-green-600/20 text-green-400 border border-green-600/50 cursor-default"
                          : "bg-slate-700 hover:bg-slate-600 text-white"
                      }`}
                    >
                      {verifying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isKeyVerified ? (
                        <>
                          Verified <Sparkles className="w-3 h-3" />
                        </>
                      ) : (
                        "Verify / 验证"
                      )}
                    </button>
                  </div>

                  {/* 模型选择下拉框 (仅在验证通过后显示) */}
                  {isKeyVerified && availableModels.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                      <label className="block text-xs text-slate-400 mb-1.5">Select AI Model / 选择模型版本</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all hover:border-slate-500"
                      >
                        {availableModels.map((model) => (
                          <option key={model.name} value={model.name} className="bg-slate-800 text-slate-200">
                            {model.displayName} ({model.name})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                        <Info className="w-3 h-3" />
                        <span>
                          如使用Pro模型，API需已开通支付功能，且可能带来费用 / If using the Pro model, the API must be
                          enabled for payment, and there may be associated cost.
                        </span>
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-1">
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
                  // 只有当 Loading 或 Key 未验证时禁用
                  disabled={aiLoading || !isKeyVerified}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-bold transition-all text-white shadow-lg shadow-purple-900/20 mt-2"
                >
                  {aiLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      正在深入分析... / Analyzing Deeply...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      运行 AI 争议分析 / Run AI Controversy Analysis
                    </span>
                  )}
                </button>

                {aiAnalysis && (
                  <div className="mt-4 p-6 bg-slate-900/90 border border-slate-700 rounded-xl shadow-inner shadow-black/50 animate-in fade-in zoom-in-95">
                    {/* Text Render*/}
                    <MarkdownRenderer content={aiAnalysis} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mb-8 bg-slate-800/70 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                {/* 标题部分 */}
                <CardTitle className="flex items-center gap-2 text-white text-xl">
                  <Network className="w-5 h-5 text-blue-400" />
                  Network / 关系网络
                </CardTitle>

                {/* 👇👇👇 新增：视角切换开关 (Mode Switch) 👇👇👇 */}
                <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/50">
                  <span className="text-xs text-slate-400 font-medium px-1">
                    Mode:
                  </span>
                  <button
                    onClick={() => setShowAdminRoles(false)}
                    className={`px-3 py-1 text-xs rounded-md transition-all font-medium ${
                      !showAdminRoles 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    Equal / 平权
                  </button>
                  <button
                    onClick={() => setShowAdminRoles(true)}
                    className={`px-3 py-1 text-xs rounded-md transition-all font-medium ${
                      showAdminRoles 
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    Reveal Roles / 揭示身份
                  </button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="mb-4 text-sm text-slate-400 flex items-center gap-2 bg-slate-900/30 p-2 rounded border border-slate-700/30">
                  <span className="text-blue-400">💡</span> 
                  <span>
                    Drag nodes to move, scroll to zoom. Hover to see AI Personas (If AI analysis applied). <br/>
                    拖拽节点移动，滚轮缩放。悬停查看 AI 画像 （如果使用了AI分析）。
                  </span>
                </div>

                {/* 👇👇👇 Dynamic Legend 👇👇👇 */}
                <div className="flex flex-wrap gap-4 text-xs mb-4 text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                   <div className="flex items-center gap-2 mr-4 border-r border-slate-700 pr-4">
                      <span className="font-bold text-slate-400">Size/大小:</span>
                      <span>Posts + Likes (Influence/影响力)</span>
                   </div>

                   {/* equal model */}
                   {!showAdminRoles && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#60a5fa] border border-slate-600"></span> 
                        <span>Community Member / 社区成员</span>
                      </span>
                   )}

                   {/* Role model */}
                   {showAdminRoles && (
                    <>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500 border border-slate-600 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> 
                        <span className="font-medium text-red-200">Admin</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-green-500 border border-slate-600 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span> 
                        <span className="font-medium text-green-200">Mod</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-yellow-400 border border-slate-600 shadow-[0_0_8px_rgba(250,204,21,0.5)]"></span> 
                        <span className="font-medium text-yellow-200">LV3+</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span> 
                        <span className="text-blue-200">LV2</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-slate-400"></span> 
                        <span className="text-slate-300">LV1</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-slate-600"></span> 
                        <span className="text-slate-500">LV0</span>
                      </span>
                    </>
                   )}
                </div>

                {showAdminRoles && (
                     <div className="text-sm text-blue-200 flex items-center gap-1 pt-1 border-t border-slate-800/50 mt-1">
                        <Info className="w-3 h-3" />
                        <span>Normally, Trust Levels (LV) are assigned automatically based on engagement. / 通常情况下，信任等级 (LV) 会根据互动情况自动分配。</span>
                        <a 
                          href="https://blog.discourse.org/2018/06/understanding-discourse-trust-levels/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline flex items-center gap-0.5 ml-1"
                        >
                          Learn more <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                     </div>
                   )}

                <NetworkGraph 
                    data={data} 
                    userSummaries={userSummaries} 
                    showAdminRoles={showAdminRoles} 
                />
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

      <footer className="mt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-6 text-slate-400">
            <span className="text-sm">Built with ❤️ for the Nervos CKB Community.</span>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/kydchen/v0-nervos-talk-analysis"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/c_hongzhou"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                aria-label="Twitter/X"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
