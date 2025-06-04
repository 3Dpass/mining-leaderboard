# Deployment Guide

This document outlines how to build and deploy the Mining Leaderboard & Validator Set dashboard.

## Prerequisites

- **Node.js** >= 18
- **npm** (comes with Node.js)

Ensure these are available in your environment before continuing.

## 1. Clone the Repository

```bash
git clone https://github.com/3Dpass/mining-leaderboard.git
cd mining-leaderboard
```

## 2. Install Dependencies

```bash
npm install
```

> **Note:** If you plan to use custom API endpoints, edit `src/config.js` before building.

## 3. Build the App

Create a production-ready build:

```bash
npm run build
```

This will invoke `vite build` which bundles the application and outputs the compiled
files into the `dist` directory.

## 4. Preview Locally (Optional)

You can test the production build locally:

```bash
npm run preview
```

This starts a local static server pointing at the `dist` directory.

## 5. Deploy to Your Server

Upload the contents of the `dist` directory to any static hosting service or web server. Examples include:

- Nginx or Apache
- GitHub Pages
- Cloudflare Pages
- Any other static file host

Once uploaded, your Mining Leaderboard dashboard will be accessible from your chosen domain.

