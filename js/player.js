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

    audio = new Audio(url);
    audio.setAttribute('playsinline', '');
    audio.volume = volume;
    _track(audio);

    audio.play().then(() => {
      if (generation !== gen) return;
      isPlaying = true;
      notifyState();
    }).catch((err) => {
      if (generation !== gen) { _destroyOne(audio); return; }
      if (err.name === 'NotAllowedError') {
        _destroyOne(audio);
        isPlaying = false;
        currentStation = null;
        notifyState();
        window.dispatchEvent(new CustomEvent('player-autoplay-blocked'));
        return;
      }
      _tryFallback(station, gen);
    });
  }

  function _tryFallback(station, gen) {
    if (generation !== gen) return;

    const urls = [station.stream_128, station.stream_64].filter(u => u);
    if (!urls.length) {
      _destroyOne(audio);
      _stopInternal(gen);
      window.dispatchEvent(new CustomEvent('player-stream-exhausted', {
        detail: { stationId: station.id, title: station.title }
      }));
      return;
    }

    // Stop the failed audio before trying next quality
    if (audio) _destroyOne(audio);

    audio = new Audio(urls[0]);
    audio.setAttribute('playsinline', '');
    audio.volume = volume;
    _track(audio);

    audio.play().then(() => {
      if (generation !== gen) return;
      isPlaying = true;
      notifyState();
    }).catch(() => {
      if (generation !== gen) { _destroyOne(audio); return; }
      // Try last resort (64)
      const lastUrl = station.stream_64;
      if (lastUrl && lastUrl !== urls[0]) {
        if (audio) _destroyOne(audio);
        audio = new Audio(lastUrl);
        audio.setAttribute('playsinline', '');
        audio.volume = volume;
        _track(audio);
        audio.play().then(() => {
          if (generation !== gen) return;
          isPlaying = true;
          notifyState();
        }).catch(() => {
          if (generation !== gen) { _destroyOne(audio); return; }
          _destroyOne(audio);
          _stopInternal(gen);
          window.dispatchEvent(new CustomEvent('player-stream-exhausted', {
            detail: { stationId: station.id, title: station.title }
          }));
        });
      } else {
        _destroyOne(audio);
        _stopInternal(gen);
        window.dispatchEvent(new CustomEvent('player-stream-exhausted', {
          detail: { stationId: station.id, title: station.title }
        }));
      }
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
    const gen = ++generation;

    audio.play().then(() => {
      if (generation !== gen) return;
      isPlaying = true;
      notifyState();
    }).catch((err) => {
      if (generation !== gen) return;
      if (err.name === 'NotAllowedError') {
        _stopInternal(gen);
        window.dispatchEvent(new CustomEvent('player-autoplay-blocked'));
      }
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
