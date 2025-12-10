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
