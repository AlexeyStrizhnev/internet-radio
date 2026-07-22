'use strict';

const UI = (() => {
  let stationClickCallback = null;
  let modalSubmitCallback = null;

  function $(id) { return document.getElementById(id); }

  /* ===== Grid Rendering ===== */

  function renderGrid(stations, activeId) {
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
        // API station — use SVG. Enable mouse drag-and-drop.
        card.setAttribute('draggable', 'true');
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
        String(card.dataset.stationId) === String(activeId));
    });
  }

  /* ===== Track Bar ===== */

  function updateTrackBar(artist, song, stationName) {
    const info = $('trackInfo');
    const name = $('stationName');
    if (info) {
      if (artist && song) {
        info.textContent = `${artist} — ${song}`;
      } else if (artist) {
        // Custom station: show title directly, no metadata available
        info.textContent = artist;
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

    function handleDragStart(e) {
      const card = e.target.closest('.station-card');
      if (!card) return;
      // Don't drag custom stations
      if (card.querySelector('.station-avatar')) return;

      dragEl = card;
      dragIndex = parseInt(card.dataset.index);
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
      const cardUnder = [...elements].find(el => el.classList.contains('station-card'));

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
  function setupModalEvents() {
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

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const url = input.value.trim();
          if (url && modalSubmitCallback) {
            modalSubmitCallback(url);
          }
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupModalEvents);
  } else {
    setupModalEvents();
  }

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
