# Helix.cs — Enterprise Customer Health Engine

An AI-powered customer success platform that scores account health, surfaces churn risk, identifies expansion signals, and generates prescriptive next actions — built to demonstrate how I think about CS strategy, not just describe it.

**[Live Demo →](https://helix-cx.vercel.app)**

---

## What It Does

Select any account from a portfolio of enterprise companies. Hit **Analyze with AI** and the platform runs two sequential Claude calls against live account signals, producing a full health assessment in under 15 seconds.

**Call 1 — Loads fast (~3-5s):**
- 0–100 health score
- AI-written TL;DR specific to that account's situation
- Time-bound next best action with owner and timeline
- Three immediate action items
- Per-signal scores feeding the Score Breakdown

**Call 2 — Depth analysis (~3-5s after):**
- Risk flags ranked by severity
- Expansion signals ranked by strength
- QBR talking points
- Coach Mode — the exact words to open the next call with

The two-call split means the score and priority actions appear immediately while deeper analysis loads behind them.

---

## Architecture

```
Browser (React + Next.js)
    │
    ├── /api/accounts          ← Full portfolio CRUD
    ├── /api/accounts/[id]     ← Single account read/update/delete
    ├── /api/accounts/at-risk  ← MCP-ready: at-risk accounts + urgency scoring
    ├── /api/accounts/expansion← MCP-ready: expansion accounts + opportunity scoring
    ├── /api/analysis/[id]     ← Analysis cache read/write
    ├── /api/analyze           ← Vercel serverless → Anthropic API (2-call pipeline)
    └── /api/news              ← Vercel serverless → Serper + Anthropic API
    
Persistence: Supabase (PostgreSQL)
    ├── accounts               ← Full account data, all signals
    ├── account_analysis       ← Cached AI analysis, survives deploys
    └── account_news           ← Cached news summaries per account
```

All API keys are server-side only — never exposed to the browser.

---

## MCP Server

Helix exposes an [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that wraps the core API endpoints, making the platform callable by autonomous AI agents.

**Available MCP tools:**
- `get_all_accounts` — Full portfolio with health signals
- `get_at_risk_accounts` — At-risk accounts pre-scored by urgency
- `get_expansion_accounts` — Expansion candidates pre-scored by opportunity
- `get_account_analysis` — Cached AI analysis for any account

This is the architectural layer that separates Helix from a static dashboard. With MCP, a CSM can query their portfolio in natural language, or a scheduled agent can generate a daily brief — without touching the UI.

**Example agent use cases:**
- *"Which accounts need attention before end of quarter?"*
- *"Summarize renewal risk across my portfolio"*
- *"What's the expansion opportunity for accounts over 80% utilization?"*

---

## Signal Architecture

Seven weighted signals feed every health score:

| Signal | Weight | What It Measures |
|---|---|---|
| **Product Adoption** | 20% | Utilization % + 30-day trend |
| **Exec Sponsor** | 20% | Sponsor status + EBR attendance + exec accessibility |
| **Engagement Cadence** | 15% | Last touch days + QBR attendance pattern |
| **Expansion History** | 15% | Prior ARR expansion + active signals |
| **Champion** | 15% | Champion stability + stakeholder changes |
| **Renewal Outlook** | 10% | CSM probability assessment + competitive exposure |
| **External** | 5% | Live market signals via Serper |

Support metrics (tickets, CSAT) feed the AI analysis context but don't get a dedicated scoring card — they're lagging indicators, not leading ones.

---

## Score Breakdown

Every health score is fully transparent. Click **Score Breakdown** under the health ring to see:

- Per-signal 0–100 scores with notes, weights, and weighted contributions
- Color-coded progress bars (emerald / amber / rose)
- Weighted total showing the math from raw scores to final number
- Category assignment with Claude's written rationale explaining why the account landed where it did

---

## Renewal Outlook

Each account carries a dedicated Renewal Outlook panel showing four CSM-set fields:

- **Probability** — High Confidence / Needs Attention / At Risk
- **Competitive Exposure** — None detected / Rumored / Active eval
- **Contract Type** — Annual / Multi-year
- **Auto-Renew** — Yes / No — Manual

Renewal probability and competitive exposure feed directly into the category scoring formula and are passed as context into every AI analysis call — health scores and risk flags reflect the full commercial picture.

---

## Live News Integration

Each account has a live **External Signal** card powered by [Serper](https://serper.dev).

Hit the refresh icon and the platform:
1. Searches Google News for the company name + universal keywords (`layoffs OR earnings OR acquisition OR leadership OR restructuring OR funding OR partnership OR expansion`)
2. Pulls the top 3 articles from the last 30 days
3. Sends headlines to Claude for a 1-2 sentence synthesis focused on CS impact
4. Displays the summary with clickable source links and a freshness timestamp

The live summary automatically replaces the static external field in the next analysis run — health scores reason against what's actually happening today.

---

## Category Logic

Accounts are automatically categorized across three tiers based on weighted signal scoring:

**At Risk** — elevated churn signals across usage decline, support severity, engagement drop, champion instability, sponsor disengagement, or commercial risk (renewal probability + competitive exposure). Sub-prioritized P1–P3 by risk intensity weighted against ARR.

**Expansion Opp** — strong growth signals: high utilization, expansion ARR history, active signals, positive trend momentum. Sub-prioritized P1–P3 by expansion ARR and contract size.

**Stable** — tracking well across all dimensions. Sub-prioritized P1–P3 by ARR and utilization health.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Next.js + Tailwind CSS |
| AI Analysis | Claude Sonnet via Anthropic API |
| Live News | Serper API (Google Search) |
| Backend | Vercel Serverless Functions |
| Persistence | Supabase (PostgreSQL) |
| Agent Layer | MCP Server wrapping core API endpoints |
| Security | All API keys server-side only, never exposed to browser |

---

## Demo Features

**Protected by default** — all edit capabilities are hidden from demo visitors. Account data, signal cards, and renewal fields are read-only.

**Edit Mode** — unlocked via a password prompt (click the version number in the footer). Reveals account editing, adding new accounts, and JSON paste import.

**Stale analysis warning** — analyses older than 48 hours surface an amber warning prompting a refresh.

**Persistent state** — accounts and analyses are stored in Supabase and survive deploys, device switches, and page refreshes.

---

## Running Locally

```bash
git clone https://github.com/westineehn/helix-cx.git
cd helix-cx
npm install
```

Create a `.env` file:
```
ANTHROPIC_API_KEY=your_key_here
SERPER_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
npm run dev
```

- Anthropic API key: `console.anthropic.com`
- Serper API key: `serper.dev` (free tier: 2,500 queries/month)
- Supabase project: `supabase.com` (free tier is sufficient)

---

## Why I Built This

I manage enterprise portfolios with technical buyers — CTOs, VPs of Engineering — where the difference between renewing and churning often comes down to reading weak signals early and acting before the conversation gets hard.

Most health scoring tools give you a number. This one shows you the math behind it, tells you what to do about it, and tells you what to say when you pick up the phone — with live market context pulled the same day.

The MCP server is the next layer: moving from a tool a CSM consults to a platform that surfaces the right account at the right time without being asked.

It's also a live example of how I use AI in my CS workflow: not to replace judgment, but to compress the time between signal and action.

---

## About

Built by **Westin Eehn** — Senior Customer Success Manager with 6+ years managing enterprise SaaS portfolios. 95% GRR on $3.5M ARR. $800K+ in documented expansion.

[LinkedIn](https://linkedin.com/in/westineehn) · [GitHub](https://github.com/westineehn/helix-cx)
