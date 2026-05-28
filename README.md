# Knolly 📚🧪

An elegant, high-fidelity academic research micro-feed built with React, Vite, Express, and Dexie IndexedDB. Inspired by modern real-time layouts, Knolly transforms academic paper databases into a sleek, digestible, scrolling social-style stream.

---

## 🎨 Visual Preview & Branding
A custom high-contrast branding icon has been integrated at `src/assets/images/knolly_logo_1779974354881.png` and is registered as the browser's tab icon (Favicon).

---

## 🚀 Key Architectural Pillars

### 1. Direct Academic API Integration
- **Semantic Scholar API**: Connects to the official Semantic Scholar REST search endpoint, pulling active academic index records.
- **Strict 10-Year Boundary**: Limits research discoveries strictly to pieces published from 2016 onward to maintain contemporary scientific alignment.
- **Summarized Abstract Layouts**: TLDR and abstractions are carefully handled to ensure a punchy, low-cognitive-load feed format suitable for deep desktop reading.

### 2. Dual-Cache offline Sync Engine
- **IndexedDB Local Storage**: Bootstraps of up to 100 posts are downloaded and preserved locally during startup, ensuring instant offline loading.
- **Silent Background Fetching**: Background fetches are dynamically scheduled whenever the remaining unread posts queue falls below 30.
- **Optimized Virtualized Views**: Custom-sliced list loading keeps RAM small even when handling extensive scrolling sessions.

### 3. Sleek Typography & Responsive Fit
- **Display Typography**: Utilizes a combination of **Inter**, **Playfair Display**, and **JetBrains Mono** font layers to cleanly distinguish between abstracts, active researchers, and statistics indices.
- **Adaptive Column Architecture**: Seamlessly shifts layouts based on breakpoints, emphasizing dedicated focus columns for study categories.

---

## ⚙️ Setup and Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local developer server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000 to experience the academic sync feed.
