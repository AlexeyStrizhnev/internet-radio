# Internet Radio PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor internet-radio PWA: split into modules, dark mobile-first UI, Radio Record API integration, drag-and-drop reordering, auto stream quality switching, now-playing track info.

**Architecture:** Pure vanilla HTML/CSS/JS, no frameworks or build tools. Six files: index.html (shell), style.css (dark theme), api.js (Radio Record API), player.js (Audio + auto-switch), ui.js (render + drag-drop + modal), app.js (init + polling). PWA with Service Worker caching.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES6+), Radio Record API, Service Worker API, Media Session API, Touch/Pointer Events for drag-and-drop.

## Global Constraints

- No emojis anywhere in UI, manifest, or code
- Dark theme only: bg `#0f0f14`, cards `#1a1a24`, accent `#5b8def`, text `#e0e0e0`
- Mobile-first layout, 3-column station grid
- Custom stations always appear first in the list
- Stream quality auto-switch: 320 → 128 → 64 on buffer/stall
- Now-playing polling every 10 seconds
- Drag-and-drop for API stations only (custom stations stay at top, not draggable)

---

### Task 1: File structure and shell

**Files:**
- Create: `css/style.css`, `js/api.js`, `js/player.js`, `js/ui.js`, `js/app.js`
- Modify: `index.html` (full rewrite to shell)
- Modify: `manifest.json` (remove emoji, add geometric icon)
- Modify: `sw.js` (update cache list)

**Interface produces:**
- `index.html` loads `css/style.css`, then `js/api.js`, `js/player.js`, `js/ui.js`, `js/app.js` in order
- Global namespace: modules attach to `window.App` namespace (created by `app.js`)
- HTML structure with IDs: `#header`, `#addBtn`, `#trackBar`, `#trackInfo`, `#stationName`, `#stationsGrid`, `#volumeSlider`, `#prevBtn`, `#playBtn`, `#nextBtn`, `#addModal`, `#addUrlInput`, `#addSubmitBtn`

- [ ] **Step 1: Rewrite `index.html` to minimal shell**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0f0f14">
    <meta name="description" content="Интернет-радио плеер">
    <title>Интернет Радио</title>
    <link rel="manifest" href="manifest.json">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='42' fill='%235b8def'/><circle cx='50' cy='50' r='18' fill='%230f0f14'/><circle cx='50' cy='50' r='6' fill='%235b8def'/></svg>">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header id="header">
        <span>Интернет Радио</span>
        <button id="addBtn" title="Добавить станцию">+</button>
    </header>

    <div id="trackBar">
        <div id="trackInfo">Выберите станцию</div>
        <div id="stationName"></div>
    </div>

    <div id="stationsGrid"></div>

    <div id="controlsBar">
        <div id="volumeRow">
            <svg width="16" height="16" viewBox="0 0 24 24" id="volLow">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="#8a8a9a"/>
            </svg>
            <input type="range" id="volumeSlider" min="0" max="1" step="0.05" value="0.7">
            <svg width="20" height="20" viewBox="0 0 24 24" id="volHigh">
                <path d="M3 9v6h4l5 5V4L7 9H3zm16.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="#8a8a9a"/>
            </svg>
        </div>
        <div id="btnRow">
            <button id="prevBtn" class="ctrl-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#8a8a9a"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button id="playBtn" class="ctrl-btn play-btn">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white" id="playIcon"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button id="nextBtn" class="ctrl-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#8a8a9a"><path d="M6 18V6l8.5 6zM16 6h2v12h-2z"/></svg>
            </button>
        </div>
    </div>

    <div id="addModal" class="modal-overlay" style="display:none">
        <div class="modal-content">
            <h3>Добавить станцию</h3>
            <input type="text" id="addUrlInput" placeholder="URL радиостанции">
            <button id="addSubmitBtn">Добавить</button>
        </div>
    </div>

    <script src="js/api.js"></script>
    <script src="js/player.js"></script>
    <script src="js/ui.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create empty module files with strict mode**

Create `js/api.js`:
```js
'use strict';
// API module — Radio Record data fetching
const API = {};
```

Create `js/player.js`:
```js
'use strict';
// Player module — audio playback, auto quality switching
const Player = {};
```

Create `js/ui.js`:
```js
'use strict';
// UI module — rendering, drag-drop, modal
const UI = {};
```

Create `js/app.js`:
```js
'use strict';
// App module — initialization, polling, coordination
const App = {};
```

Create `css/style.css` — just a placeholder for now:
```css
/* style.css — dark theme for internet radio PWA */
/* Will be filled in Task 2 */
```

- [ ] **Step 3: Update `manifest.json` — remove emoji, use geometric SVG icon**

