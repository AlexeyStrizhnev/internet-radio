'use strict';

const Player = (() => {
  let audio = null;
  let currentStation = null;
  let isPlaying = false;
  let volume = 0.7;
  let generation = 0;

  const stateListeners = [];

  function notifyState() {
    stateListeners.forEach(fn => fn({
      playing: isPlaying,
      stationId: currentStation ? currentStation.id : null
    }));
  }

  /* Clean up current audio element without touching generation/state */
  function _cleanupAudio() {
    if (audio) {
      audio.pause();
      audio.src = '';
      audio.load();
      audio = null;
    }
  }

  function play(station) {
    // Clean up previous audio
    _cleanupAudio();

    const gen = ++generation;
    currentStation = station;
    isPlaying = false;
    notifyState();

    // Pick the best available stream (prefer 320)
    const url = station.stream_320 || station.stream_128 || station.stream_64;
    if (!url) {
      console.error('No stream for:', station.title);
      return;
    }

    // Create fresh Audio — simple, reliable
    audio = new Audio(url);
    audio.setAttribute('playsinline', '');
    audio.volume = volume;

    audio.play().then(() => {
      if (generation !== gen) return;
      isPlaying = true;
      notifyState();
    }).catch((err) => {
      if (generation !== gen) return;
      // If browser blocked autoplay, stop and wait for user tap
      if (err.name === 'NotAllowedError') {
        audio = null;
        isPlaying = false;
        currentStation = null;
        notifyState();
        window.dispatchEvent(new CustomEvent('player-autoplay-blocked'));
        return;
      }
      // Stream error — try 128, then 64
      _tryFallback(station, gen);
    });
  }

  function _tryFallback(station, gen) {
    if (generation !== gen) return;

    const urls = [station.stream_128, station.stream_64].filter(u => u);
    if (!urls.length) {
      _stopInternal(gen);
      window.dispatchEvent(new CustomEvent('player-stream-exhausted', {
        detail: { stationId: station.id, title: station.title }
      }));
      return;
    }

    _cleanupAudio();

    audio = new Audio(urls[0]);
    audio.setAttribute('playsinline', '');
    audio.volume = volume;

    audio.play().then(() => {
      if (generation !== gen) return;
      isPlaying = true;
      notifyState();
    }).catch(() => {
      if (generation !== gen) return;
      // Try last resort (64)
      const lastUrl = station.stream_64;
      if (lastUrl && lastUrl !== urls[0]) {
        _cleanupAudio();
        audio = new Audio(lastUrl);
        audio.setAttribute('playsinline', '');
        audio.volume = volume;
        audio.play().then(() => {
          if (generation !== gen) return;
          isPlaying = true;
          notifyState();
        }).catch(() => {
          if (generation !== gen) return;
          _stopInternal(gen);
          window.dispatchEvent(new CustomEvent('player-stream-exhausted', {
            detail: { stationId: station.id, title: station.title }
          }));
        });
      } else {
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
    _cleanupAudio();
    isPlaying = false;
    currentStation = null;
    notifyState();
  }

  /* Internal stop that checks generation — used by fallback chains */
  function _stopInternal(gen) {
    if (generation !== gen) return;
    _cleanupAudio();
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
