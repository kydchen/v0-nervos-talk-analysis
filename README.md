# 🧠 Nervos Intel Analyzer

> **A Computational Social Science Experiment in DAO Governance.**
>
> Transforming raw discussion data into structured insights, visual topologies, and verifiable facts.

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Stack](https://img.shields.io/badge/tech-Next.js%20%7C%20D3.js%20%7C%20Gemini%20AI-purple)

## 📖 Overview / 简介

**Nervos Intel Analyzer** is an AI-powered governance auxiliary tool designed for the Nervos CKB community. It tackles the challenge of "Information Overload" in DAO governance by parsing long forum threads into high-fidelity summaries and interactive social graphs.

This tool is **NOT** a decision-maker; it is an **"Intelligence Staff Officer" (情报参谋)**. It helps community members verify facts, visualize influence structures, and lower the cognitive barrier to entry.

## ✨ Key Features / 核心功能

### 🤖 1. Bias-Resistant AI Analysis (抗偏见 AI 分析)
* **Cognitive Decoupling**: The AI engine is engineered with **"Identity Blindness"**. It evaluates arguments strictly based on logic and evidence (e.g., on-chain data, historical RFCs), explicitly ignoring user titles (Admin/Mod) during the analysis phase.
* **Role Scoping**: Administrative titles are only mentioned if specific moderation actions (e.g., thread locking) occurred.
* **Click-to-Verify**: Every AI claim is anchored with a smart citation `(Floor X)`. Click to jump directly to the original post. **"Don't Trust, Verify."**

### 🕸️ 2. Social Graph 2.0 (交互式社交图谱)
* **AI Personas (God Mode)**: Hover over any node to see an **AI-generated Persona Card**. It summarizes that user's stance in one sentence (e.g., *"Skeptical about budget due to lack of technical details"*).
* **Equal Mode (Default)**: Visualizes the community under a "Veil of Ignorance". All nodes are unified in blue; size reflects activity only. This nudges observers to judge influence by engagement, not status.
* **Reveal Roles Toggle**: Optional mode to overlay administrative hierarchy (🔴 Admin, 🟢 Mod) for power structure auditing.
* **Spotlight Interaction**: Hovering dims noise and highlights the user's **"Influence Network"** (incoming likes) in gold.

### 📊 3. Deep Integration
* **Timeline Analysis**: Temporal distribution of posts and sentiments.
* **Raw Data Access**: Full access to the raw post list with role labels for manual verification.

### 📰 4. Real-time Topic Tracking (实时话题追踪)
* **Latest Topics Feed**: Automatically fetches and displays the top 10 active discussions from Nervos Talk (excluding pinned posts).
* **One-Click Analysis**: Instantly auto-fill and start analyzing any topic by clicking its title.

## 🔌 5. For AI Agents (API Integration)

The analyzer doubles as a micro-tool for autonomous AI agents (OpenClaw, Claude MCP, ChatGPT Actions). 

Instead of letting LLMs struggle with raw Discourse HTML/JSON (which wastes context windows and induces hallucinations), agents can call our optimized endpoint:

**Endpoint:** `GET /api/agent?url=<DISCOURSE_TOPIC_URL>`

### Why use this API?
1. **Cognitive Noise Reduction**: Strips 90% of UI metadata and HTML tags, returning a highly compressed, token-efficient JSON array of pure discussion text.
2. **Built-in Governance Mindset**: The API response includes a `recommended_prompt`. By feeding this directly to the LLM, you instantly align the agent with rigorous governance frameworks (Identity Blindness, Evidence > Authority, Floor Citations).

### OpenClaw Skill Integration
If you use OpenClaw or similar agentic frameworks, you can inject this tool using the provided Skill file:
[View OpenClaw Skill Config](link_to_a_gist_or_file_in_repo)

## 🛠️ Design Philosophy / 设计哲学

This tool implements concepts from **Behavioral Economics** and **Political Philosophy** to foster rational deliberation:

1.  **Nudging (Thaler & Sunstein)**: By defaulting the graph to "Equal Mode", we nudge users away from the "Halo Effect" of high-level titles.
2.  **Information Hierarchy**: 
    * *Layer 1 (Synthesis)*: AI Report (Logic & Arguments)
    * *Layer 2 (Perception)*: Social Graph (Topology & Influence)
    * *Layer 3 (Verification)*: Raw Post List (Context & Reputation)
3.  **Human-in-the-Loop**: AI is used to quantify qualitative metrics (like "Inclusion"), but the human user always retains final judgment.

## 🚀 Getting Started

### Prerequisites
* Node.js 18+
* A Google Gemini API Key ([Get one here](https://aistudio.google.com/apikey))

### Installation

1.  **Clone the repository**
    \`\`\`bash
    git clone [https://github.com/your-username/nervos-intel-analyzer.git](https://github.com/your-username/nervos-intel-analyzer.git)
    cd nervos-intel-analyzer
    \`\`\`

2.  **Install dependencies**
    \`\`\`bash
    npm install
    # or
    yarn install
    \`\`\`

3.  **Run the development server**
    \`\`\`bash
    npm run dev
    \`\`\`

4.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🤝 Contribution

Contributions are welcome! We are especially interested in:
* **Reputation Algorithms**: Exploring decentralized reputation metrics (Social Capital dimensions).
* **LLM Prompts**: Refining the "Identity Blindness" instructions.
* **Visualizations**: New D3.js views for governance data.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

> Built with ❤️ for the CKB Community.