```json
{
  "name": "Интернет Радио",
  "short_name": "Радио",
  "description": "Интернет-радио плеер",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#0f0f14",
  "theme_color": "#0f0f14",
  "orientation": "portrait",
  "icons": [
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'><rect width='512' height='512' rx='100' fill='%230f0f14'/><circle cx='256' cy='256' r='180' fill='none' stroke='%235b8def' stroke-width='24'/><circle cx='256' cy='256' r='60' fill='%235b8def'/><path d='M256 76 L256 196 M256 316 L256 436 M76 256 L196 256 M316 256 L436 256' stroke='%235b8def' stroke-width='8' opacity='0.3'/></svg>",
      "sizes": "512x512",
      "type": "image/svg+xml"
    }
  ]
}
```

- [ ] **Step 4: Update `sw.js` — cache new file structure**

```js
const CACHE_NAME = 'radio-pwa-v2';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/api.js',
  './js/player.js',
  './js/ui.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});
```

- [ ] **Step 5: Verify — open index.html in browser**

Open `index.html` in a browser. Should see: dark background, header «Интернет Радио» with `+` button, empty track bar, empty grid area, controls bar at bottom. No console errors. Service Worker registers.

- [ ] **Step 6: Commit**

```bash
git add index.html manifest.json sw.js css/ js/
git commit -m "feat: set up file structure and HTML shell

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: CSS — dark theme, mobile-first styles

**Files:**
- Modify: `css/style.css` (full stylesheet)

- [ ] **Step 1: Write complete `css/style.css`**

```css
/* ===== Reset & Base ===== */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f0f14;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
}

/* ===== Header ===== */
#header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 10px;
  border-bottom: 1px solid #1e1e2a;
  flex-shrink: 0;
}

#header span {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

#addBtn {
  width: 28px;
  height: 28px;
  background: #1a1a24;
  border: 1px solid #2a2a3a;
  color: #5b8def;
  border-radius: 8px;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

#addBtn:active {
  background: #252535;
}

/* ===== Track Bar ===== */
#trackBar {
  padding: 10px 16px;
  border-bottom: 1px solid #1e1e2a;
  flex-shrink: 0;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

#trackInfo {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

#stationName {
  font-size: 11px;
  color: #8a8a9a;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== Stations Grid ===== */
#stationsGrid {
  flex: 1;
  overflow-y: auto;
  padding: 12px 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  align-content: start;
}

#stationsGrid::-webkit-scrollbar {
  width: 0;
}

.station-card {
  background: #1a1a24;
  border-radius: 12px;
  padding: 12px 6px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border-color 0.15s, background 0.15s;
  min-height: 90px;
  justify-content: center;
  position: relative;
}

.station-card:active {
  background: #222230;
}

.station-card.active {
  border-color: #5b8def;
  background: #1e1e30;
}

.station-card.dragging {
  opacity: 0.35;
}

.station-card.drag-over {
  border-color: #5b8def;
  border-style: dashed;
}

.station-card svg.station-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  pointer-events: none;
}

.station-card .card-name {
  font-size: 10px;
  color: #b0b0c0;
  text-align: center;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  pointer-events: none;
  word-break: break-word;
}

/* Custom station avatar (letter-based, no SVG) */
.station-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #2a2a3a;
  color: #8a8a9a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
  pointer-events: none;
}

/* ===== Controls Bar ===== */
#controlsBar {
  flex-shrink: 0;
  padding: 10px 16px 16px;
  background: #0a0a10;
  border-top: 1px solid #1e1e2a;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#volumeRow {
  display: flex;
  align-items: center;
  gap: 10px;
}

#volumeRow svg {
  flex-shrink: 0;
}

#volumeSlider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #2a2a3a;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

#volumeSlider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #5b8def;
  border-radius: 50%;
  border: none;
}

#volumeSlider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #5b8def;
  border-radius: 50%;
  border: none;
}

#btnRow {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 28px;
}

.ctrl-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}

.ctrl-btn:active {
  background: #1a1a24;
}

.ctrl-btn.play-btn {
  background: #5b8def;
  width: 46px;
  height: 46px;
}

.ctrl-btn.play-btn:active {
  background: #4a7cde;
}

.ctrl-btn:disabled {
  opacity: 0.3;
  pointer-events: none;
}

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-content {
  background: #1a1a24;
  border-radius: 16px;
  padding: 24px 20px 20px;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
  margin: 0;
}

.modal-content input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #2a2a3a;
  border-radius: 10px;
  background: #0f0f14;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.modal-content input:focus {
  border-color: #5b8def;
}

.modal-content input::placeholder {
  color: #5a5a6a;
}

.modal-content button {
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: #5b8def;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.modal-content button:active {
  background: #4a7cde;
}

