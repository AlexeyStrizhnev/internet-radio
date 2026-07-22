'use strict';

const Player = (() => {
  let audio = null;
  let currentStation = null;
  let currentQualityIndex = 0; // 0=320, 1=128, 2=64
  let isPlaying = false;
  let volume = 0.7;
  let fallbackTimer = null;
  let currentListeners = null;
  let generation = 0; // Incremented on each play() — prevents stale catch handlers

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

  function setupAudioListeners(station, gen) {
    if (!audio) return;

    if (currentListeners) {
      audio.removeEventListener('waiting', currentListeners.waiting);
      audio.removeEventListener('playing', currentListeners.playing);
      audio.removeEventListener('stalled', currentListeners.stalled);
      audio.removeEventListener('error', currentListeners.error);
    }

    const waiting = () => {
      if (generation !== gen) return; // Stale — audio was replaced
      clearFallbackTimer();
      fallbackTimer = setTimeout(() => {
        if (generation === gen) tryNextQuality(station, gen);
      }, 3000);
    };

    const playing = () => {
      clearFallbackTimer();
    };

    const stalled = () => {
      if (generation === gen) tryNextQuality(station, gen);
    };

    const error = () => {
      if (generation === gen) tryNextQuality(station, gen);
    };

    currentListeners = { waiting, playing, stalled, error };

    audio.addEventListener('waiting', waiting);
    audio.addEventListener('playing', playing);
    audio.addEventListener('stalled', stalled);
    audio.addEventListener('error', error);
  }

  function tryNextQuality(station, gen) {
    if (generation !== gen) return; // Stale
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

    const wasPlaying = isPlaying;
    const currentTime = audio ? audio.currentTime : 0;
    const streamUrl = streams[nextIndex];

    if (audio) {
      audio.pause();
      audio = null;
    }

    currentQualityIndex = nextIndex;
    initAudio(streamUrl, station, currentTime, wasPlaying, gen);
  }

  function initAudio(url, station, seekTime, autoPlay, gen) {
    const thisAudio = new Audio(url);
    audio = thisAudio;
    thisAudio.setAttribute('playsinline', '');
    thisAudio.volume = volume;
    setupAudioListeners(station, gen);

    if (autoPlay) {
      thisAudio.play().then(() => {
        if (generation !== gen || audio !== thisAudio) return; // Replaced
        thisAudio.currentTime = seekTime;
        isPlaying = true;
        notifyState();
      }).catch((err) => {
        if (generation !== gen || audio !== thisAudio) return; // Replaced — ignore
        if (err.name === 'NotAllowedError') {
          stop();
          window.dispatchEvent(new CustomEvent('player-autoplay-blocked'));
          return;
        }
        tryNextQuality(station, gen);
      });
    }
  }

  function play(station) {
    stop();
    generation++;
    const gen = generation;

    currentStation = station;

    const streams = getAvailableStreams(station);
    if (streams.length === 0) {
      console.error('No streams available for station:', station.title);
      return;
    }

    initAudio(streams[0], station, 0, true, gen);
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
    if (!audio || isPlaying) return;

    const gen = generation;
    audio.play().then(() => {
      if (generation !== gen) return; // Replaced during resume
      isPlaying = true;
      notifyState();
    }).catch((err) => {
      if (generation !== gen) return; // Replaced
      if (err.name === 'NotAllowedError') {
        stop();
        window.dispatchEvent(new CustomEvent('player-autoplay-blocked'));
      }
    });
  }

  function stop() {
    clearFallbackTimer();
    if (audio) {
      audio.pause();
      audio.src = '';
      audio = null;
    }
    currentListeners = null;
    generation++; // Invalidate all in-flight handlers for old audio
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
