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
      clearFallbackTimer();
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
        if (audio) {
          audio.currentTime = seekTime;
          isPlaying = true;
          notifyState();
        }
      }).catch(() => {
        // If play fails, try next quality immediately
        tryNextQuality(station);
      });
    }
  }

  function play(station) {
    stop();

    currentStation = station;

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