/* ===== Notification toast ===== */
#toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: #2a2a3a;
  color: #e0e0e0;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 13px;
  z-index: 200;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

#toast.show {
  opacity: 1;
}
```

- [ ] **Step 2: Verify in browser**

Open `index.html`. Should see: full dark layout with header, track bar area, empty grid, and controls bar. Resize to mobile width (375px) — layout should fill the viewport without scrolling.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add dark theme CSS styles

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: API module — Radio Record data fetching

**Files:**
- Modify: `js/api.js` (full implementation)

**Interface produces:**
- `API.fetchStations()` → `Promise<Station[]>` — each station: `{id, title, svg_fill, svg_outline, stream_64, stream_128, stream_320, stream_hls, genre}`
- `API.fetchNowPlaying()` → `Promise<NowPlaying[]>` — each entry: `{id: number, track: {artist, song}}`

- [ ] **Step 1: Implement `js/api.js`**

```js
'use strict';

const API = (() => {
  const STATIONS_URL = 'https://www.radiorecord.ru/api/stations';
  const NOW_URL = 'https://www.radiorecord.ru/api/stations/now/';

  /**
   * Fetch all available radio stations
   * @returns {Promise<Array>} Array of station objects
   */
  async function fetchStations() {
    const response = await fetch(STATIONS_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const raw = data.result?.stations || [];

    return raw.map(s => ({
      id: s.id,
      prefix: s.prefix,
      title: s.title,
      tooltip: s.tooltip,
      svg_fill: s.svg_fill || '',
      svg_outline: s.svg_outline || '',
      stream_64: s.stream_64 || '',
      stream_128: s.stream_128 || '',
      stream_320: s.stream_320 || '',
      stream_hls: s.stream_hls || '',
      genre: s.genre || null,
      bg_color: s.bg_color || null
    }));
  }

  /**
   * Fetch currently playing tracks for all stations
   * @returns {Promise<Array>} Array of {id, track: {artist, song, image200}}
   */
  async function fetchNowPlaying() {
    const response = await fetch(NOW_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const raw = data.result || [];

    return raw.map(entry => ({
      id: entry.id,
      track: {
        artist: entry.track?.artist || '',
        song: entry.track?.song || '',
        image200: entry.track?.image200 || ''
      }
    }));
  }

  return { fetchStations, fetchNowPlaying };
})();
```

- [ ] **Step 2: Verify — open browser console**

Open `index.html`, in console run:
```js
API.fetchStations().then(s => { console.log('Stations:', s.length, s[0].title); });
API.fetchNowPlaying().then(n => { console.log('Now playing:', n.length, n[0]?.track?.artist); });
```
Expected: 117 stations, first is "Record". Now playing returns array with track data.

- [ ] **Step 3: Commit**

```bash
git add js/api.js
git commit -m "feat: add API module for Radio Record data

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Player module — audio playback with auto quality switching

**Files:**
- Modify: `js/player.js` (full implementation)

**Interface produces:**
- `Player.play(station)` — start playback, auto quality fallback
- `Player.pause()` — pause current stream
- `Player.resume()` — resume paused stream
- `Player.stop()` — stop and reset
- `Player.next(stations, currentIndex)` → `number` — next station index
- `Player.prev(stations, currentIndex)` → `number` — previous station index
- `Player.setVolume(value)` — set volume 0..1
- `Player.getState()` → `{playing: boolean, stationId: number|null}`
- `Player.onStateChange(callback)` — register state listener
- `Player.onTrackUpdate(callback)` — register track update listener (fires from app.js polling, not internally)

- [ ] **Step 1: Implement `js/player.js`**

```js
'use strict';

const Player = (() => {
  let audio = null;
  let currentStation = null;
  let currentQualityIndex = 0; // 0=320, 1=128, 2=64
  let isPlaying = false;
  let volume = 0.7;
  let fallbackTimer = null;

  const stateListeners = [];
  const QUALITY_KEYS = ['stream_320', 'stream_128', 'stream_64'];

  function getAvailableStreams(station) {
    return QUALITY_KEYS
      .map(k => station[k])
      .filter(url => url && url.length > 0);
  }

  function notifyState() {
    const state = {
      playing: isPlaying,
      stationId: currentStation ? currentStation.id : null
    };
    stateListeners.forEach(fn => fn(state));
  }

  function clearFallbackTimer() {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
  }

  function setupAudioListeners(station) {
    if (!audio) return;

    audio.addEventListener('waiting', () => {
      // Buffer starvation — try lower quality
      fallbackTimer = setTimeout(() => {
        tryNextQuality(station);
      }, 3000); // 3s buffer wait before switching
    });

    audio.addEventListener('playing', () => {
      clearFallbackTimer();
    });

    audio.addEventListener('stalled', () => {
      tryNextQuality(station);
    });

    audio.addEventListener('error', () => {
      tryNextQuality(station);
    });
  }

  function tryNextQuality(station) {
    clearFallbackTimer();
    const streams = getAvailableStreams(station);
    const nextIndex = currentQualityIndex + 1;

    if (nextIndex < streams.length) {
      const wasPlaying = isPlaying;
      const currentTime = audio ? audio.currentTime : 0;
      const streamUrl = streams[nextIndex];

      if (audio) {
        audio.pause();
        audio = null;
      }

      currentQualityIndex = nextIndex;
      initAudio(streamUrl, station, currentTime, wasPlaying);
    }
    // If no more qualities to try, just keep retrying current
  }

  function initAudio(url, station, seekTime, autoPlay) {
    audio = new Audio(url);
    audio.setAttribute('playsinline', '');
    audio.volume = volume;
    setupAudioListeners(station);

    if (autoPlay) {
      audio.play().then(() => {
        audio.currentTime = seekTime;
        isPlaying = true;
        notifyState();
      }).catch(() => {
        // If play fails, try next quality immediately
        tryNextQuality(station);
      });
    }
  }

  function play(station) {
    stop();

    currentStation = station;
    currentQualityIndex = 0;

    const streams = getAvailableStreams(station);
    if (streams.length === 0) {
      console.error('No streams available for station:', station.title);
      return;
    }

    initAudio(streams[0], station, 0, true);
  }

  function pause() {
    if (audio && isPlaying) {
      audio.pause();
      isPlaying = false;
      clearFallbackTimer();
      notifyState();
    }
  }

  function resume() {
    if (audio && !isPlaying) {
      audio.play().then(() => {
        isPlaying = true;
        notifyState();
      }).catch(() => {});
    }
  }

  function stop() {
    clearFallbackTimer();
    if (audio) {
      audio.pause();
      audio.src = '';
      audio = null;
    }
    isPlaying = false;
    currentStation = null;
    currentQualityIndex = 0;
    notifyState();
  }

  function next(stations, currentIndex) {
    if (!stations.length) return -1;
    return (currentIndex + 1) % stations.length;
  }

  function prev(stations, currentIndex) {
    if (!stations.length) return -1;
    return (currentIndex - 1 + stations.length) % stations.length;
  }

  function setVolume(value) {
    volume = parseFloat(value);
    if (audio) {
      audio.volume = volume;
    }
  }

  function getState() {
    return {
      playing: isPlaying,
      stationId: currentStation ? currentStation.id : null
    };
  }

  function onStateChange(callback) {
    stateListeners.push(callback);
  }

  // No-op: track updates come from polling in app.js, Player just exposes state
  function onTrackUpdate(callback) {
    // Reserved for future use — audio metadata events
  }

  return {
    play, pause, resume, stop,
    next, prev,
    setVolume, getState,
    onStateChange, onTrackUpdate
  };
})();
```

- [ ] **Step 2: Verify — test in browser console**

Open `index.html`, in console:
```js
API.fetchStations().then(s => {
  window.testStation = s[0];
  Player.onStateChange(state => console.log('State:', state));
  Player.play(s[0]);
  // Should start playing audio
  setTimeout(() => Player.stop(), 5000);
});
```
Expected: audio starts playing. `State: {playing: true, stationId: 15016}` logged.

- [ ] **Step 3: Commit**

```bash
git add js/player.js
git commit -m "feat: add player module with auto quality switching

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: UI module — grid, drag-drop, modal, toast

**Files:**
- Modify: `js/ui.js` (full implementation)

**Interface produces:**
- `UI.renderGrid(stations, activeId, stationIndexMap)` — render 3-column grid
- `UI.updateTrackBar(artist, song, stationName)` — update track info display
- `UI.updatePlayButton(isPlaying)` — toggle play/pause icon
- `UI.showAddModal()` / `UI.hideAddModal()` — modal for custom station
- `UI.showToast(message)` — temporary notification
- `UI.initDragDrop(containerSelector, onReorder)` — setup touch/pointer drag-drop
- `UI.onStationClick(callback)` — register click handler for station cards

- [ ] **Step 1: Implement `js/ui.js`**

```js
'use strict';

const UI = (() => {
  let stationClickCallback = null;
  let modalSubmitCallback = null;

  function $(id) { return document.getElementById(id); }

  /* ===== Grid Rendering ===== */

  function renderGrid(stations, activeId, stationIndexMap) {
    const grid = $('stationsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    stations.forEach((station, displayIndex) => {
      const card = document.createElement('div');
      card.className = 'station-card';
      card.dataset.index = displayIndex;
      card.dataset.stationId = station.id;

      if (station.isCustom) {
        // Custom station — letter avatar, no SVG
        const avatar = document.createElement('div');
        avatar.className = 'station-avatar';
        avatar.textContent = (station.title || '?')[0].toUpperCase();
        card.appendChild(avatar);
      } else {
        // API station — use SVG
        const svgStr = station.svg_fill || station.svg_outline || '';
        if (svgStr) {
          const wrapper = document.createElement('div');
          wrapper.className = 'station-icon-wrapper';
          wrapper.innerHTML = svgStr;
          const svg = wrapper.querySelector('svg');
          if (svg) {
            svg.classList.add('station-icon');
            svg.setAttribute('width', '36');
            svg.setAttribute('height', '36');
            card.appendChild(svg);
          }
        }
      }

      const nameEl = document.createElement('span');
      nameEl.className = 'card-name';
      nameEl.textContent = station.title;
      card.appendChild(nameEl);

      if (station.id === activeId) {
        card.classList.add('active');
      }

      card.addEventListener('click', () => {
        if (stationClickCallback) {
          stationClickCallback(station, displayIndex);
        }
      });

      grid.appendChild(card);
    });
  }

  function highlightActive(activeId) {
    document.querySelectorAll('.station-card').forEach(card => {
      card.classList.toggle('active',
        parseInt(card.dataset.stationId) === activeId);
    });
  }

  /* ===== Track Bar ===== */

  function updateTrackBar(artist, song, stationName) {
    const info = $('trackInfo');
    const name = $('stationName');
    if (info) {
      if (artist && song) {
        info.textContent = `${artist} — ${song}`;
      } else if (stationName) {
        info.textContent = 'Загрузка...';
      } else {
        info.textContent = 'Выберите станцию';
      }
    }
    if (name) {
      name.textContent = stationName || '';
    }
  }

  /* ===== Play Button ===== */

  function updatePlayButton(isPlaying) {
    const btn = $('playBtn');
    const icon = $('playIcon');
    if (!btn || !icon) return;

    if (isPlaying) {
      icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    } else {
      icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }
  }

  /* ===== Modal ===== */

  function showAddModal() {
    const modal = $('addModal');
    const input = $('addUrlInput');
    if (modal) modal.style.display = 'flex';
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
  }

  function hideAddModal() {
    const modal = $('addModal');
    if (modal) modal.style.display = 'none';
  }

  function onModalSubmit(callback) {
    modalSubmitCallback = callback;
  }

  /* ===== Toast ===== */

  function showToast(message) {
    let toast = $('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  /* ===== Station Click Handler ===== */

  function onStationClick(callback) {
    stationClickCallback = callback;
  }

  /* ===== Drag & Drop ===== */

  function initDragDrop(containerSelector, onReorder) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    let dragEl = null;
    let dragIndex = -1;
    let dropIndex = -1;

    function getCardIndex(el) {
      const card = el.closest('.station-card');
      if (!card) return -1;
      return parseInt(card.dataset.index);
    }

    function handleDragStart(e) {
      const card = e.target.closest('.station-card');
      if (!card) return;
      // Don't drag custom stations
      const idx = parseInt(card.dataset.index);
      if (idx === -1) return;

      dragEl = card;
      dragIndex = idx;
      dragEl.classList.add('dragging');

      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
      }
    }

    function handleDragOver(e) {
      e.preventDefault();
      if (!dragEl) return;
      const card = e.target.closest('.station-card');
      if (!card || card === dragEl) return;

      // Clear previous drag-over
      container.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));

      dropIndex = parseInt(card.dataset.index);

      // Don't allow dropping on custom stations (they stay at top)
      if (card.querySelector('.station-avatar')) {
        dropIndex = 0;
      }

      card.classList.add('drag-over');
    }

    function handleDrop(e) {
      e.preventDefault();
      if (!dragEl) return;

      dragEl.classList.remove('dragging');
      container.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));

      if (dragIndex !== dropIndex && dropIndex !== -1 && dragIndex !== -1) {
        onReorder(dragIndex, dropIndex);
      }

      dragEl = null;
      dragIndex = -1;
      dropIndex = -1;
    }

    function handleDragEnd() {
      if (dragEl) {
        dragEl.classList.remove('dragging');
        container.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
        dragEl = null;
        dragIndex = -1;
        dropIndex = -1;
      }
    }

    // Touch drag-and-drop
    let touchDragEl = null;
    let touchStartIndex = -1;
    let touchClone = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    const LONG_PRESS_MS = 400;
    let longPressTimer = null;

    container.addEventListener('touchstart', (e) => {
      const card = e.target.closest('.station-card');
      if (!card || card.querySelector('.station-avatar')) return;

      touchDragEl = card;
      touchStartIndex = parseInt(card.dataset.index);
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchMoved = false;

      longPressTimer = setTimeout(() => {
        touchMoved = true;
        touchDragEl.classList.add('dragging');
        // Vibrate on drag start (if supported)
        if (navigator.vibrate) navigator.vibrate(10);
      }, LONG_PRESS_MS);
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
      if (!touchDragEl || !touchMoved) {
        // If finger moved significantly, cancel long press (it's a scroll)
        if (touchDragEl && !touchMoved) {
          const dx = e.touches[0].clientX - touchStartX;
          const dy = e.touches[0].clientY - touchStartY;
          if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            clearTimeout(longPressTimer);
            touchDragEl = null;
          }
        }
        return;
      }
      e.preventDefault();

      const touch = e.touches[0];
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const cardUnder = elements.find(el => el.classList.contains('station-card'));

      container.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));

      if (cardUnder && cardUnder !== touchDragEl) {
        cardUnder.classList.add('drag-over');
        dropIndex = parseInt(cardUnder.dataset.index);
      }
    }, { passive: false });

    container.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);

      if (touchDragEl && touchMoved) {
        touchDragEl.classList.remove('dragging');
        container.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));

        if (touchStartIndex !== dropIndex && dropIndex !== -1 && touchStartIndex !== -1) {
          onReorder(touchStartIndex, dropIndex);
        }
      }

      touchDragEl = null;
      touchStartIndex = -1;
      dropIndex = -1;
      touchMoved = false;
    });

    // Mouse drag-and-drop (desktop fallback)
    container.addEventListener('dragstart', handleDragStart);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
    container.addEventListener('dragend', handleDragEnd);
  }

  /* ===== Modal events ===== */
  document.addEventListener('DOMContentLoaded', () => {
    const modal = $('addModal');
    const input = $('addUrlInput');
    const submitBtn = $('addSubmitBtn');

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) hideAddModal();
      });
    }

    if (submitBtn && input) {
      submitBtn.addEventListener('click', () => {
        const url = input.value.trim();
        if (url && modalSubmitCallback) {
          modalSubmitCallback(url);
        }
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const url = input.value.trim();
          if (url && modalSubmitCallback) {
            modalSubmitCallback(url);
          }
        }
      });
    }
  });

  return {
    renderGrid,
    highlightActive,
    updateTrackBar,
    updatePlayButton,
    showAddModal,
    hideAddModal,
    onModalSubmit,
    showToast,
    onStationClick,
    initDragDrop
  };
})();
```

- [ ] **Step 2: Verify — test render in browser console**

Open `index.html`, in console:
```js
API.fetchStations().then(stations => {
  UI.renderGrid(stations.slice(0, 12), null);
  console.log('Grid rendered with', document.querySelectorAll('.station-card').length, 'cards');
});
UI.updateTrackBar('ARTIST', 'SONG', 'Record');
UI.updatePlayButton(true);
UI.showToast('Test notification');
```
Expected: 12 cards in grid with SVG icons, track bar updated, play button shows pause icon, toast appears.

- [ ] **Step 3: Commit**

```bash
git add js/ui.js
git commit -m "feat: add UI module with grid, drag-drop, and modal

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: App module — initialization and coordination

