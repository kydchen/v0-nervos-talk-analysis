---
name: nervos-talk-analyzer
description: Professional analyzer for Nervos Talk (Discourse) governance discussions. Converts forum URLs into structured governance datasets with insights.
metadata:
  {
    "openclaw": {
      "category": "research",
      "user-invocable": true
    }
  }
---

# Nervos Talk Analyzer Skill

Use this skill to transform raw Discourse discussions from `talk.nervos.org` into structured, audit-ready governance reports. It bypasses HTML noise and applies high-rigor analytical frameworks.

## Core API Endpoint
**Base URL:** `https://v0-nervos-talk-analysis.vercel.app/api/agent`
**Method:** `GET`
**Parameter:** `url` (The full URL of the Nervos Talk topic)

## Usage for Agents
When a user provides a link to `talk.nervos.org`, follow this protocol:
1. **Fetch Data**: Call the API using the `web_fetch` or `curl` tool.
   Example: `https://v0-nervos-talk-analysis.vercel.app/api/agent?url=https://talk.nervos.org/t/topic-slug/1234`
2. **Parse Response**: The API returns a JSON object containing `metadata`, a `recommended_prompt`, and the cleaned `data` array.
3. **Execute Analysis**: Apply the `recommended_prompt` logic to the `data`.

## Analytical Constraints (Mandatory)
- **Strict Citations**: Every claim must include the floor number, e.g., "(Floor 12)".
- **Identity Blindness**: Treat all contributors as "UserX". Ignore titles like "Admin" or "Mod" to avoid the Halo Effect.
- **Value Weighting**: Prioritize posts containing on-chain data, verifiable risks, and logical completeness over mere opinions.
- **No Hallucinations**: Only synthesize facts explicitly present in the JSON payload.
