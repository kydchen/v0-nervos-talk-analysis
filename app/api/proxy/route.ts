import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const targetUrl = searchParams.get("url")

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[v0] API Error ${response.status}:`, errorBody)
      return NextResponse.json({ error: `API Error: ${response.status}`, body: errorBody }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Proxy fetch error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fetch failed" }, { status: 500 })
  }
}
