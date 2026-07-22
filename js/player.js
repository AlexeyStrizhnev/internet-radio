'use strict';

const Player = (() => {
  let audio = null;
  let currentStation = null;
  let currentQualityIndex = 0;
  let isPlaying = false;
  let volume = 0.7;
  let fallbackTimer = null;
  let generation = 0;

  const stateListeners = [];
  const QUALITY_KEYS = ['stream_320', 'stream_128', 'stream_64'];

  // Single reusable Audio element — avoids teardown/creation race
  function getAudio() {
    if (!audio) {
      audio = new Audio();
      audio.setAttribute('playsinline', '');
      audio.volume = volume;
    }
    return audio;
  }

  function getAvailableStreams(station) {
    return QUALITY_KEYS
      .map(k => station[k])
      .filter(url => url && url.length > 0);
  }

  function notifyState() {
    stateListeners.forEach(fn => fn({
      playing: isPlaying,
      stationId: currentStation ? currentStation.id : null
    }));
  }

  function clearFallbackTimer() {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
  }

  function removeListeners(el) {
    if (!el._listeners) return;
    el.removeEventListener('waiting', el._listeners.waiting);
    el.removeEventListener('playing', el._listeners.playing);
    el.removeEventListener('stalled', el._listeners.stalled);
    el.removeEventListener('error', el._listeners.error);
    el._listeners = null;
  }

  function setupListeners(el, station, gen) {
    removeListeners(el);

    const waiting = () => {
      if (generation !== gen) return;
      clearFallbackTimer();
      fallbackTimer = setTimeout(() => {
        if (generation === gen) switchQuality(station, gen);
      }, 3000);
    };

    const playing = () => {
      clearFallbackTimer();
    };

    const stalled = () => {
      if (generation === gen) switchQuality(station, gen);
    };

    const error = () => {
      if (generation === gen) switchQuality(station, gen);
    };

    el._listeners = { waiting, playing, stalled, error };
    el.addEventListener('waiting', waiting);
    el.addEventListener('playing', playing);
    el.addEventListener('stalled', stalled);
    el.addEventListener('error', error);
  }

  function switchQuality(station, gen) {
    if (generation !== gen) return;
    clearFallbackTimer();

    const streams = getAvailableStreams(station);
    const nextIndex = currentQualityIndex + 1;

    if (nextIndex >= streams.length) {
      stop();
      window.dispatchEvent(new CustomEvent('player-stream-exhausted', {
        detail: { stationId: station.id, title: station.title }
      }));
      return;
    }

    currentQualityIndex = nextIndex;
    startStream(streams[nextIndex], station, gen);
  }

  function startStream(url, station, gen, retryCount) {
    if (generation !== gen) return;
    retryCount = retryCount || 0;

    const el = getAudio();

    // Re-attach listeners for this station+gen
    setupListeners(el, station, gen);

    // Set src — browser gracefully stops old stream
    el.src = url;

    el.play().then(() => {
      if (generation !== gen) return;
      isPlaying = true;
      notifyState();
    }).catch((err) => {
      if (generation !== gen) return;

      if (err.name === 'NotAllowedError') {
        // Lost user gesture in retry — give up this chain
        if (retryCount === 0) {
          // First failure within click handler — the stream might need
          // a moment; retry once without changing src (it's already set)
          setTimeout(() => {
            if (generation !== gen) return;
            startStream(url, station, gen, 1);
          }, 1000);
          return;
        }
        // Give up — user needs to tap again
        stop();
        window.dispatchEvent(new CustomEvent('player-autoplay-blocked'));
        return;
      }

      // Other error (network, decode, etc.) — retry once, then fall back
      if (retryCount === 0) {
        setTimeout(() => {
          if (generation !== gen) return;
          startStream(url, station, gen, 1);
        }, 1000);
        return;
      }

      // Already retried — try lower quality
      switchQuality(station, gen);
    });
  }

  function play(station) {
    generation++;
    const gen = generation;

    // Stop current playback cleanly
    if (audio) {
      audio.pause();
      removeListeners(audio);
    }
    clearFallbackTimer();
    isPlaying = false;
    currentStation = station;
    currentQualityIndex = 0;

    const streams = getAvailableStreams(station);
    if (streams.length === 0) {
      console.error('No streams available for station:', station.title);
      return;
    }

    notifyState();
    startStream(streams[0], station, gen, 0);
  }

  function pause() {
    if (audio && isPlaying) {
      generation++;
      audio.pause();
      isPlaying = false;
      clearFallbackTimer();
      notifyState();
    }
  }

  function resume() {
    if (!audio || isPlaying) return;
    generation++;
    const gen = generation;

    audio.play().then(() => {
      if (generation !== gen) return;
      isPlaying = true;
      notifyState();
    }).catch((err) => {
      if (generation !== gen) return;
      if (err.name === 'NotAllowedError') {
        stop();
        window.dispatchEvent(new CustomEvent('player-autoplay-blocked'));
      }
    });
  }

  function stop() {
    if (audio) {
      audio.pause();
      removeListeners(audio);
      audio.src = '';
    }
    clearFallbackTimer();
    generation++;
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

  function onTrackUpdate(callback) {}

  return {
    play, pause, resume, stop,
    next, prev,
    setVolume, getState,
    onStateChange, onTrackUpdate
  };
})();
