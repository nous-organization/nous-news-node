<p align="center">
  <img src="https://github.com/shmaplex/nous-web/blob/main/public/logo-universal.png" alt="Nous Foundation Logo" width="150" />
</p>

# Nous News Node

**A decentralized, real-time news ingestion node built with Node.js, Helia (IPFS), and OrbitDB.**

Nous News Node fetches, normalizes, enriches, and distributes news articles from multiple sources. Each node can run independently or join a peer-to-peer network, replicating content across nodes in real-time.

---

## Features

- **News Fetching & Ingestion**

  - Pulls from RSS feeds, JSON APIs, HTML scraping, and GDELT CSV/JSON feeds.
  - Configurable intervals per source (e.g., every 15 minutes for GDELT).

- **Normalization & Analysis**

  - Converts raw news into a consistent schema (`ArticleSchema` / `ArticleAnalyzedSchema`).
  - AI-powered enrichment: sentiment, cognitive biases, clickbait, credibility, philosophical notes.
  - Deduplication and optional translation/language filtering.

- **Decentralized Storage & Distribution**

  - Articles stored in **OrbitDB**, replicated across Helia/IPFS peers.
  - IPFS PubSub for real-time content updates across the network.
  - Local REST API for consumption by the Nous App or other clients.

- **Extensible**
  - Add new sources or enrichment steps easily.
  - Full support for future-proofing with optional analysis fields.

---

## Getting Started

### Prerequisites

- Node.js >= 20
- npm or yarn

### Installation

```bash
git clone https://github.com/your-username/nous-news-node.git
cd nous-news-node
npm install
```

### Python AI Pipeline

See auto FastAPI-generated docs at <http://localhost:8000/docs>

### Quick Tests to ensure AI is working

# Sentiment route

curl -X POST http://localhost:8000/sentiment \
 -H "Content-Type: application/json" \
 -d '{"text":"I love FastAPI, it is amazing!"}'

# Political bias route

curl -X POST http://localhost:8000/political-bias \
 -H "Content-Type: application/json" \
 -d '{"text":"Government should regulate AI development carefully."}'

# Analyze article

curl -X POST http://localhost:8000/analyze \
 -H "Content-Type: application/json" \
 -d '{"content":"Some article content here"}'

### AI Architecture

philosophical.py
└── Domain logic only
├── choose model
├── choose prompt
└── call llm_json_runner()

llm_json_runner.py
└── Infra logic
├── token limits
├── truncation
├── generation
├── JSON extraction
├── JSON validation
└── consistent AIResponse
