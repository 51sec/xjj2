# XJJ Video Player

A single-file HTML5 video player that streams videos from local lists (`.txt`/`.json`) or live online APIs. Drop `index.html` on any static web host and you have a fully working, mobile-friendly video player with no backend or build step required.

**Author:** NetSec ([https://51sec.org](https://51sec.org))
**Live demo:** https://xjj.51sec.org
**Copyright:** © 2026 NetSec. All rights not explicitly granted below are reserved.

## Features

- **Zero backend, single file** — the entire app (UI, styles, and logic) lives in `index.html`. Deploy it anywhere that serves static files.
- **Multiple video sources**, switchable on the fly from a dropdown:
  - Local playlist files — plain-text (`videos.txt`, one URL per line) or JSON (`videos.json`, array of URL strings or `{url, title}` objects)
  - Live API sources that return a direct video URL or stream (`api` / `api-fetch` types), including several pre-configured community endpoints
- **Random start & sequential playback** — playlists start at a random video, then move forward/back in order.
- **1-second startup pause** — the very first video, right when the page loads, waits 1 second before playing. Every later video (Next/Prev/Auto Next, source switches) plays immediately with no delay.
- **Auto Next / Loop / Mute toggles** — auto-advance to the next video on end, loop the current video indefinitely, or mute audio, from the sidebar (desktop) or bottom bar (mobile). Auto Next is **on** by default, and audio starts at a quiet **20% volume** rather than fully muted or full blast (see [Ad monetization](#ad-monetization--watch-time) below) — both are one click/tap to change.
- **Dark / Light theme toggle** — switch instantly, remembered across visits via `localStorage`, with no flash of the wrong theme on reload.
- **Add your own source at runtime** — paste a `.txt`/`.json` playlist URL or an API endpoint directly into the UI (desktop sidebar or the mobile "+" panel) to add it to the source list without touching the code.
- **Video title display** — shows the `title`/`name` field from JSON playlist entries when present.
- **Automatic failover** — broken, stalled, or timed-out video URLs are automatically marked bad and skipped so playback never gets stuck; live API sources retry with backoff up to 5 times before asking you to retry manually.
- **Next-video prefetching** — for playlist sources, the next video is quietly prefetched while the current one plays, reducing the wait when you skip ahead.
- **Keyboard shortcuts** (desktop):
  - `Space` — play/pause
  - `↑` / `↓` / `P` / `N` — previous / next video
  - `A` — toggle Auto Next
  - `L` — toggle Loop
  - `M` — toggle Mute
  - `F` — toggle fullscreen
  - `T` — toggle theme
- **Touch gestures** (mobile/tablet) — swipe up/down to go to the next/previous video, with an on-screen swipe hint.
- **Responsive UI** — a sidebar with dropdown/controls on desktop, condensed top bar and bottom control strip on mobile and tablet, with touch-friendly input sizing.
- **"Take a break" pause gate** — every 8 videos, playback pauses and shows a modal (with an ad slot, countdown, and social links) before continuing. The preview image refreshes on a countdown that starts at 5 seconds and grows a little longer each cycle, Continue is disabled for the first 5 seconds so the ad gets a real view, and the gate auto-continues once 15 photos have been shown (~14 minutes total) if left untouched.
- **Toast notifications and loading overlay** for source switches, errors, and buffering states.
- **Ad-block detection overlay** and built-in ad integrations (Google AdSense manual display units, Ezoic) — optional and easy to strip out if you don't need them (see [Self-hosting notes](#self-hosting-notes)).
- **Cookie consent banner** (`compliance.js`) — Google Analytics and Cloudflare Insights only load after a visitor explicitly accepts; rejecting keeps them off entirely.
- **Per-video report button** (`compliance.js`) — a 🚩 Report control near the video permanently removes that specific video from rotation on your device (persisted in `localStorage`), independent of the automatic failover for broken links.
- **Legal / Terms / DMCA page** ([`legal.html`](legal.html)) — a standalone page covering content sourcing, no-warranty/no-ownership disclaimer, the DMCA takedown procedure and contact, and the privacy/cookie policy. Linked from the global footer, the break modal, and the mobile top bar.
- **Global footer** — copyright, GitHub link, and the Terms & DMCA link live in a slim bar at the bottom of the whole app (not just the sidebar), so they're visible on mobile too and don't compete with the sidebar's other content for space.

## Deployment

1. Fork this repository.
2. Edit `videos.txt` / `videos.json` with your own video URLs, or point the `SOURCES` array in `index.html` at your own API endpoints.
3. Deploy the static files (`index.html`, `compliance.js`, `legal.html`, `videos.txt`, `videos.json`, `logo.png`, `favicon.ico`) to any static hosting provider.

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

You can also add a source at runtime without editing the file — use the "Custom Source" form in the sidebar (desktop) or the "+" button in the top bar (mobile), pick the source type, and paste the URL.

The source loaded on startup is controlled by `DEFAULT_SOURCE_ID` in `index.html` (currently `4`, "CunShao Web") rather than always being the first item in `SOURCES` — manual timing tests found it the fastest and most consistent of the pre-configured API sources (~0.5s time-to-first-byte vs. 0.7–2s for the others). "NRZJ Video 2" (id `8`) was the slowest and least consistent in the same testing (one run took 8.4s) and may be worth dropping if reliability matters more than having an extra option.

## Ad monetization & watch-time

The player is tuned to maximize ad exposure and session length:

- **Four manual display ad units**, all fixed size: one near the top of the left sidebar (`#sidebar-ad-space`, desktop only, 160×300, slot `2402890298` / "xjj-sidebar"), one in a **dedicated right-side panel** (`#right-ad-panel`, desktop only, 160×600, reusing the same slot `2402890298` — the same slot ID can serve different fixed sizes depending on each placement's own dimensions) mirroring the left sidebar's role as its own reserved column rather than an overlay, one inside the "take a break" modal (336×280, shown to every visitor, every 8 videos, on both desktop and mobile, slot `7463645282` / "XJJ - Break Modal"), and a mobile-only banner (`#mobile-ad-banner`, 320×50, fixed just below the top bar, slot `3800566595` / "XJJ - Mobile Banner") — previously mobile visitors only ever saw an ad in the break modal, since the sidebar (and its ads) are hidden entirely on mobile. The right panel ad previously lived at the bottom of the left sidebar; it moved to its own column specifically so it never overlaps the video, consistent with every other ad placement decision here.
- All four ad units use a **fixed size** rather than `data-ad-format="auto"` + `data-full-width-responsive="true"`. Responsive slots let Google's ad server pick any format, including expandable/interactive rich-media creatives (e.g. an oversized skyscraper that pushed sidebar content off-screen, and "vignette"-style app-install/travel-tour ads that overlaid a large chunk of the video with a non-functional close button) — fixed IAB standard sizes constrain what can be served. The right-panel ad was briefly auto/responsive on the theory that being the last element in a scrollable sidebar made an oversized creative harmless — that turned out to be wrong: the expandable creative rendered as a viewport-relative overlay covering the video, ignoring where its container sits on the page entirely. Fixed size is the only mitigation that's actually held up across testing, so all four units use it. If aggressive creatives still slip through, use AdSense's **Ads → Content → Blocking controls** to block specific categories (e.g. "Dating") — that's account-level and outside what this codebase can control.
- **Google AdSense Auto ads** (`enable_page_level_ads`) is intentionally not used on this page — its Vignette format rendered as a large box covering the video with a non-functional close button, a bad fit for this app's full-screen, `overflow: hidden`, non-scrolling layout. A Side rail-only restriction (a much less invasive format, pinned to genuinely empty page margin rather than the viewport) was considered and briefly implemented, but this AdSense property is verified at the root domain (`51sec.org`), and Auto ads format settings apply to that domain *and all its subdomains together* — there's no way to enable a format for just `xjj.51sec.org` without also changing Auto ads behavior on `51sec.org`'s other subdomains. Auto ads is fully disabled specifically for this subdomain via a **Page exclusion** in the AdSense dashboard (Ads → By site → Page exclusions → `https://xjj.51sec.org/`), which is the actual enforcement mechanism — not calling `enable_page_level_ads` in the code is just for clarity, not what stops it. This also replaced an older set of `<amp-auto-ads>`/`<amp-ad>` tags that were inert on this non-AMP page (they need the full AMP runtime to render, which this page doesn't load).
- The first sidebar ad sits right after the source picker, before the Playback/Navigate/Custom Source sections — earlier it was pushed to the bottom of the sidebar (below several toggle rows, nav buttons, and a form), which on typical laptop screens meant it was clipped below the fold and never rendered. Two bugs compounded this: `#sidebar` had `overflow-y: auto` but flex items default to `min-height: auto`, which ignores that and grows past the viewport instead of scrolling — fixed by adding `min-height: 0`. The break-modal ad had the opposite problem: its `push({})` call ran at page load while the modal was still `display: none` (0×0 size), which makes AdSense fail that slot permanently even once the modal becomes visible — fixed by pushing it lazily the first time the modal actually opens (in `showPauseModal()`), guarded to push only once.
- The sidebar's other controls were compacted to leave more visible room for ads without scrolling: the 4 Playback toggles are a 2×2 grid instead of 4 stacked rows, Navigate is a full-width Next/Pass button plus a 2-column Previous/Fullscreen row instead of 3 stacked buttons, the Custom Source URL input and type selector share one row, and section spacing (logo, dividers, labels, sidebar padding) was tightened throughout.
- The break modal's **Continue** button is disabled for 5 seconds (a countdown label shows the remaining time) so its ad slot gets a guaranteed minimum view, similar to a skippable video ad. **Stop** is never gated.
- No "Advertisement" caption is shown above any ad slot — Google's own ad creative carries its own "Ad"/sponsored labeling.
- The break interval (`GATE_EVERY` in `index.html`) was reduced from every 10 videos to every **8**, increasing how often the ad-bearing break modal appears.
- The break modal auto-continues once **`PHOTO_CAP`** (15) photos have been shown, replacing an earlier fixed 60-second timer — with the escalating per-photo interval (5s, 8s, 12s, 17s, ...), 15 photos totals roughly 14 minutes if a visitor never interacts.
- The break modal's ad is **re-requested every `AD_REFRESH_EVERY`** (3) photo changes via `refreshBreakAd()`, which removes the existing `<ins>` and appends a fresh one before calling `push({})` again (re-pushing the same filled `<ins>` throws an AdSense error). **Caution:** refreshing an ad slot without a genuine change in content/context is against AdSense policy and risks enforcement action against the account; the timing here (first refresh at ~25s, given the escalating interval) is under Google's own ~30s minimum guidance for their sanctioned refresh feature. This was a deliberate, informed tradeoff — adjust `AD_REFRESH_EVERY` upward if that risk turns out to matter more than the extra impressions.
- **Fixed size is not a complete fix for expandable/interactive ad creatives.** After switching every unit to fixed dimensions, an expandable creative (confirmed via its ad-click URL to carry our own `client=ca-pub-5660349373091698`, ruling out Ezoic or another network) still rendered as a large viewport-covering overlay from the sidebar ad slot. Fixed size reduces how often this happens but doesn't prevent a specific creative from using the SafeFrame "expand" capability regardless of its slot's requested size. The only reliable fix found for a *repeat offender* creative is blocking it directly in **AdSense → Ads → Ad review center** (or Blocking controls) by advertiser/URL — that's account-level and outside what this codebase can control.
- **Auto Next defaults to on**, and audio starts at a quiet **20% volume** (`DEFAULT_VOLUME` in `index.html`) instead of full mute or full volume. Mobile browsers only allow autoplay when a video starts truly `muted`, so the `<video>` element starts muted in HTML for that reason, then the player automatically drops mute (keeping the low volume) the instant the first video actually begins playing — a standard technique, since changing `muted` after playback has started usually doesn't re-trigger autoplay restrictions the way starting unmuted would. This reduces how often a visitor hits a "▶ Tap to play" wall and bounces before any video (or ad break) plays, while still being audible rather than silent. The Mute toggle always works normally after that.
  - **Caveat, confirmed via headless-browser testing:** in a browser/session with no prior media engagement on the site, that auto-unmute attempt can be rejected in a worse way than expected — instead of just staying muted, the browser **pauses the video entirely** ("Unmuting failed and the element was paused instead"). A dedicated `pause` listener detects this specific case and reverts to muted + resumes playback, since "plays, but silent" must always win over "stopped entirely." If a visitor ever reports the video not autoplaying, this is the first thing to check.
  - The Mute toggle shows **"OFF" from the very first paint**, not a brief flash of "ON" — even though the `<video>` is technically still `muted` for that first instant (required for autoplay). It only updates to reflect the real state once the video actually starts (`syncMuteUI()` is called from the `playing`/`pause` listeners, not at startup), so if the browser's autoplay policy forces the muted fallback above, the toggle honestly flips to "ON" rather than lying about it.

These are business/UX tradeoffs, not just technical ones — tune `GATE_EVERY`, `CONTINUE_MIN_DWELL`, and `DEFAULT_VOLUME`/`autoNext` in `index.html` if eight videos, a 5-second gate, or the volume level turns out to be too aggressive for your audience.

## Self-hosting notes

If you fork this project for your own deployment, note that `index.html` ships with 51SEC's own ad integrations baked in (Google AdSense/Ezoic and an ad-block-detection overlay), and `compliance.js` loads Google Analytics + Cloudflare Insights under 51SEC's own tracking IDs once a visitor accepts the cookie banner. These are safe to remove or repoint to your own accounts — search for the `<!-- Ad block detection -->` section and the `<script src="compliance.js">` tag in `index.html`, the `ca-pub-...` client ID throughout `index.html`, and the tracking IDs inside `compliance.js`'s `loadAnalyticsScripts()` function. Also replace the `data-ad-slot` values described in [Ad monetization](#ad-monetization--watch-time) above with your own.

If you fork this for your own deployment, also update the contact details in `legal.html` (currently `dmca@51sec.org` / `https://51sec.org`) to your own — a DMCA contact that doesn't reach you defeats the purpose.

`compliance.js` is loaded with a manual cache-busting query string (`<script src="compliance.js?v=2">` in `index.html`) since this project has no build step to hash its filename — bump that `?v=` number whenever you edit `compliance.js`, or browsers/CDNs can keep serving visitors a stale cached copy after you deploy a fix.

## Compliance & content disclaimer

This player streams video content from third-party sources (local playlists you supply, and/or the community API endpoints pre-configured in `SOURCES`). The project does not host, produce, moderate, or claim ownership of that third-party content. If you deploy this app publicly, you are responsible for the content your chosen sources return and for complying with applicable copyright, content, and platform policies in your jurisdiction.

To help with that, two files handle compliance concerns separately from the player itself:

- **[`legal.html`](legal.html)** — Terms of Use, no-warranty/no-ownership disclaimer, the DMCA takedown procedure with contact info, and the privacy/cookie policy. Reachable from the global footer, the break modal, and the mobile top bar (📄 icon).
- **[`compliance.js`](compliance.js)** — implements, independently of the core player:
  - a **cookie consent banner** that gates Google Analytics and Cloudflare Insights behind an explicit accept/reject choice;
  - a **🚩 Report** button near the video that permanently removes the current video's URL from rotation on that device.

Both files are optional — `index.html` only calls into `compliance.js` via guarded `typeof ... === 'function'` checks, so deleting `compliance.js` (and its `<script>` tag) makes the player start immediately with no banner or report button. This isn't legal advice, and none of it eliminates the underlying question of whether you have rights to redistribute the content your configured sources return — consult a lawyer for an actual compliance determination if you're deploying this publicly.

## Author & Copyright

- **Author:** NetSec
- **Website:** https://51sec.org
- **Copyright:** © 2026 NetSec. All rights reserved except as granted by the license below.

## License

This project is licensed under the [MIT License](LICENSE) — Copyright (c) 2026 NetSec ([https://51sec.org](https://51sec.org)).

If you fork or redistribute this project, the MIT License requires that you keep the original copyright notice and license text (see [`LICENSE`](LICENSE)) intact in your copy.
