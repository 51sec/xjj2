/*
 * XJJ Video Player — Compliance Module
 * Author: NetSec (https://51sec.org)
 * Copyright (c) 2026 NetSec (https://51sec.org). Licensed under the MIT
 * License — see LICENSE in this repository.
 *
 * Adds two things to index.html, independently of the core player logic:
 *
 *   1. A cookie/tracking consent banner that gates Google Analytics and
 *      Cloudflare Insights behind an explicit accept/reject choice.
 *   2. A per-video "🚩 Report" button that permanently removes the
 *      current video's URL from rotation (persisted in localStorage),
 *      independent of the automatic failover already built into the
 *      player for broken/stalled links.
 *
 * See legal.html for the full Terms of Use / DMCA / Privacy policy this
 * module links to.
 *
 * This file is optional: index.html's own script only calls the hooks
 * below if they exist (`typeof initComplianceGate === 'function'`, etc.),
 * so removing this file (and its <script> tag) makes the player start
 * immediately with no banner or report button. See README.md
 * "Self-hosting notes" before removing it, though — the report button is
 * there to reduce real content-moderation risk, not just to look nice.
 */
(function () {
  'use strict';

  var STORAGE = {
    CONSENT:  'xjj-consent',   // 'accepted' | 'rejected'
    REPORTED: 'xjj-reported-urls',
  };
  var REPORTED_MAX = 500;
  var LEGAL_URL = 'legal.html';

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable, e.g. private mode */ }
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '#xjj-consent-banner, #xjj-report-btn { box-sizing: border-box; }',
      '#xjj-consent-banner * { box-sizing: border-box; }',
      '#xjj-consent-banner a { color: var(--accent2, #00e5c8); }',
      '#xjj-consent-banner {',
      '  position: fixed; left: 0; right: 0; bottom: 0; z-index: 900000;',
      '  background: var(--surface, #12121f); color: var(--text, #f0eeff);',
      '  border-top: 1px solid var(--border-2, rgba(255,255,255,0.12));',
      '  padding: 14px 18px; display: flex; flex-wrap: wrap; gap: 12px;',
      '  align-items: center; justify-content: space-between;',
      '  font-family: var(--font-body, sans-serif);',
      '  box-shadow: 0 -8px 32px rgba(0,0,0,0.4);',
      '}',
      '#xjj-consent-banner p {',
      '  font-size: 0.76rem; color: var(--text-muted, rgba(240,238,255,0.7));',
      '  margin: 0; flex: 1 1 240px;',
      '}',
      '#xjj-consent-banner .actions { display: flex; gap: 8px; flex-wrap: wrap; }',
      '#xjj-consent-banner button {',
      '  padding: 9px 16px; border-radius: 20px;',
      '  border: 1px solid var(--border-2, rgba(255,255,255,0.2));',
      '  font-size: 0.76rem; font-weight: 600; cursor: pointer; font-family: inherit;',
      '  background: var(--btn-bg, rgba(255,255,255,0.06)); color: var(--text, #f0eeff);',
      '}',
      '#xjj-consent-banner .btn-accept { background: var(--accent, #ff4d6d); border-color: transparent; color: #fff; }',
      '#xjj-report-btn {',
      '  position: absolute; top: 84px; left: 16px; z-index: 20;',
      '  background: rgba(8,8,16,0.6); backdrop-filter: blur(8px);',
      '  border: 1px solid var(--border, rgba(255,255,255,0.07));',
      '  color: var(--text-muted, rgba(240,238,255,0.7));',
      '  padding: 6px 14px; border-radius: 20px; font-size: 0.68rem;',
      '  font-family: var(--font-mono, monospace); cursor: pointer; letter-spacing: 0.4px;',
      '}',
      '#xjj-report-btn:hover { color: var(--accent, #ff4d6d); border-color: var(--accent, #ff4d6d); }',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------
  // 1. Cookie / tracking consent banner
  // ---------------------------------------------------------------------
  function loadAnalyticsScripts() {
    var cf = document.createElement('script');
    cf.defer = true;
    cf.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    cf.setAttribute('data-cf-beacon', '{"token": "6ee4816c3be6499ca1921607cb43ebec"}');
    document.body.appendChild(cf);

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-ZG4SMQ6WCB');
    var ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-ZG4SMQ6WCB';
    document.body.appendChild(ga);
  }

  function initConsentBanner() {
    var existing = safeGet(STORAGE.CONSENT);
    if (existing === 'accepted') { loadAnalyticsScripts(); return; }
    if (existing === 'rejected') { return; }

    var text = el('p', { html:
      'We use cookies for basic analytics (Google Analytics, Cloudflare Insights) ' +
      'to understand site traffic. <a href="' + LEGAL_URL + '#privacy" target="_blank" rel="noopener">Learn more</a>.'
    });
    var acceptBtn = el('button', { class: 'btn-accept', type: 'button', text: 'Accept' });
    var rejectBtn = el('button', { type: 'button', text: 'Reject non-essential' });
    var banner = el('div', {
      id: 'xjj-consent-banner',
      role: 'dialog',
      'aria-label': 'Cookie consent',
    }, [text, el('div', { class: 'actions' }, [rejectBtn, acceptBtn])]);

    acceptBtn.addEventListener('click', function () {
      safeSet(STORAGE.CONSENT, 'accepted');
      banner.remove();
      loadAnalyticsScripts();
    });
    rejectBtn.addEventListener('click', function () {
      safeSet(STORAGE.CONSENT, 'rejected');
      banner.remove();
    });

    document.body.appendChild(banner);
  }

  // ---------------------------------------------------------------------
  // 2. Per-video report / permanent blocklist
  // ---------------------------------------------------------------------
  function loadReportedUrls() {
    try {
      var raw = localStorage.getItem(STORAGE.REPORTED);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? new Set(arr) : new Set();
    } catch (e) {
      return new Set();
    }
  }
  var reportedUrls = loadReportedUrls();

  function saveReportedUrls() {
    try {
      var arr = Array.prototype.slice.call(reportedUrls).slice(-REPORTED_MAX);
      localStorage.setItem(STORAGE.REPORTED, JSON.stringify(arr));
    } catch (e) { /* storage unavailable */ }
  }

  // Consumed by index.html's loadSource() — see the guarded call there.
  // Kept as a plain global function (not attached under a namespace object)
  // so the `typeof filterReportedVideos === 'function'` check in index.html
  // works without every caller needing to know about this file.
  window.filterReportedVideos = function (videos) {
    return videos.filter(function (v) { return !reportedUrls.has(v.url); });
  };

  function reportCurrentVideo() {
    if (typeof state === 'undefined' || typeof activeSource !== 'function') return;
    var src = activeSource();
    var key = null;

    if (src.type === 'list') {
      var item = state.videos[state.index];
      key = item && item.url;
      if (key) {
        state.videos = state.videos.filter(function (v) { return v.url !== key; });
        if (state.index >= state.videos.length) state.index = 0;
      }
    } else if (src.type === 'api-fetch') {
      // The resolved mp4 URL currently loaded — stable enough to block if it recurs.
      key = (typeof video !== 'undefined' && video.src) || null;
    } else if (src.type === 'api') {
      // Direct-src APIs return a fresh, non-reproducible URL per request, so
      // there's nothing stable to blocklist. Log a timestamped marker for
      // your own reference instead of pretending this blocks recurrence.
      key = 'api:' + src.id + ':' + Date.now();
    }

    if (!key) {
      if (typeof showToast === 'function') showToast('Nothing to report');
      return;
    }

    reportedUrls.add(key);
    saveReportedUrls();
    if (typeof showToast === 'function') showToast('Reported — skipping…');
    if (typeof playCurrentVideo === 'function') playCurrentVideo();
  }

  function injectReportButton() {
    var area = document.getElementById('video-area');
    if (!area) return;
    var btn = el('button', {
      id: 'xjj-report-btn',
      type: 'button',
      title: 'Report this video — permanently removes it from rotation on this device',
      text: '🚩 Report',
    });
    btn.addEventListener('click', reportCurrentVideo);
    area.appendChild(btn);
  }

  // ---------------------------------------------------------------------
  // Public entry point. Called from index.html once the player's own
  // globals (state, video, SOURCES, activeSource, etc.) are declared —
  // functions below only read those at click-time, well after that point,
  // so load order just needs this file to appear before the main script.
  // ---------------------------------------------------------------------
  window.initComplianceGate = function (startApp) {
    injectStyles();
    injectReportButton();
    startApp();
    initConsentBanner();
  };
})();
