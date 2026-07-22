'use strict';

const Player = (() => {
  let audio = null;
  let currentStation = null;
  let isPlaying = false;
  let volume = 0.7;
  let generation = 0;

  const _activeAudios = new Set();
  const stateListeners = [];

  function notifyState() {
    stateListeners.forEach(fn => fn({
      playing: isPlaying,
      stationId: currentStation ? currentStation.id : null
    }));
  }

  /* Track Audio element so we can destroy it on station switch */
  function _track(a) {
    _activeAudios.add(a);
  }

  /* Destroy ALL Audio elements — nuclear cleanup on station switch */
  function _destroyAll() {
    for (const a of _activeAudios) {
      try { a.pause(); } catch (_) {}
      try { a.src = ''; } catch (_) {}
      try { a.load(); } catch (_) {}
    }
    _activeAudios.clear();
    audio = null;
  }

  /* Destroy one specific Audio and remove from tracking */
  function _destroyOne(a) {
    try { a.pause(); } catch (_) {}
    try { a.src = ''; } catch (_) {}
    try { a.load(); } catch (_) {}
    _activeAudios.delete(a);
    if (audio === a) audio = null;
  }

  function play(station) {
    // NUCLEAR: kill every Audio from previous station
    _destroyAll();

    const gen = ++generation;
    currentStation = station;
    isPlaying = false;
    notifyState();

    const url = station.stream_320 || station.stream_128 || station.stream_64;
    if (!url) {
      console.error('No stream for:', station.title);
      return;
    }

    // Use local `el` ref so catch handlers always reference the right element
    const el = new Audio(url);
    el.setAttribute('playsinline', '');
    el.volume = volume;
    _track(el);
    audio = el;

    el.play().then(() => {
      if (generation !== gen) { _destroyOne(el); return; }
      isPlaying = true;
      notifyState();
    }).catch((err) => {
      if (generation !== gen) { _destroyOne(el); return; }
      console.error('Player: play() failed for', station.title,
        'url:', url, 'error:', err.name, err.message);
      if (err.name === 'NotAllowedError') {
        _destroyOne(el);
        isPlaying = false;
        currentStation = null;
        notifyState();
        window.dispatchEvent(new CustomEvent('player-autoplay-blocked'));
        return;
      }
      _tryFallback(el, station, gen, [url]);
    });
  }

  function _tryFallback(lastEl, station, gen, triedUrls) {
    if (generation !== gen) { _destroyOne(lastEl); return; }

    // Collect remaining URLs that haven't been tried yet
    const fallbackUrls = [station.stream_128, station.stream_64].filter(
      u => u && !triedUrls.includes(u)
    );
    if (!fallbackUrls.length) {
      _destroyOne(lastEl);
      _stopInternal(gen);
      console.error('Player: all URLs exhausted for', station.title,
        'tried:', triedUrls);
      window.dispatchEvent(new CustomEvent('player-stream-exhausted', {
        detail: { stationId: station.id, title: station.title }
      }));
      return;
    }

    _destroyOne(lastEl);

    const nextUrl = fallbackUrls[0];
    const nextTried = triedUrls.concat(nextUrl);
    const el = new Audio(nextUrl);
    el.setAttribute('playsinline', '');
    el.volume = volume;
    _track(el);
    audio = el;

    el.play().then(() => {
      if (generation !== gen) { _destroyOne(el); return; }
      isPlaying = true;
      notifyState();
    }).catch((err) => {
      if (generation !== gen) { _destroyOne(el); return; }
      console.error('Player: fallback failed for', station.title,
        'url:', nextUrl, 'error:', err.name, err.message);
      _tryFallback(el, station, gen, nextTried);
    });
  }

  function pause() {
    if (audio && isPlaying) {
      generation++;
      audio.pause();
      isPlaying = false;
      notifyState();
    }
  }

  function resume() {
    if (!audio || isPlaying) return;
    const el = audio;
    // If audio is already loading/playing (play() or _tryFallback in progress),
    // don't interfere — the existing promise chain handles it
    if (!el.paused) return;

    const gen = ++generation;

    el.play().then(() => {
      if (generation !== gen) return;
      isPlaying = true;
      notifyState();
    }).catch((err) => {
      if (generation !== gen) return;
      console.error('Player: resume() failed, error:', err.name, err.message);
      if (err.name === 'NotAllowedError') {
        _stopInternal(gen);
        window.dispatchEvent(new CustomEvent('player-autoplay-blocked'));
        return;
      }
      // Old audio element is dead (stream dropped, 404, etc.)
      // Destroy it and re-init via play() with full fallback support
      const st = currentStation;
      _destroyOne(el);
      if (st) play(st);
    });
  }

  function stop() {
    generation++;
    _destroyAll();
    isPlaying = false;
    currentStation = null;
    notifyState();
  }

  function _stopInternal(gen) {
    if (generation !== gen) return;
    _destroyAll();
    isPlaying = false;
    currentStation = null;
    notifyState();
  }

  function next(stations, idx) {
    return stations.length ? (idx + 1) % stations.length : -1;
  }

  function prev(stations, idx) {
    return stations.length ? (idx - 1 + stations.length) % stations.length : -1;
  }

  function setVolume(value) {
    const parsed = parseFloat(value);
    volume = isNaN(parsed) ? 0.7 : Math.max(0, Math.min(1, parsed));
    if (audio) audio.volume = volume;
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

  function onTrackUpdate() {}

  return {
    play, pause, resume, stop,
    next, prev,
    setVolume, getState,
    onStateChange, onTrackUpdate
  };
})();
