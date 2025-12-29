# 🧠 Nervos Intel Analyzer / Nervos 社区情报分析器

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Tech](https://img.shields.io/badge/tech-Next.js%20%7C%20D3.js%20%7C%20Gemini-purple)
![License](https://img.shields.io/badge/license-MIT-green)

A professional governance intelligence tool designed for the Nervos CKB community. It visualizes discussion threads, maps social influence networks, and uses Google Gemini AI to generate objective, deep-dive summaries of governance proposals.

专为 Nervos CKB 社区设计的治理情报分析工具。它通过可视化手段展示讨论热度与时间线，绘制用户社交影响力图谱，并利用 Google Gemini AI 生成客观、深度的治理提案分析报告。

---

## ✨ Key Features / 核心功能

* **🕷️ Data Crawler / 数据抓取**: Automatically fetches all posts, likes, and user metadata from any Nervos Talk topic URL.
* **🕸️ Social Graph / 社交图谱**: Interactive D3.js visualization showing community interactions (Likes) and user influence weights.
* **🤖 AI Deep Analysis / AI 深度分析**:
    * **Dynamic Model Selection**: Support for Gemini models.
    * **Objective Summary**: Anti-hallucination protocols and neutrality enforcement.
    * **Controversy Mining**: Deep dive into core conflicts and unresolved questions.
* **📊 Timeline & Stats / 数据统计**: Interactive charts for engagement over time and role distribution (Admin/Mod/User).
* **💾 Open Data / 开放数据**: One-click export of the full raw dataset to JSON.

---

## 🏗️ Project Structure / 项目结构

The project is built with **Next.js 14** (App Router) and **React**.

```bash
.
├── app/
│   ├── api/proxy/route.ts       # 核心后端代理 (Core Proxy for CORS bypass)
│   ├── page.tsx                 # 主入口 (Main Entry)
│   └── layout.tsx               # 全局布局 (Global Layout)
├── components/
│   ├── nervos-intel-analyzer.tsx # 核心应用逻辑 (The Brain: UI, State, Logic)
│   └── ui/                      # Shadcn UI 组件库 (UI Components)
└── public/                      # 静态资源 (Static Assets)

```

---

## 🔧 Technical Implementation / 技术实现细节

### 1. Data Fetching Strategy (Crawler) / 爬虫实现逻辑

**File**: `app/api/proxy/route.ts` & `components/nervos-intel-analyzer.tsx`

The browser cannot fetch data directly from `talk.nervos.org` due to **CORS (Cross-Origin Resource Sharing)** restrictions. We implemented a **Server-Side Proxy**:

1. **Proxy Route**: The frontend sends the target URL to `/api/proxy?url=...`.
2. **Server-Side Fetch**: The Next.js server (Node.js environment) fetches the data from Nervos Talk (bypassing CORS).
3. **Pagination Handling**:
* First, we fetch the Topic JSON to get the `stream` (list of all post IDs).
* We slice the IDs into chunks (e.g., 20 posts per chunk) and fetch them in parallel/series to reconstruct the full discussion.


4. **Rate Limiting Protection**: We implemented strictly timed delays (e.g., 50-100ms) between requests to prevent triggering `429 Too Many Requests` errors from the forum server.

### 2. Social Graph Visualization / 社交图谱实现

**File**: `components/nervos-intel-analyzer.tsx` (Component: `NetworkGraph`)

We use **D3.js** to render a Force-Directed Graph:

* **Nodes (Users)**:
* **Size**: Calculated dynamically based on `BaseSize + (Posts * 2) + ReceivedLikes`. This visually represents "Activity Weight".
* **Color**: Determined by role priority (Admin > Mod > Trust Level > User).


* **Links (Relationships)**:
* Represent a "Like" action. Direction is **Liker -> Liked Author**.


* **Simulation**: Uses `d3.forceSimulation` with collision detection to prevent overlap and charge forces to spread the graph naturally.

### 3. AI Analysis & Prompt Engineering / AI 分析与提示词工程

**File**: `components/nervos-intel-analyzer.tsx` (Function: `runAiAnalysis`)

We use **Google Gemini API**. The core value lies in our "Governance-First" Prompt Engineering design:

#### 🧠 Prompt Logic (提示词逻辑):

We explicitly **reject** sentiment scoring to avoid biasing the user. Instead, we focus on:

1. **Anti-Hallucination (防幻觉)**: Strict instruction: *"Only use facts explicitly stated in the JSON data."*
2. **Weighted Opinions (权重判断)**: *"Prioritize users with high engagement (likes). Do NOT list a user as a representative of a major camp if they only posted one short sentence."* This prevents noise from drowning out signal.
3. **Conflict Mining (争议挖掘)**: Instead of just listing pros/cons, we ask the AI to identify the underlying **Logical Clashes** (e.g., "Ideological conflict: Web5 vs. Traditional Bridges").
4. **Unresolved Risks (待澄清风险)**: Specifically asking for questions that the team failed to answer.

**Sample Prompt Snippet:**

```text
Critical Instructions (STRICTLY FOLLOW):
1. NO HALLUCINATIONS: Do not invent dates or events.
2. WEIGHTING: Prioritize users with high engagement.
3. BILINGUAL: English first, then Chinese.
...
## 4. Unresolved Questions & Risks
[What questions asked by the community remain unanswered?]

```

---

## 🚀 Getting Started / 快速开始

### Prerequisites

* Node.js 18+
* A Google Gemini API Key ([Get it here](https://aistudio.google.com/apikey))

### Installation

1. **Clone the repo**
```bash
git clone [https://github.com/your-username/v0-nervos-talk-analysis.git](https://github.com/your-username/v0-nervos-talk-analysis.git)
cd v0-nervos-talk-analysis

```


2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install

```


3. **Run Development Server**
```bash
npm run dev

```


4. **Open Browser**
Visit `http://localhost:3000`

---

## 🤝 Contribution / 贡献

We welcome contributions! Specifically in:

* Improving the D3.js visualization algorithms.
* Refining AI Prompts for different types of governance proposals (Budget vs. Technical).
* Adding support for more forum platforms (Like, TG or Discourse-based).

## 📄 License

This project is licensed under the MIT License.

---

*Built with ❤️ for the Nervos CKB Community.*

```

```