**Files:**
- Modify: `js/app.js` (full implementation)

**Interface produces:**
- `App.init()` — main entry point, called on DOMContentLoaded

- [ ] **Step 1: Implement `js/app.js`**

```js
'use strict';

const App = (() => {
  const STORAGE_KEY_CUSTOM = 'radio_custom_stations';
  const STORAGE_KEY_ORDER = 'radio_station_order';
  const STORAGE_KEY_LAST = 'radio_last_station';
  const STORAGE_KEY_VOLUME = 'radio_volume';
  const POLL_INTERVAL = 10000; // 10 seconds

  // State
  let apiStations = [];
  let customStations = [];
  let mergedStations = [];  // custom first, then API in saved order
  let currentIndex = -1;
  let nowPlayingData = [];
  let pollTimer = null;

  /* ===== Data Helpers ===== */

  function loadCustomStations() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM)) || [];
    } catch { return []; }
  }

  function saveCustomStations() {
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(customStations));
  }

  function loadStationOrder() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_ORDER)) || [];
    } catch { return []; }
  }

  function saveStationOrder(order) {
    localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(order));
  }

  function extractDomainName(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch { return url; }
  }

  function isValidUrl(url) {
    try { new URL(url); return true; } catch { return false; }
  }

  /* ===== Station Merging ===== */

  function mergeStations() {
    const savedOrder = loadStationOrder();
    const customIds = new Set(customStations.map((s, i) => 'custom_' + i));

    // Build custom station display objects
    const customDisplay = customStations.map((cs, i) => ({
      id: 'custom_' + i,
      _realIndex: i,
      title: cs.name || extractDomainName(cs.url),
      url: cs.url,
      isCustom: true,
      svg_fill: '',
      svg_outline: '',
      stream_320: cs.url,
      stream_128: cs.url,
      stream_64: cs.url,
      stream_hls: ''
    }));

    // Order API stations by saved order, then by original sort
    const apiOrderMap = new Map();
    savedOrder.forEach((id, idx) => apiOrderMap.set(id, idx));

    const orderedApi = [...apiStations].sort((a, b) => {
      const aOrder = apiOrderMap.has(a.id) ? apiOrderMap.get(a.id) : 9999;
      const bOrder = apiOrderMap.has(b.id) ? apiOrderMap.get(b.id) : 9999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return 0;
    });

    // Custom stations first, then API stations
    mergedStations = [...customDisplay, ...orderedApi];
  }

  /* ===== Now Playing Polling ===== */

  async function pollNowPlaying() {
    try {
      nowPlayingData = await API.fetchNowPlaying();
      updateCurrentTrack();
    } catch (e) {
      console.warn('Now-playing poll failed:', e.message);
    }
  }

  function updateCurrentTrack() {
    if (currentIndex < 0 || !mergedStations[currentIndex]) return;

    const station = mergedStations[currentIndex];
    if (station.isCustom) {
      UI.updateTrackBar('', '', station.title);
      return;
    }

    const now = nowPlayingData.find(n => n.id === station.id);
    if (now && now.track) {
      UI.updateTrackBar(now.track.artist, now.track.song, station.title);
    } else {
      UI.updateTrackBar('', '', station.title);
    }
  }

  function startPolling() {
    stopPolling();
    pollNowPlaying(); // Immediate first poll
    pollTimer = setInterval(pollNowPlaying, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  /* ===== Playback ===== */

  function playStationByIndex(index) {
    if (index < 0 || index >= mergedStations.length) return;

    currentIndex = index;
    const station = mergedStations[index];

    if (station.isCustom) {
      // For custom stations, create a simple station object with the URL
      Player.play({
        id: station.id,
        title: station.title,
        stream_320: station.url,
        stream_128: station.url,
        stream_64: station.url
      });
    } else {
      Player.play(station);
    }

    localStorage.setItem(STORAGE_KEY_LAST, String(index));
    UI.highlightActive(station.id);
    updateCurrentTrack();
  }

  function handleStationClick(station, displayIndex) {
    if (currentIndex === displayIndex && Player.getState().playing) {
      // Same station — toggle pause
      Player.pause();
    } else if (currentIndex === displayIndex && !Player.getState().playing) {
      // Same station — resume
      Player.resume();
    } else {
      // Different station — play
      playStationByIndex(displayIndex);
    }
  }

  function handlePrevNext(direction) {
    if (!mergedStations.length) return;
    const newIndex = direction === 'next'
      ? Player.next(mergedStations, currentIndex)
      : Player.prev(mergedStations, currentIndex);
    playStationByIndex(newIndex);
  }

  /* ===== Drag & Drop Reorder ===== */

  function handleReorder(fromIndex, toIndex) {
    // Only reorder API stations (skip custom stations at the top)
    const customCount = customStations.length;
    if (fromIndex < customCount || toIndex < customCount) return;

    const moved = mergedStations.splice(fromIndex, 1)[0];
    mergedStations.splice(toIndex, 0, moved);

    // Update currentIndex if needed
    if (currentIndex === fromIndex) {
      currentIndex = toIndex;
    } else if (currentIndex > fromIndex && currentIndex <= toIndex) {
      currentIndex--;
    } else if (currentIndex < fromIndex && currentIndex >= toIndex) {
      currentIndex++;
    }

    // Save new order of API station IDs
    const apiIds = mergedStations
      .filter(s => !s.isCustom)
      .map(s => s.id);
    saveStationOrder(apiIds);

    // Re-render
    UI.renderGrid(mergedStations,
      currentIndex >= 0 ? mergedStations[currentIndex]?.id : null);
  }

  /* ===== Custom Station Modal ===== */

  function handleAddStation(url) {
    if (!isValidUrl(url)) {
      UI.showToast('Некорректный URL');
      return;
    }

    const name = extractDomainName(url);
    customStations.push({ name, url });
    saveCustomStations();
    mergeStations();

    UI.renderGrid(mergedStations,
      currentIndex >= 0 ? mergedStations[currentIndex]?.id : null);
    UI.hideAddModal();
    UI.showToast('Станция добавлена');
  }

  /* ===== Volume ===== */

  function handleVolumeChange(value) {
    Player.setVolume(value);
    localStorage.setItem(STORAGE_KEY_VOLUME, value);
  }

  /* ===== Init ===== */

  async function init() {
    // Load custom stations
    customStations = loadCustomStations();

    // Load saved volume
    const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (savedVolume !== null) {
      const volSlider = document.getElementById('volumeSlider');
      if (volSlider) volSlider.value = savedVolume;
      Player.setVolume(parseFloat(savedVolume));
    }

    // Fetch API stations
    try {
      UI.updateTrackBar('', '', 'Загрузка станций...');
      apiStations = await API.fetchStations();
    } catch (e) {
      console.error('Failed to fetch stations:', e);
      UI.updateTrackBar('', '', 'Ошибка загрузки');
      UI.showToast('Не удалось загрузить станции');
      apiStations = [];
    }

    // Merge and render
    mergeStations();
    UI.renderGrid(mergedStations, null);

    // Set up drag & drop
    UI.initDragDrop('#stationsGrid', handleReorder);

    // Set up station click handler
    UI.onStationClick(handleStationClick);

    // Set up modal
    UI.onModalSubmit(handleAddStation);

    // Connect UI buttons
    document.getElementById('playBtn').addEventListener('click', () => {
      if (currentIndex < 0 && mergedStations.length > 0) {
        playStationByIndex(0);
      } else if (Player.getState().playing) {
        Player.pause();
      } else if (currentIndex >= 0) {
        Player.resume();
      }
    });

    document.getElementById('prevBtn').addEventListener('click', () => {
      handlePrevNext('prev');
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
      handlePrevNext('next');
    });

    document.getElementById('addBtn').addEventListener('click', () => {
      UI.showAddModal();
    });

    document.getElementById('volumeSlider').addEventListener('input', (e) => {
      handleVolumeChange(e.target.value);
    });

    // Player state listener
    Player.onStateChange((state) => {
      UI.updatePlayButton(state.playing);
      if (state.playing) {
        startPolling();
      } else {
        stopPolling();
      }
    });

    // Restore last station
    const lastIndex = localStorage.getItem(STORAGE_KEY_LAST);
    if (lastIndex !== null && mergedStations[parseInt(lastIndex)]) {
      // Don't auto-play, just restore UI state
      currentIndex = parseInt(lastIndex);
      const station = mergedStations[currentIndex];
      UI.highlightActive(station.id);
      UI.updateTrackBar('', '', station.title);
      document.getElementById('playBtn').click();
    }

    // PWA install prompt
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // Minimal: just save for browser to offer
    });
  }

  // Auto-init
  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
```

