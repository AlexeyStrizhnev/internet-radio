'use strict';

const Player = (() => {
  let audio = null;
  let currentStation = null;
  let isPlaying = false;
  let volume = 0.7;
  let generation = 0;
  let busy = false; // Guards against concurrent play/resume calls

  const stateListeners = [];

  function notifyState() {
    stateListeners.forEach(fn => fn({
      playing: isPlaying,
      stationId: currentStation ? currentStation.id : null
    }));
  }

  function play(station) {
    busy = false; // Reset from any previous stuck state

    // Clean up previous audio
    if (audio) {
      audio.pause();
      audio.src = '';
      audio.load();
      audio = null;
    }

    generation++;
    currentStation = station;
    isPlaying = false;
    busy = true;
    notifyState();

    // Pick the best available stream (prefer 320)
    const url = station.stream_320 || station.stream_128 || station.stream_64;
    if (!url) {
      busy = false;
      console.error('No stream for:', station.title);
      return;
    }

    // Create fresh Audio — simple, reliable
    audio = new Audio(url);
    audio.setAttribute('playsinline', '');
    audio.volume = volume;

    audio.play().then(() => {
      busy = false;
      isPlaying = true;
      notifyState();
    }).catch((err) => {
      busy = false;
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
      tryFallback(station);
    });
  }

  function tryFallback(station) {
    busy = true;
    const urls = [station.stream_128, station.stream_64].filter(u => u);
    if (!urls.length) {
      busy = false;
      stop();
      window.dispatchEvent(new CustomEvent('player-stream-exhausted', {
        detail: { stationId: station.id, title: station.title }
      }));
      return;
    }

    if (audio) {
      audio.pause();
      audio.src = '';
      audio = null;
    }

    audio = new Audio(urls[0]);
    audio.setAttribute('playsinline', '');
    audio.volume = volume;

    audio.play().then(() => {
      busy = false;
      isPlaying = true;
      notifyState();
    }).catch(() => {
      // Try last resort (64)
      const lastUrl = station.stream_64;
      if (lastUrl && lastUrl !== urls[0]) {
        if (audio) { audio.pause(); audio.src = ''; audio = null; }
        audio = new Audio(lastUrl);
        audio.setAttribute('playsinline', '');
        audio.volume = volume;
        audio.play().then(() => {
          busy = false;
          isPlaying = true;
          notifyState();
        }).catch(() => {
          busy = false;
          stop();
          window.dispatchEvent(new CustomEvent('player-stream-exhausted', {
            detail: { stationId: station.id, title: station.title }
          }));
        });
      } else {
        busy = false;
        stop();
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
    if (!audio || isPlaying || busy) return;
    busy = true;
    generation++;

    audio.play().then(() => {
      busy = false;
      isPlaying = true;
      notifyState();
    }).catch((err) => {
      busy = false;
      if (err.name === 'NotAllowedError') {
        stop();
        window.dispatchEvent(new CustomEvent('player-autoplay-blocked'));
      }
    });
  }

  function stop() {
    busy = false;
    if (audio) {
      audio.pause();
      audio.src = '';
      audio.load();
      audio = null;
    }
    generation++;
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
