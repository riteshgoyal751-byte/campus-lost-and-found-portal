# Campus Lost & Found Portal

A colorful, beginner-friendly full-stack web application built for college students to report lost items, post found items with photos, search and filter posts, view full item details, edit or delete posts, mark items as returned, and contact the poster.

## Project Files

- `index.html` — Webpage layout (colorful hero with illustration, Browse Items with search, popular campus location chips, category/sort/status filters, Item Details popup with edit/delete, and Report an Item form with optional photo upload)
- `styles.css` — Vibrant gradient themes, colorful category badges, card image styling, modal popup styling, and mobile/tablet/desktop responsive layout
- `app.js` — Frontend JavaScript (loads items, live search, Lost/Found + Category + Sort + Hide Returned filters, location chips, detail modal, Edit/Delete/Mark as Returned actions, optional photo preview, direct contact links & copy button, form validation)
- `server.js` — Node.js + Express backend server, `/images` asset serving, and full REST API (`/api/items` `GET`, `POST`, `PUT`, `PATCH /status`, `DELETE`)
- `data/items.json` — Simple JSON storage pre-loaded with 6 sample campus items
- `images/` — Hero illustration, sample item photos, and colorful category fallback SVGs
- `package.json` — Project configuration and Express dependency

## How to Run

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
