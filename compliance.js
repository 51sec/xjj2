/*
 * XJJ Video Player — Compliance Module
 * Author: NetSec (https://51sec.org)
 * Copyright (c) 2026 NetSec (https://51sec.org). Licensed under the MIT
 * License — see LICENSE in this repository.
 *
 * Adds three things to index.html, independently of the core player logic:
 *
 *   1. An age-gate / content disclaimer interstitial, shown once per
 *      browser, that must be accepted before the player starts.
 *   2. A cookie/tracking consent banner that gates Google Analytics and
 *      Cloudflare Insights behind an explicit accept/reject choice.
 *   3. A per-video "🚩 Report" button that permanently removes the
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
 * immediately with no gate, banner, or report button. See README.md
 * "Self-hosting notes" before removing it, though — the age-gate and
 * report button are there to reduce real content-moderation/compliance
 * risk, not just to look nice.
 */
(function () {
  'use strict';

  var STORAGE = {
    AGE_GATE: 'xjj-agegate-accepted',
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
      '#xjj-agegate, #xjj-consent-banner, #xjj-report-btn { box-sizing: border-box; }',
      '#xjj-agegate *, #xjj-consent-banner * { box-sizing: border-box; }',
      '#xjj-agegate {',
      '  position: fixed; inset: 0; z-index: 999999;',
      '  background: rgba(4,4,12,0.88); backdrop-filter: blur(6px);',
      '  display: flex; align-items: center; justify-content: center;',
      '  padding: 24px; font-family: var(--font-body, sans-serif);',
      '}',
      '#xjj-agegate .box {',
      '  background: var(--surface, #12121f); color: var(--text, #f0eeff);',
      '  border: 1px solid var(--border-2, rgba(255,255,255,0.12));',
      '  border-radius: 16px; padding: 28px 26px; max-width: 440px;',
      '  width: 100%; max-height: 86vh; overflow-y: auto;',
      '  box-shadow: 0 32px 80px rgba(0,0,0,0.6);',
      '}',
      '#xjj-agegate h2 {',
      '  font-size: 1.05rem; margin-bottom: 12px;',
      '  font-family: var(--font-display, sans-serif);',
      '}',
      '#xjj-agegate p {',
      '  font-size: 0.82rem; line-height: 1.6;',
      '  color: var(--text-muted, rgba(240,238,255,0.7)); margin-bottom: 12px;',
      '}',
      '#xjj-agegate a, #xjj-consent-banner a { color: var(--accent2, #00e5c8); }',
      '#xjj-agegate .decline-notice {',
      '  color: var(--accent, #ff4d6d); font-weight: 600; display: none;',
      '}',
      '#xjj-agegate .decline-notice.show { display: block; }',
      '#xjj-agegate .actions { display: flex; gap: 10px; margin-top: 18px; }',
      '#xjj-agegate button {',
      '  flex: 1; padding: 12px 0; border-radius: 10px; border: 1px solid transparent;',
      '  font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit;',
      '}',
      '#xjj-agegate .btn-agree { background: var(--accent, #ff4d6d); color: #fff; }',
      '#xjj-agegate .btn-decline {',
      '  background: transparent; border-color: var(--border-2, rgba(255,255,255,0.2));',
      '  color: var(--text-muted, #ccc);',
      '}',
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
      '  position: absolute; top: 60px; right: 16px; z-index: 20;',
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
  // 1. Age-gate / content disclaimer interstitial
  // ---------------------------------------------------------------------
  function buildAgeGate(onAccept) {
    var declineNotice = el('p', {
      class: 'decline-notice',
      text: 'You must accept to use this site.',
    });

    var box = el('div', { class: 'box' }, [
      el('h2', { text: '18+ Content Disclaimer' }),
      el('p', { html:
        'This app plays video content pulled live from third-party sources ' +
        '(playlists and/or community API endpoints). We do not host, produce, ' +
        'pre-screen, or endorse this content, and it may be unpredictable or ' +
        'unsuitable for minors.'
      }),
      el('p', { html:
        'By continuing, you confirm you are at least 18 years old (or the age ' +
        'of majority where you live) and agree to our ' +
        '<a href="' + LEGAL_URL + '" target="_blank" rel="noopener">Terms of Use &amp; DMCA Policy</a>.'
      }),
      declineNotice,
    ]);

    var agreeBtn   = el('button', { class: 'btn-agree', type: 'button', text: 'I Agree — Enter' });
    var declineBtn = el('button', { class: 'btn-decline', type: 'button', text: 'Decline' });
    box.appendChild(el('div', { class: 'actions' }, [declineBtn, agreeBtn]));

    var overlay = el('div', {
      id: 'xjj-agegate',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Content disclaimer',
    }, [box]);

    agreeBtn.addEventListener('click', function () {
      safeSet(STORAGE.AGE_GATE, '1');
      overlay.remove();
      onAccept();
    });
    declineBtn.addEventListener('click', function () {
      declineNotice.classList.add('show');
    });

    document.body.appendChild(overlay);
  }

  function initAgeGate(onReady) {
    if (safeGet(STORAGE.AGE_GATE) === '1') {
      onReady();
      return;
    }
    buildAgeGate(onReady);
  }

  // ---------------------------------------------------------------------
  // 2. Cookie / tracking consent banner
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
  // 3. Per-video report / permanent blocklist
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
    initAgeGate(function () {
      startApp();
      initConsentBanner();
    });
  };
})();
