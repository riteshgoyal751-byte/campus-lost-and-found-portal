# Campus Lost & Found Portal

A colorful, beginner-friendly full-stack web application built for college students to report lost items, post found items with photos, search and filter posts, view full item details, edit or delete posts, mark items as returned, and contact the poster.

## Project Files

- `public/index.html` — Webpage layout (served directly from `public/` on Vercel CDN)
- `public/styles.css` — Vibrant gradient themes, colorful category badges, card image styling, modal popup styling, and mobile/tablet/desktop responsive layout
- `public/app.js` — Frontend JavaScript (loads items, live search, Lost/Found + Category + Sort + Hide Returned filters, location chips, detail modal, Edit/Delete/Mark as Returned actions, optional photo preview, direct contact links & copy button, form validation)
- `public/images/` — Hero illustration, sample item photos, and colorful category fallback SVGs
- `server.js` — Node.js + Express backend server (exports `app` for Vercel and runs `app.listen()` only locally)
- `data/items.json` — Bundled sample campus items (used directly locally, and as seed data on Vercel serverless instances)
- `package.json` — Project configuration, Express dependency, and `"engines": { "node": "22.x" }`

## How to Run Locally

1. Open **Command Prompt** in this folder (`cd /d d:\Traceit`).
2. Install dependencies (only needed once):
   ```bat
   npm install
   ```
3. Start the server:
   ```bat
   npm start
   ```
4. Open `http://localhost:3000` in your browser.
5. Press `Ctrl + C` in the terminal to stop the server.

## Vercel Deployment Notes

- Static assets live inside `public/` so Vercel serves them directly via its CDN.
- `server.js` exports `module.exports = app` and guards `app.listen()` with `require.main === module`.
- On Vercel, deployments have a read-only filesystem, so new/edited posts are stored temporarily in memory + `/tmp` per warm serverless instance and reset on cold starts/redeploys unless connected to an external database.
