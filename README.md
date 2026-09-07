# XJJ Video Player

A single-file HTML5 video player that streams videos from local lists (`.txt`/`.json`) or live online APIs. Drop `index.html` on any static web host and you have a fully working, mobile-friendly video player with no backend or build step required.

Live demo: https://xjj.51sec.org

## Features

- **Zero backend, single file** — the entire app (UI, styles, and logic) lives in `index.html`. Deploy it anywhere that serves static files.
- **Multiple video sources**, switchable on the fly from a dropdown:
  - Local playlist files — plain-text (`videos.txt`, one URL per line) or JSON (`videos.json`, array of URL strings or `{url, title}` objects)
  - Live API sources that return a direct video URL or stream (`api` / `api-fetch` types), including several pre-configured community endpoints
- **Random start & sequential playback** — playlists start at a random video, then move forward/back in order.
- **Auto Next / Loop toggles** — auto-advance to the next video on end, or loop the current video indefinitely.
- **Automatic failover** — broken, stalled, or timed-out video URLs are automatically marked bad and skipped so playback never gets stuck.
- **Keyboard shortcuts** (desktop):
  - `Space` — play/pause
  - `↑` / `↓` / `P` / `N` — previous / next video
  - `A` — toggle Auto Next
  - `L` — toggle Loop
  - `F` — toggle fullscreen
- **Touch gestures** (mobile) — swipe up/down to go to the next/previous video, with an on-screen swipe hint.
- **Responsive UI** — a sidebar with dropdown/controls on desktop, condensed top bar and bottom control strip on mobile.
- **"Take a break" pause gate** — after every 10 videos, playback pauses and shows a modal (with countdown and social links) before continuing, encouraging mindful viewing.
- **Toast notifications and loading overlay** for source switches, errors, and buffering states.
- **Ad-block detection overlay** and built-in analytics/ad integrations (Google Analytics, Cloudflare Insights, Ackee, AdSense) — all optional and easy to strip out if you don't need them.

## Deployment

1. Fork this repository.
2. Edit `videos.txt` / `videos.json` with your own video URLs, or point the `SOURCES` array in `index.html` at your own API endpoints.
3. Deploy the static files (`index.html`, `videos.txt`, `videos.json`, `logo.png`, `favicon.ico`) to any static hosting provider.

The easiest option is **Cloudflare Pages**:

1. Fork the project on GitHub.
2. Connect the fork to Cloudflare Pages (no build command needed — it's a static site).
3. Optionally attach your own domain from Cloudflare to the Pages project.

## Configuring video sources

Sources are defined in the `SOURCES` array near the top of the `<script>` block in `index.html`:

```js
const SOURCES = [
  { id: 1, label: 'Local TXT',  type: 'list', format: 'txt',  url: 'videos.txt'  },
  { id: 2, label: 'Local JSON', type: 'list', format: 'json', url: 'videos.json' },
  { id: 3, label: 'My API',     type: 'api',                  url: 'https://example.com/random-video.php' },
];
```

- `type: 'list'` — reads a static `.txt` (one URL per line) or `.json` (array of URLs or `{url, title}` objects) playlist file.
- `type: 'api'` — the URL is set directly as the video's `src` (useful for APIs that redirect or stream a video per request).
- `type: 'api-fetch'` — the URL is fetched first, and its plain-text response body (a video URL) is then used as the video `src`.

## License

This project is licensed under the [MIT License](LICENSE).
