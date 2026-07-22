'use strict';

const API = (() => {
  // Use direct API on localhost/file, proxy path on deployed (CORS workaround)
  const isLocal = !window.location.hostname ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const STATIONS_URL = isLocal
    ? 'https://www.radiorecord.ru/api/stations'
    : '/api/stations';

  const NOW_URL = isLocal
    ? 'https://www.radiorecord.ru/api/stations/now/'
    : '/api/stations/now/';

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
