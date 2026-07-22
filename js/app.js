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
  let pollInFlight = false;
  let pollAbortController = null;  // Abort in-flight fetch on station switch

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
    if (pollInFlight) return;
    pollInFlight = true;
    try {
      nowPlayingData = await API.fetchNowPlaying(pollAbortController?.signal);
      updateCurrentTrack();
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('Now-playing poll failed:', e.message);
      }
    } finally {
      pollInFlight = false;
    }
  }

  function updateCurrentTrack() {
    if (currentIndex < 0 || !mergedStations[currentIndex]) return;

    const station = mergedStations[currentIndex];
    if (station.isCustom) {
      UI.updateTrackBar(station.title, '', '');
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
    pollAbortController = new AbortController();
    pollNowPlaying(); // Immediate first poll
    pollTimer = setInterval(pollNowPlaying, POLL_INTERVAL);
  }

  function stopPolling() {
    // Abort any in-flight fetch when switching stations
    if (pollAbortController) {
      pollAbortController.abort();
      pollAbortController = null;
    }
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

    localStorage.setItem(STORAGE_KEY_LAST, station.id);
    UI.highlightActive(station.id);
    UI.toggleDeleteBtn(!!station.isCustom);
    UI.toggleEditBtn(!!station.isCustom);
    updateCurrentTrack();
  }

  function handleStationClick(station, displayIndex) {
    if (currentIndex === displayIndex && Player.getState().playing) {
      // Same station — toggle pause
      Player.pause();
    } else {
      // Different station, or same station but paused — (re)start playback
      // Always use playStationByIndex to avoid race with in-progress loading
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
    if (fromIndex < toIndex) toIndex--;
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

  function handleAddStation({ name, url }) {
    if (!isValidUrl(url)) {
      UI.showToast('Некорректный URL');
      return;
    }

    customStations.push({ name, url });
    saveCustomStations();
    mergeStations();

    // Custom station was appended within the custom-station block,
    // shifting API station indices by one. Adjust currentIndex if it
    // was pointing at an API station (index >= old custom count).
    const oldCustomCount = customStations.length - 1; // before push
    if (currentIndex >= oldCustomCount) {
      currentIndex += 1;
    }

    UI.renderGrid(mergedStations,
      currentIndex >= 0 ? mergedStations[currentIndex]?.id : null);
    UI.hideAddModal();
    UI.showToast('Станция добавлена');
  }

  /* ===== Edit Custom Station ===== */

  function handleEditStation({ name, url }) {
    if (currentIndex < 0) return;
    const station = mergedStations[currentIndex];
    if (!station.isCustom) return;

    if (!isValidUrl(url)) {
      UI.showToast('Некорректный URL');
      return;
    }

    // Update customStations
    customStations[station._realIndex] = { name, url };
    saveCustomStations();

    // Rebuild merged list and find the edited station
    mergeStations();
    const idx = mergedStations.findIndex(s => s.id === station.id);
    if (idx !== -1) {
      currentIndex = idx;
      updateCurrentTrack();
    }

    UI.renderGrid(mergedStations, station.id);
    UI.hideAddModal();
    UI.showToast('Станция обновлена');
  }

  /* ===== Delete Custom Station ===== */

  function handleDeleteStation() {
    if (currentIndex < 0) return;
    const station = mergedStations[currentIndex];
    if (!station.isCustom) return;

    if (!confirm('Удалить станцию «' + station.title + '»?')) return;

    // Stop playback if this station is playing
    Player.stop();

    // Remove from customStations array
    customStations.splice(station._realIndex, 1);
    saveCustomStations();

    // Reset state
    currentIndex = -1;
    stopPolling();

    // Rebuild merged list and re-render
    mergeStations();
    UI.renderGrid(mergedStations, null);
    UI.updateTrackBar('', '', 'Выберите станцию');
    UI.updatePlayButton(false);
    UI.toggleDeleteBtn(false);
    UI.toggleEditBtn(false);

    localStorage.removeItem(STORAGE_KEY_LAST);
    UI.showToast('Станция удалена');
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

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
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

    // Set up station click handler BEFORE render (so cards get the callback)
    UI.onStationClick(handleStationClick);

    // Set up modal
    UI.onModalSubmit(handleAddStation);
    UI.onModalEdit(handleEditStation);

    // Listen for stream exhaustion events
    window.addEventListener('player-stream-exhausted', (e) => {
      UI.showToast('Не удалось воспроизвести: ' + e.detail.title);
    });

    // Listen for autoplay block events
    window.addEventListener('player-autoplay-blocked', () => {
      UI.showToast('Нажмите Play для начала воспроизведения');
    });

    UI.renderGrid(mergedStations, null);

    // Set up drag & drop
    UI.initDragDrop('#stationsGrid', handleReorder);

    // Connect UI buttons
    document.getElementById('playBtn').addEventListener('click', () => {
      if (currentIndex < 0 && mergedStations.length > 0) {
        playStationByIndex(0);
      } else if (Player.getState().playing) {
        Player.pause();
      } else if (currentIndex >= 0) {
        // Use playStationByIndex instead of resume() — avoids race
        // with concurrent play()/fallback on the same Audio element
        playStationByIndex(currentIndex);
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

    document.getElementById('deleteBtn').addEventListener('click', () => {
      handleDeleteStation();
    });

    document.getElementById('editBtn').addEventListener('click', () => {
      if (currentIndex < 0) return;
      const station = mergedStations[currentIndex];
      if (!station.isCustom) return;
      UI.showEditModal(station.title, station.url);
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

    // Restore last station (highlight only, don't auto-play)
    const lastId = localStorage.getItem(STORAGE_KEY_LAST);
    if (lastId) {
      const lastIdx = mergedStations.findIndex(s => String(s.id) === String(lastId));
      if (lastIdx !== -1) {
        currentIndex = lastIdx;
        const station = mergedStations[currentIndex];
        UI.highlightActive(station.id);
        UI.toggleDeleteBtn(!!station.isCustom);
        UI.toggleEditBtn(!!station.isCustom);
        UI.updateTrackBar('', '', station.title);
      }
    }
  }

  // Auto-init
  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