- [ ] **Step 2: Verify full app flow**

Open `index.html`:
1. Grid should load 117 stations from API
2. Click a station card → starts playing, track bar updates after poll
3. Click play/pause button → toggles playback
4. Click prev/next → switches stations
5. Click `+` → modal opens, enter URL → adds custom station at top
6. Custom station shows letter avatar, plays from entered URL
7. Long-press an API station card → drag to reorder
8. Refresh page → order and custom stations persist

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: add app module with init, polling, and coordination

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Integration, cleanup, and final verification

**Files:**
- Modify: `index.html` (add toast element if missing, verify all IDs match)
- No new files

- [ ] **Step 1: Verify all HTML IDs match between index.html and JS modules**

Cross-check:
- `#header`, `#addBtn` — used by app.js
- `#trackBar`, `#trackInfo`, `#stationName` — used by ui.js
- `#stationsGrid` — used by ui.js, app.js
- `#controlsBar`, `#volumeRow`, `#volumeSlider` — used by app.js
- `#btnRow`, `#playBtn`, `#playIcon`, `#prevBtn`, `#nextBtn` — used by app.js, ui.js
- `#addModal`, `#addUrlInput`, `#addSubmitBtn` — used by ui.js, app.js
- `#volLow`, `#volHigh` — static SVG elements in index.html

- [ ] **Step 2: Open in browser, test end-to-end against spec**

Checklist:
- [ ] Dark theme renders correctly
- [ ] 3-column grid shows Radio Record stations with SVG icons
- [ ] Click station → plays audio
- [ ] Track bar updates with ARTIST — SONG within 10 seconds
- [ ] Play/pause button toggles correctly
- [ ] Prev/next switch stations
- [ ] Volume slider works
- [ ] Long-press drag-and-drop reorders API stations
- [ ] `+` button opens modal, adding URL creates custom station
- [ ] Custom station appears first with letter avatar
- [ ] Custom station plays from URL
- [ ] No emojis anywhere in UI
- [ ] Refresh preserves order, custom stations, last station
- [ ] Stream quality auto-switches on poor connection (test by throttling in DevTools)

- [ ] **Step 3: Fix any issues found, commit**

```bash
git add -A
git commit -m "chore: final integration fixes and verification

Co-Authored-By: Claude <noreply@anthropic.com>"
```
