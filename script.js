// ============================================================
// TableFor — Landing Page Interactivity
// ============================================================

(function () {
  'use strict';

  // Which page we're on (set on <body data-page="…">) and any search passed in the URL
  const PAGE = document.body.dataset.page || 'home';
  const initParams = new URLSearchParams(window.location.search);

  // Tell other scripts (e.g. the Explore page) that the search bar changed
  function notifySearch(reason) {
    document.dispatchEvent(new CustomEvent('tablefor:searchchange', { detail: { reason } }));
  }

  /* ---------- Sticky header state ---------- */
  const header = document.getElementById('siteHeader');
  // Highlight the nav link for the section in view (Home above the first section)
  const navLinks = Array.from(document.querySelectorAll('.nav-list .nav-link'));
  const spySections = navLinks
    .map((link) => ({ link, target: link.hash ? document.querySelector(link.hash) : null }))
    .filter((item) => item.target);
  function updateActiveNav() {
    const line = header.offsetHeight + window.innerHeight * 0.3;
    let active = navLinks[0];
    spySections.forEach(({ link, target }) => {
      if (target.getBoundingClientRect().top <= line) active = link;
    });
    navLinks.forEach((link) => {
      const isActive = link === active;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    });
  }
  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    if (PAGE === 'home') updateActiveNav(); // other pages mark their own link in the HTML
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile nav toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');

  function closeNav() {
    if (mainNav.classList.contains('is-open')) document.body.classList.remove('nav-open');
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
  }

  function openNav() {
    document.body.classList.add('nav-open'); // stop the page scrolling behind the menu
    mainNav.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close menu');
  }

  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.contains('is-open');
    isOpen ? closeNav() : openNav();
  });

  // Close the mobile menu after choosing a link
  mainNav.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', closeNav);
  });

  // Close on Escape, and on resize past the mobile breakpoint
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1120) closeNav();
  });

  /* ---------- Search bar elements ----------
     Pages without the search bar (e.g. Explore) still keep the search state
     (from the URL or defaults) — missing elements are swapped for detached
     stand-ins so the same code runs everywhere without null checks. */
  const HAS_SEARCH_BAR = !!document.querySelector('.search-card');
  const byId = (id, tag = 'div') => document.getElementById(id) || document.createElement(tag);
  const bySel = (sel) => document.querySelector(sel) || document.createElement('div');

  /* ---------- Guest stepper in the hero search card ---------- */
  const guestCountEl = byId('guestCount', 'span');
  const guestMinus = byId('guestMinus', 'button');
  const guestPlus = byId('guestPlus', 'button');
  let guests = 2;
  const guestsFromUrl = parseInt(initParams.get('guests'), 10);
  if (guestsFromUrl >= 1 && guestsFromUrl <= 20) guests = guestsFromUrl;

  const GUESTS_MIN = 1;
  const GUESTS_MAX = 20;
  function renderGuests() {
    guestCountEl.textContent = guests === 1 ? '1 Guest' : `${guests} Guests`;
    guestMinus.disabled = guests <= GUESTS_MIN;
    guestPlus.disabled = guests >= GUESTS_MAX;
  }

  guestMinus.addEventListener('click', () => {
    guests = Math.max(GUESTS_MIN, guests - 1);
    renderGuests();
    notifySearch('guests');
  });
  guestPlus.addEventListener('click', () => {
    guests = Math.min(GUESTS_MAX, guests + 1);
    renderGuests();
    notifySearch('guests');
  });
  renderGuests();

  /* ---------- City / neighbourhood dropdown ---------- */
  // Rough city centres, used for distances when a whole city (not a barangay) is picked
  const CITY_CENTRES = {
    'Angeles City': { lat: 15.1450, lng: 120.5887 },
    'City of San Fernando': { lat: 15.0286, lng: 120.6898 },
    'Mabalacat': { lat: 15.2230, lng: 120.5740 },
  };

  const CITIES = [
    {
      name: 'Angeles City',
      barangays: [
        { name: 'Balibago', lat: 15.1682, lng: 120.5936 },
        { name: 'Malabanias', lat: 15.1601, lng: 120.5765 },
        { name: 'Pampang', lat: 15.1482, lng: 120.5745 },
        { name: 'Anunas', lat: 15.1552, lng: 120.5636 },
        { name: 'Cutcut', lat: 15.1418, lng: 120.5698 },
        { name: 'Margot', lat: 15.1290, lng: 120.5940 },
        { name: 'Sto. Domingo', lat: 15.1390, lng: 120.5810 },
        { name: 'Pulung Maragul', lat: 15.1610, lng: 120.5540 },
        { name: 'Friendship', lat: 15.1730, lng: 120.5980 },
      ],
    },
    {
      name: 'City of San Fernando',
      barangays: [
        { name: 'Dolores', lat: 15.0430, lng: 120.6890 },
        { name: 'Del Pilar', lat: 15.0330, lng: 120.6870 },
        { name: 'San Jose', lat: 15.0280, lng: 120.6800 },
        { name: 'Sto. Niño', lat: 15.0300, lng: 120.6950 },
        { name: 'Telabastagan', lat: 15.0630, lng: 120.6600 },
        { name: 'Dela Paz Norte', lat: 15.0180, lng: 120.6900 },
        { name: 'Calulut', lat: 15.0700, lng: 120.6850 },
        { name: 'San Agustin', lat: 15.0460, lng: 120.6790 },
      ],
    },
    {
      name: 'Mabalacat',
      barangays: [
        { name: 'Dau', lat: 15.1830, lng: 120.5730 },
        { name: 'Mawaque', lat: 15.2180, lng: 120.5720 },
        { name: 'Poblacion', lat: 15.2220, lng: 120.5730 },
        { name: 'Dolores', lat: 15.2350, lng: 120.5600 },
        { name: 'Camachiles', lat: 15.2280, lng: 120.5760 },
        { name: 'Sapang Biabas', lat: 15.2050, lng: 120.5850 },
        { name: 'Atlu-Bola', lat: 15.2400, lng: 120.5850 },
        { name: 'Duquit', lat: 15.1950, lng: 120.5650 },
      ],
    },
  ];

  const locFieldWrap = bySel('.search-field-loc');
  const locInput = byId('loc', 'input');
  if (!HAS_SEARCH_BAR) locInput.value = 'Angeles City'; // same default as the search bar
  const locClear = byId('locClear', 'button');
  const locDropdown = byId('locDropdown');
  const locDropdownInner = byId('locDropdownInner');

  /* GPS — progressive fix, the way maps / ride-hailing apps do it:
     1. Ask for a high-accuracy fix and keep listening (watchPosition), never a stale cached one.
     2. Use the first reading straight away, then keep whichever reading is most accurate.
     3. Stop when accuracy is good enough, readings stop improving, or the time limit is hit.
     4. Anything worse than ~1 km is flagged as approximate (typical of Wi-Fi/IP location on
        laptops) and the user is nudged to pick their area instead.
     5. Reuse a good fix for a couple of minutes so the GPS isn't spun up on every open. */
  const GEO_GOOD_ACCURACY = 50;      // metres — stop refining at this point
  const GEO_POOR_ACCURACY = 1000;    // metres — worse than this is "approximate"
  const GEO_MAX_WAIT = 15000;        // hard stop for refining
  const GEO_STALL_MS = 4000;         // stop if no better reading arrives in this time
  const GEO_CACHE_MS = 2 * 60 * 1000;
  const NEAR_BARANGAY_KM = 3;        // label a current location "Near X" within this distance

  let userFix = null;      // best reading: { lat, lng, accuracy, at }
  let userCoords = null;   // what distance sorting uses
  let geoStatus = 'idle';  // idle | pending | refining | granted | approximate | denied | error | unsupported | insecure
  let geoPromise = null;
  let locActiveIndex = -1;
  let locQuery = '';
  // What the field currently holds. The default value is a city, which counts as a valid pick.
  let locSelection = { type: 'city', city: 'Angeles City' };
  let locError = false;
  let currentLocToken = 0;

  const RECENTS_KEY = 'tablefor_recent_locations';
  function getRecents() {
    try { return JSON.parse(localStorage.getItem(RECENTS_KEY)) || []; } catch { return []; }
  }
  function saveRecent(entry) {
    try {
      const list = getRecents().filter((r) => !(r.name === entry.name && r.city === entry.city));
      list.unshift(entry);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, 3)));
    } catch { /* localStorage unavailable — skip silently */ }
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Always one decimal, no space: 0.3km, 1.9km, 12.4km
  function formatDistance(km) {
    return `${Math.max(km, 0.1).toFixed(1)}km`;
  }
  function formatAccuracy(m) {
    return m < 1000 ? `±${Math.round(m)} m` : `±${(m / 1000).toFixed(1)} km`;
  }

  function shortCityName(name) {
    return name.replace(/^City of /i, '').replace(/ City$/i, '');
  }

  function nearestBarangay(coords) {
    let best = null;
    CITIES.forEach((city) => city.barangays.forEach((b) => {
      const dist = haversineKm(coords.lat, coords.lng, b.lat, b.lng);
      if (!best || dist < best.dist) best = { name: b.name, city: city.name, dist };
    }));
    return best;
  }

  const isLocOpen = () => locDropdown.classList.contains('is-open');
  function refreshLocPanel() {
    if (isLocOpen()) renderLocationPanel(locQuery);
  }

  function ensureUserLocation(force) {
    const fresh = userFix && Date.now() - userFix.at < GEO_CACHE_MS;
    if (!force && fresh && (geoStatus === 'granted' || geoStatus === 'approximate')) return Promise.resolve(userFix);
    if (geoPromise) return geoPromise;

    if (!('geolocation' in navigator)) {
      geoStatus = 'unsupported'; refreshLocPanel();
      return Promise.reject(new Error('unsupported'));
    }
    if (window.isSecureContext === false) {
      // Browsers won't even show the prompt outside https / localhost.
      geoStatus = 'insecure'; refreshLocPanel();
      return Promise.reject(new Error('insecure-context'));
    }

    geoStatus = 'pending';
    refreshLocPanel();

    geoPromise = new Promise((resolve, reject) => {
      let best = null;
      let done = false;
      let stallTimer = null;
      let watchId = null;

      const finish = () => {
        if (done) return;
        done = true;
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        clearTimeout(maxTimer);
        clearTimeout(stallTimer);
        geoPromise = null;
        if (best) {
          geoStatus = best.accuracy > GEO_POOR_ACCURACY ? 'approximate' : 'granted';
          refreshLocPanel();
          resolve(best);
        } else {
          if (geoStatus !== 'denied') geoStatus = 'error';
          refreshLocPanel();
          reject(new Error(geoStatus));
        }
      };

      const onFix = (pos) => {
        const accuracy = pos.coords.accuracy;
        if (best && accuracy >= best.accuracy) return; // not an improvement — keep the better one
        best = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy, at: Date.now() };
        userFix = best;
        userCoords = { lat: best.lat, lng: best.lng };
        if (accuracy <= GEO_GOOD_ACCURACY) { finish(); return; }
        geoStatus = 'refining';
        refreshLocPanel();
        clearTimeout(stallTimer);
        stallTimer = setTimeout(finish, GEO_STALL_MS);
      };

      const onError = (err) => {
        // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        if (err.code === 1) { geoStatus = 'denied'; best = null; }
        finish();
      };

      const maxTimer = setTimeout(finish, GEO_MAX_WAIT);
      watchId = navigator.geolocation.watchPosition(onFix, onError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: GEO_MAX_WAIT,
      });
    });
    return geoPromise;
  }

  function requestUserLocation(force) {
    ensureUserLocation(force).catch(() => { /* status recorded, panel re-rendered */ });
  }

  // If the site already has permission, warm the GPS up quietly (no prompt appears).
  // Also react if the user changes the permission in browser settings.
  if (HAS_SEARCH_BAR && navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then((perm) => {
      const apply = () => {
        if (perm.state === 'denied') { geoStatus = 'denied'; refreshLocPanel(); }
        else if (perm.state === 'granted' && !userFix && !geoPromise) requestUserLocation();
        else if (perm.state === 'prompt' && geoStatus === 'denied') { geoStatus = 'idle'; refreshLocPanel(); }
      };
      apply();
      perm.onchange = apply;
    }).catch(() => { /* Permissions API not available for geolocation — fall back to prompting */ });
  }

  function highlightMatch(name, query) {
    if (!query) return name;
    const i = name.toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return name;
    return `${name.slice(0, i)}<mark>${name.slice(i, i + query.length)}</mark>${name.slice(i + query.length)}`;
  }

  function setLocSelection(selection, text) {
    locSelection = selection;
    locInput.value = text;
    locQuery = '';
    currentLocToken += 1; // cancels any "use my location" still waiting on the GPS
    locClear.classList.toggle('is-visible', text.length > 0);
    locError = false;
    locFieldWrap.classList.remove('has-error');
    locInput.removeAttribute('aria-invalid');
    notifySearch('location');
  }

  function selectLocation(brgyName, cityName, lat, lng) {
    setLocSelection({ type: 'barangay', name: brgyName, city: cityName, lat, lng }, `${brgyName}, ${shortCityName(cityName)}`);
    saveRecent({ name: brgyName, city: cityName, lat, lng });
    closeLocDropdown();
  }

  function selectCurrentLocation(fix) {
    const near = nearestBarangay(fix);
    const precise = fix.accuracy <= GEO_POOR_ACCURACY;
    const text = precise && near && near.dist <= NEAR_BARANGAY_KM
      ? `Near ${near.name}, ${shortCityName(near.city)}`
      : precise ? 'Current location' : 'Current location (approximate)';
    setLocSelection({ type: 'current', lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy }, text);
    closeLocDropdown();
  }

  function makeRow(brgyName, cityName, query, distKm, lat, lng) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'loc-row';
    row.setAttribute('role', 'option');
    const approx = geoStatus === 'approximate' ? '~' : '';
    const distLabel = typeof distKm === 'number' ? approx + formatDistance(distKm) : '';
    row.innerHTML = `<span class="loc-name">${highlightMatch(brgyName, query)}</span><span class="loc-dist">${distLabel}</span>`;
    row.addEventListener('click', () => selectLocation(brgyName, cityName, lat, lng));
    return row;
  }

  function makeCurrentLocationRow() {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'loc-row loc-row-current';
    row.setAttribute('role', 'option');
    const busy = geoStatus === 'pending' || geoStatus === 'refining';
    const blocked = ['denied', 'unsupported', 'insecure'].includes(geoStatus);
    if (blocked) row.disabled = true;
    row.setAttribute('aria-busy', String(busy));
    const label = busy ? 'Locating you…' : 'Use my current location';
    row.innerHTML =
      `<span class="loc-name"><span class="loc-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg></span><span class="loc-current-label">${label}</span></span><span class="loc-dist">${busy && userFix ? formatAccuracy(userFix.accuracy) : ''}</span>`;
    row.addEventListener('click', () => {
      const token = ++currentLocToken;
      row.querySelector('.loc-current-label').textContent = 'Locating you…';
      ensureUserLocation()
        .then((fix) => { if (token === currentLocToken) selectCurrentLocation(fix); })
        .catch(() => { /* the note in the panel explains what happened */ });
    });
    return row;
  }

  function geoNoteCopy() {
    const acc = userFix ? formatAccuracy(userFix.accuracy) : '';
    const retry = () => requestUserLocation(true);
    switch (geoStatus) {
      case 'idle': return ['Share your location to sort by distance', 'Enable', () => requestUserLocation()];
      case 'pending': return ['Finding your location…'];
      case 'refining': return [`Improving accuracy (${acc})…`];
      case 'granted': return [`Using your location (${acc})`, 'Refresh', retry];
      case 'approximate': return [`Approximate location (${acc}). Pick your area below if it looks off.`, 'Retry', retry];
      case 'denied': return ["Location is blocked. Allow it in your browser's site settings to sort by distance."];
      case 'error': return ["Couldn't get your location. Check that location services are on.", 'Retry', retry];
      case 'unsupported': return ["This browser doesn't support location. Pick your area below."];
      case 'insecure': return ['Location only works on a secure (https) connection.'];
      default: return ['Share your location to sort by distance', 'Enable', () => requestUserLocation()];
    }
  }

  function renderLocationPanel(rawQuery) {
    const query = rawQuery.trim();
    locDropdownInner.innerHTML = '';
    locActiveIndex = -1;

    if (locError) {
      const err = document.createElement('div');
      err.className = 'loc-error';
      err.setAttribute('role', 'alert');
      err.textContent = 'Choose a location from the list to search.';
      locDropdownInner.appendChild(err);
    }

    const [text, actionLabel, action] = geoNoteCopy();
    const note = document.createElement('div');
    note.className = 'loc-geo-note';
    note.innerHTML = `<span>${text}</span>${actionLabel ? `<button type="button">${actionLabel}</button>` : ''}`;
    if (actionLabel) note.querySelector('button').addEventListener('click', action);
    locDropdownInner.appendChild(note);

    if (!query) {
      locDropdownInner.appendChild(makeCurrentLocationRow());

      const recents = getRecents();
      if (recents.length) {
        const group = document.createElement('div');
        group.className = 'loc-group';
        group.innerHTML = '<div class="loc-group-label">Recent</div>';
        recents.forEach((r) => {
          const dist = userCoords && typeof r.lat === 'number' ? haversineKm(userCoords.lat, userCoords.lng, r.lat, r.lng) : null;
          group.appendChild(makeRow(r.name, r.city, '', dist, r.lat, r.lng));
        });
        locDropdownInner.appendChild(group);
      }

      // Grouped view: each city, barangays sorted nearest-first when location is known
      CITIES.forEach((city) => {
        const group = document.createElement('div');
        group.className = 'loc-group';
        const label = document.createElement('div');
        label.className = 'loc-group-label';
        label.textContent = city.name;
        group.appendChild(label);

        const entries = city.barangays.map((b) => ({
          ...b,
          dist: userCoords ? haversineKm(userCoords.lat, userCoords.lng, b.lat, b.lng) : null,
        }));
        entries.sort((a, b) => {
          if (a.dist == null || b.dist == null) return a.name.localeCompare(b.name);
          return a.dist - b.dist;
        });

        entries.forEach((b) => group.appendChild(makeRow(b.name, city.name, '', b.dist, b.lat, b.lng)));
        locDropdownInner.appendChild(group);
      });
      return;
    }

    // Typeahead: flat, ranked matches across all cities
    const q = query.toLowerCase();
    const matches = [];
    CITIES.forEach((city) => {
      city.barangays.forEach((b) => {
        const nameLower = b.name.toLowerCase();
        const cityLower = city.name.toLowerCase();
        if (nameLower.includes(q) || cityLower.includes(q)) {
          matches.push({
            name: b.name,
            city: city.name,
            lat: b.lat,
            lng: b.lng,
            dist: userCoords ? haversineKm(userCoords.lat, userCoords.lng, b.lat, b.lng) : null,
            rank: nameLower.startsWith(q) ? 0 : 1,
          });
        }
      });
    });
    matches.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.dist == null || b.dist == null) return a.name.localeCompare(b.name);
      return a.dist - b.dist;
    });

    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'loc-empty';
      empty.textContent = 'No matching barangay. Try another spelling or pick from the list.';
      locDropdownInner.appendChild(empty);
      return;
    }

    matches.slice(0, 10).forEach((m) => {
      const row = makeRow(m.name, m.city, query, m.dist, m.lat, m.lng);
      row.querySelector('.loc-name').insertAdjacentHTML('beforeend', ` <span class="loc-sub">${shortCityName(m.city)}</span>`);
      locDropdownInner.appendChild(row);
    });
  }

  function openLocDropdown() {
    if (isLocOpen()) return;
    closeDatePopover();
    locDropdown.classList.add('is-open');
    locFieldWrap.classList.add('is-open');
    locInput.setAttribute('aria-expanded', 'true');
    if (geoStatus === 'idle') requestUserLocation();
    // Always start from the full list — the field's value is the previous pick, not a filter.
    locQuery = '';
    renderLocationPanel('');
    requestAnimationFrame(() => locInput.select());
  }

  function closeLocDropdown() {
    if (!isLocOpen()) return;
    locDropdown.classList.remove('is-open');
    locFieldWrap.classList.remove('is-open');
    locInput.setAttribute('aria-expanded', 'false');
  }

  function showLocError() {
    locError = true;
    locFieldWrap.classList.add('has-error');
    locInput.setAttribute('aria-invalid', 'true');
    if (isLocOpen()) renderLocationPanel(locQuery);
    else { locInput.focus(); openLocDropdown(); }
  }

  const hasValidLocation = () => !!locSelection && locInput.value.trim() !== '';

  // Restore a location passed in the URL (e.g. arriving on Explore from the home search)
  (function initLocationFromUrl() {
    const type = initParams.get('ltype');
    const text = initParams.get('loc');
    if (!type || !text) return;
    const lat = parseFloat(initParams.get('lat'));
    const lng = parseFloat(initParams.get('lng'));
    const city = initParams.get('city');
    if (type === 'city' && CITY_CENTRES[city]) locSelection = { type: 'city', city };
    else if (type === 'barangay' && Number.isFinite(lat) && Number.isFinite(lng)) {
      locSelection = { type: 'barangay', name: initParams.get('brgy') || text, city, lat, lng };
    } else if (type === 'current' && Number.isFinite(lat) && Number.isFinite(lng)) {
      locSelection = { type: 'current', lat, lng };
    } else return;
    locInput.value = text;
    locClear.classList.toggle('is-visible', text.length > 0);
  })();

  // The whole "City or Neighbourhood" block is one tap target
  locFieldWrap.addEventListener('click', (e) => {
    if (e.composedPath().includes(locDropdown)) return;
    if (e.target.closest('label, .loc-clear')) return; // label forwards its own click to the input
    if (e.target.closest('.loc-chevron') && isLocOpen()) { closeLocDropdown(); return; }
    if (document.activeElement !== locInput) locInput.focus();
    openLocDropdown();
  });
  locInput.addEventListener('focus', openLocDropdown);
  locInput.addEventListener('input', () => {
    locQuery = locInput.value;
    locSelection = null; // typed text isn't a location until one is picked
    locClear.classList.toggle('is-visible', locInput.value.length > 0);
    if (!isLocOpen()) {
      locDropdown.classList.add('is-open');
      locFieldWrap.classList.add('is-open');
      locInput.setAttribute('aria-expanded', 'true');
    }
    renderLocationPanel(locQuery);
  });
  locClear.classList.toggle('is-visible', locInput.value.length > 0);

  locClear.addEventListener('click', (e) => {
    e.stopPropagation();
    locInput.value = '';
    locQuery = '';
    locSelection = null;
    locClear.classList.remove('is-visible');
    locInput.focus();
    if (!isLocOpen()) openLocDropdown(); else renderLocationPanel('');
  });

  locInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeLocDropdown(); return; }
    if (!isLocOpen()) {
      if (e.key === 'ArrowDown') { e.preventDefault(); openLocDropdown(); }
      return;
    }
    const rows = Array.from(locDropdownInner.querySelectorAll('.loc-row:not(:disabled)'));
    if (e.key === 'Enter') {
      e.preventDefault(); // never submit the form from inside the open list
      if (locActiveIndex >= 0 && rows[locActiveIndex]) rows[locActiveIndex].click();
      else if (locQuery.trim() && rows[0]) rows[0].click(); // Enter picks the top match
      return;
    }
    if (!rows.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      locActiveIndex = Math.min(locActiveIndex + 1, rows.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      locActiveIndex = Math.max(locActiveIndex - 1, 0);
    } else {
      return;
    }
    rows.forEach((r, i) => r.classList.toggle('is-active', i === locActiveIndex));
    rows[locActiveIndex].scrollIntoView({ block: 'nearest' });
  });

  // composedPath still includes the field if the clicked row was re-rendered mid-click
  document.addEventListener('click', (e) => {
    if (!e.composedPath().includes(locFieldWrap)) closeLocDropdown();
  });
  locFieldWrap.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !locFieldWrap.contains(e.relatedTarget)) closeLocDropdown();
  });

  /* ---------- Date & time dropdown ---------- */
  const dtField = bySel('.search-field-date');
  const dtInput = byId('dt', 'input');
  const datePopover = byId('datePopover');
  const calMonthLabel = byId('calMonthLabel', 'span');
  const calGrid = byId('calGrid');
  const calPrev = byId('calPrev', 'button');
  const calNext = byId('calNext', 'button');
  const timeGrid = byId('timeGrid');
  const timeNote = byId('timeNote', 'span');
  const dateDoneBtn = byId('dateDone', 'button');
  const quickChips = datePopover.querySelectorAll('[data-quick]');

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // Booking rules — the usual set for restaurant reservation apps
  const SLOT_START = 11 * 60;       // first seating 11:00 AM
  const SLOT_END = 22 * 60;         // last seating 10:00 PM
  const SLOT_STEP = 30;             // every 30 minutes
  const LEAD_MINUTES = 30;          // can't book a slot less than 30 min away
  const MAX_DAYS_AHEAD = 60;        // booking window
  const DEFAULT_MINUTES = 20 * 60;  // preferred default: 8:00 PM
  const EVENING_FROM = 17 * 60;     // "Tonight" from 5 PM; "Today" before (set to 0 to always say "Tonight")

  const SLOTS = [];
  for (let m = SLOT_START; m <= SLOT_END; m += SLOT_STEP) SLOTS.push(m);

  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const sameDay = (a, b) => a.getTime() === b.getTime();
  const pad2 = (n) => String(n).padStart(2, '0');

  let today = startOfDay(new Date());
  let selectedDate = today;
  let selectedMinutes = DEFAULT_MINUTES;
  let focusDate = today;
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();

  const maxDate = () => addDays(today, MAX_DAYS_AHEAD);

  function availableSlots(date) {
    if (!sameDay(date, today)) return SLOTS;
    const now = new Date();
    const cutoff = now.getHours() * 60 + now.getMinutes() + LEAD_MINUTES;
    return SLOTS.filter((m) => m >= cutoff);
  }

  function isBookable(date) {
    return date >= today && date <= maxDate() && availableSlots(date).length > 0;
  }

  // Today, or tomorrow once today's last seating has passed
  function firstBookableDate() {
    return isBookable(today) ? today : addDays(today, 1);
  }

  // Keep the chosen time if it's still available, otherwise the nearest later slot
  function pickTime(date, preferred) {
    const slots = availableSlots(date);
    if (slots.includes(preferred)) return preferred;
    const later = slots.find((m) => m >= preferred);
    return later !== undefined ? later : slots[0];
  }

  function weekendDate() {
    // Coming Saturday; if it's already the weekend, the one after
    const dow = today.getDay();
    let diff = (6 - dow + 7) % 7;
    if (dow === 6 || dow === 0) diff = dow === 6 ? 7 : 6;
    return addDays(today, diff);
  }

  // Dates after tomorrow read "Sat, 3 Oct" everywhere on the site
  function shortDate(d) {
    return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
  }

  function formatTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hour12 = ((h + 11) % 12) + 1;
    return `${pad2(hour12)}:${pad2(m)} ${h < 12 ? 'AM' : 'PM'}`;
  }

  function formatDateTime(date, mins) {
    let dayLabel;
    if (sameDay(date, today)) dayLabel = mins >= EVENING_FROM ? 'Tonight' : 'Today';
    else if (sameDay(date, addDays(today, 1))) dayLabel = 'Tomorrow';
    else dayLabel = shortDate(date);
    return `${dayLabel}, ${formatTime(mins)}`;
  }

  // Write the current selection into the field (called on every change)
  function commit() {
    const next = formatDateTime(selectedDate, selectedMinutes);
    const changed = dtInput.value !== next;
    dtInput.value = next;
    byId('dateSummary', 'p').textContent = next;
    if (changed) notifySearch('datetime');
  }

  // Re-check "today" and the selection — handles midnight rollover and
  // slots that expire while the page sits open
  function refreshToday() {
    today = startOfDay(new Date());
    if (!isBookable(selectedDate)) selectedDate = firstBookableDate();
    selectedMinutes = pickTime(selectedDate, selectedMinutes);
    commit();
  }

  /* -- rendering -- */
  function renderCalendar() {
    calMonthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    calGrid.innerHTML = '';

    const max = maxDate();
    calPrev.disabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    calNext.disabled = viewYear > max.getFullYear() ||
      (viewYear === max.getFullYear() && viewMonth >= max.getMonth());

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('span');
      empty.className = 'cal-day is-empty';
      calGrid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.textContent = d;
      btn.dataset.time = String(dateObj.getTime());
      btn.setAttribute('aria-label', `${DAY_NAMES[dateObj.getDay()]}, ${MONTH_NAMES[viewMonth]} ${d}`);
      btn.tabIndex = -1;

      if (!isBookable(dateObj)) {
        btn.classList.add('is-disabled');
        btn.disabled = true;
        if (sameDay(dateObj, today)) btn.title = 'No more tables today';
      }
      if (sameDay(dateObj, today)) { btn.classList.add('is-today'); btn.setAttribute('aria-current', 'date'); }
      btn.addEventListener('click', () => selectDate(dateObj));
      calGrid.appendChild(btn);
    }
    syncCalendarState();
  }

  // Update selected / focusable day without rebuilding the grid
  function syncCalendarState() {
    calGrid.querySelectorAll('.cal-day[data-time]').forEach((btn) => {
      const t = Number(btn.dataset.time);
      const isSel = t === selectedDate.getTime();
      btn.classList.toggle('is-selected', isSel);
      btn.setAttribute('aria-pressed', String(isSel));
      btn.tabIndex = t === focusDate.getTime() ? 0 : -1;
    });
  }

  function renderTimes(scrollToSelected) {
    timeGrid.innerHTML = '';
    availableSlots(selectedDate).forEach((m) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'time-slot';
      btn.setAttribute('role', 'option');
      btn.dataset.minutes = String(m);
      btn.textContent = formatTime(m);
      btn.addEventListener('click', () => selectTime(m));
      timeGrid.appendChild(btn);
    });
    timeNote.textContent = sameDay(selectedDate, today) ? 'Later today only' : '';
    syncTimeState();

    if (scrollToSelected) {
      const sel = timeGrid.querySelector('.is-selected');
      if (sel) timeGrid.scrollTop = sel.offsetTop - timeGrid.offsetTop - timeGrid.clientHeight / 2 + sel.offsetHeight / 2;
    }
  }

  function syncTimeState() {
    timeGrid.querySelectorAll('.time-slot').forEach((btn) => {
      const isSel = Number(btn.dataset.minutes) === selectedMinutes;
      btn.classList.toggle('is-selected', isSel);
      btn.setAttribute('aria-selected', String(isSel));
    });
  }

  function syncQuickChips() {
    const wk = weekendDate();
    quickChips.forEach((chip) => {
      const key = chip.dataset.quick;
      const date = key === 'today' ? today : key === 'tomorrow' ? addDays(today, 1) : wk;
      if (key === 'weekend') chip.textContent = shortDate(wk);
      chip.disabled = !isBookable(date);
      chip.classList.toggle('is-active', sameDay(date, selectedDate));
    });
  }

  /* -- selection -- */
  function selectDate(date) {
    selectedDate = date;
    focusDate = date;
    selectedMinutes = pickTime(date, selectedMinutes);
    commit();
    if (date.getMonth() !== viewMonth || date.getFullYear() !== viewYear) {
      viewMonth = date.getMonth();
      viewYear = date.getFullYear();
      renderCalendar();
    } else {
      syncCalendarState();
    }
    renderTimes(true);
    syncQuickChips();
  }

  function selectTime(mins) {
    selectedMinutes = mins;
    commit();
    syncTimeState();
  }

  /* -- open / close -- */
  function isDateOpen() { return datePopover.classList.contains('is-open'); }

  function openDatePopover() {
    if (isDateOpen()) return;
    closeLocDropdown();
    refreshToday();
    focusDate = selectedDate;
    viewYear = selectedDate.getFullYear();
    viewMonth = selectedDate.getMonth();
    renderCalendar();
    syncQuickChips();
    datePopover.classList.add('is-open');
    dtField.classList.add('is-open');
    dtInput.setAttribute('aria-expanded', 'true');
    renderTimes(true);

    // Nudge the page so the whole panel is visible on shorter screens
    requestAnimationFrame(() => {
      const r = datePopover.getBoundingClientRect();
      const headerH = header.offsetHeight;
      if (r.bottom > window.innerHeight) {
        const delta = Math.min(r.bottom - window.innerHeight + 16, r.top - headerH - 12);
        if (delta > 0) window.scrollBy({ top: delta, behavior: 'smooth' });
      }
    });
  }

  function closeDatePopover(returnFocus) {
    if (!isDateOpen()) return;
    datePopover.classList.remove('is-open');
    dtField.classList.remove('is-open');
    dtInput.setAttribute('aria-expanded', 'false');
    if (returnFocus) dtInput.focus();
  }

  // The whole "Date & Time" block is one tap target
  dtField.addEventListener('click', (e) => {
    if (e.composedPath().includes(datePopover)) return;
    if (e.target.closest('label')) return; // label forwards its own click to the input
    if (isDateOpen()) closeDatePopover(); else openDatePopover();
  });
  dtInput.addEventListener('keydown', (e) => {
    if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      openDatePopover();
      const day = calGrid.querySelector('.cal-day[tabindex="0"]');
      if (day) day.focus();
    }
  });

  // Arrow-key navigation inside the calendar
  calGrid.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    let next = addDays(focusDate, step);
    const min = firstBookableDate();
    const max = maxDate();
    if (next < min) next = min;
    if (next > max) next = max;
    focusDate = next;
    if (next.getMonth() !== viewMonth || next.getFullYear() !== viewYear) {
      viewMonth = next.getMonth();
      viewYear = next.getFullYear();
      renderCalendar();
    } else {
      syncCalendarState();
    }
    const btn = calGrid.querySelector('.cal-day[tabindex="0"]');
    if (btn) btn.focus();
  });

  calPrev.addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderCalendar();
  });
  calNext.addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderCalendar();
  });

  quickChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.quick;
      selectDate(key === 'today' ? today : key === 'tomorrow' ? addDays(today, 1) : weekendDate());
    });
  });

  dateDoneBtn.addEventListener('click', () => closeDatePopover(true));

  // Close on outside click (composedPath still works if the clicked node was re-rendered)
  document.addEventListener('click', (e) => {
    if (!e.composedPath().includes(dtField)) closeDatePopover();
  });
  // Close when keyboard focus leaves the field
  dtField.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !dtField.contains(e.relatedTarget)) closeDatePopover();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeDatePopover(dtField.contains(document.activeElement));
    closeLocDropdown();
  });

  // Keep the value honest if the tab is left open (slots expire, day rolls over)
  setInterval(() => {
    refreshToday();
    if (isDateOpen()) { renderCalendar(); renderTimes(false); syncQuickChips(); }
  }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshToday();
  });

  // Restore a date/time passed in the URL, then validate it like any other pick.
  // Default: today (or tomorrow if today's done), 8:00 PM or the next open slot.
  (function initDateFromUrl() {
    const d = initParams.get('date');
    const t = parseInt(initParams.get('time'), 10);
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-').map(Number);
      const parsed = new Date(y, m - 1, day);
      if (!Number.isNaN(parsed.getTime())) selectedDate = startOfDay(parsed);
    }
    if (SLOTS.includes(t)) selectedMinutes = t;
  })();
  refreshToday();

  /* ---------- Booking modal (Home, Explore and Blog; other pages get stand-ins) ---------- */
  const RESTAURANTS_BY_ID = new Map((window.TABLEFOR_RESTAURANTS || []).map((r) => [r.id, r]));
  const BOOKING_FEE = window.TABLEFOR_BOOKING_FEE || 100;
  const BOOKINGS_KEY = 'tablefor_bookings';
  const BOOKING_WINDOW_DAYS = 60;       // same booking window as the date picker
  const FREE_CANCEL_MINUTES = 120;      // free cancellation up to 2 hours before
  const PARTY_CAP = 20;                 // matches the search bar's guest limit

  const modalOverlay = byId('restaurantModalOverlay');
  const modalEl = modalOverlay.querySelector('.restaurant-modal') || document.createElement('div'); // pages without the modal get a stand-in
  const modalClose = byId('modalClose');
  const modalPhoto = byId('modalPhoto');
  const modalBookingView = byId('modalBookingView');
  const modalConfirmView = byId('modalConfirmView');
  const modalDate = byId('modalDate');
  const modalTime = byId('modalTime');
  const modalParty = byId('modalBookingGuests');
  const modalAvailability = byId('modalAvailability');
  const modalWarning = byId('modalWarning');
  const modalSubmit = modalBookingView.querySelector('.modal-confirm-btn');
  const modalDoneBtn = byId('modalDoneBtn');
  const modalCalendarBtn = byId('modalCalendarBtn');
  const modalDirections = byId('modalDirections');

  let modalRestaurant = null;
  let modalReturnFocus = null;
  let lastBooking = null;

  const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fromISODate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const shortCity = (city) => (city === 'Clark' ? 'Clark' : shortCityName(city));
  const placeLabel = (r) => (r.area === r.city ? r.city : `${r.area}, ${shortCity(r.city)}`);
  const mapsUrl = (r) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name}, ${r.area === r.city ? '' : `${r.area}, `}${r.city}, Pampanga`)}`;

  // Seating times a restaurant can take on a date (last seating an hour before close)
  function restaurantSlots(r, date) {
    const day = startOfDay(date);
    if (r.paused || r.closedDays.includes(day.getDay())) return [];
    return availableSlots(day).filter((m) => m >= r.hours.open && m <= r.hours.close - 60);
  }

  function dayLabel(date) {
    const d = startOfDay(date);
    if (sameDay(d, today)) return 'Today';
    if (sameDay(d, addDays(today, 1))) return 'Tomorrow';
    return shortDate(d);
  }

  /* -- Bookings kept on this device (the "My bookings" list on Explore) -- */
  function getBookings() {
    try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || []; } catch { return []; }
  }
  function saveBookings(list) {
    try { localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
    document.dispatchEvent(new CustomEvent('tablefor:bookingschange'));
  }
  const bookingStart = (b) => { const d = fromISODate(b.date); d.setMinutes(b.minutes); return d; };
  // Booking status: pending (awaiting the restaurant), confirmed, seated, completed, no-show, cancelled
  const ACTIVE_STATUSES = ['pending', 'confirmed', 'seated'];
  const bookingStatus = (b) => b.status || 'confirmed';
  function upcomingBookings() {
    const now = Date.now();
    return getBookings().filter((b) => ACTIVE_STATUSES.includes(bookingStatus(b)) && bookingStart(b).getTime() > now)
      .sort((a, b) => bookingStart(a) - bookingStart(b));
  }
  // Future bookings the restaurant declined or cancelled, until the diner dismisses them
  function declinedBookings() {
    const now = Date.now();
    return getBookings().filter((b) => bookingStatus(b) === 'cancelled' && b.cancelledBy === 'restaurant' && !b.dismissed
      && bookingStart(b).getTime() > now);
  }
  function cancelBooking(ref) {
    saveBookings(getBookings().filter((b) => b.ref !== ref));
  }
  function makeRef() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = 'TF-';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  /* -- Vouchers: claimed on Home, applied in the booking form -- */
  const VOUCHERS = window.TABLEFOR_VOUCHERS || [];
  const VOUCHERS_KEY = 'tablefor_vouchers_v2'; // v2: every voucher reset to unclaimed
  const VOUCHER_ROUND = 2;                      // bookings made before the reset don't use a voucher up
  const findVoucher = (code) => VOUCHERS.find((v) => v.code === String(code || '').trim().toUpperCase()) || null;
  function claimedCodes() {
    try { return JSON.parse(localStorage.getItem(VOUCHERS_KEY)) || []; } catch { return []; }
  }
  function claimVoucher(code) {
    const list = claimedCodes();
    if (!list.includes(code)) {
      list.push(code);
      try { localStorage.setItem(VOUCHERS_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
    }
    document.dispatchEvent(new CustomEvent('tablefor:voucherschange'));
  }
  // A voucher is single-use: any kept booking (upcoming or already dined) uses it up.
  // Cancelling an upcoming booking removes it, which frees the voucher again.
  const voucherInUse = (code) => getBookings().find((b) => b.voucher === code && b.voucherRound === VOUCHER_ROUND
    && bookingStatus(b) !== 'cancelled') || null;
  const bookingIsPast = (b) => bookingStart(b).getTime() <= Date.now();
  function formatValidUntil(v) {
    const d = fromISODate(v.validUntil);
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  }

  // Why a voucher can't be used for this booking, or null if it can
  function voucherProblem(v, r, dateISO, minutes, party) {
    if (!v) return "That code doesn't match any TableFor voucher.";
    if (!claimedCodes().includes(v.code)) return `Claim ${v.code} in the Vouchers section on the home page first.`;
    if (toISODate(today) > v.validUntil) return `${v.code} expired on ${formatValidUntil(v)}.`;
    if (dateISO > v.validUntil) return `${v.code} is valid for bookings up to ${formatValidUntil(v)}.`;
    if (v.cuisines && !v.cuisines.includes(r.cuisine)) return `${v.code} only works at ${v.cuisines.join(', ')} restaurants.`;
    if ((r.voucherOptOut || []).includes(v.code)) return `${r.name} isn't accepting ${v.code} at the moment.`;
    if (party < v.minParty) return `${v.code} needs a table of ${v.minParty} or more.`;
    if (v.latestTime != null && minutes > v.latestTime) return `${v.code} is for bookings up to ${formatTime(v.latestTime)}.`;
    const inUse = voucherInUse(v.code);
    if (inUse && bookingIsPast(inUse)) return `${v.code} has already been used at ${inUse.name}. Each voucher works once.`;
    if (inUse) return `${v.code} is already on your ${inUse.name} booking. Cancel that booking to use it here.`;
    return null;
  }

  const voucherInput = byId('modalVoucher');
  const voucherApplyBtn = byId('modalVoucherApply');
  const voucherMsg = byId('voucherMsg');
  const voucherSuggest = byId('voucherSuggest');
  let appliedVoucher = null;

  const currentPick = () => [modalRestaurant, modalDate.value, Number(modalTime.value), getParty()];
  function setVoucherMsg(text, kind) {
    voucherMsg.textContent = text;
    voucherMsg.className = `voucher-msg${kind ? ` is-${kind}` : ''}`;
  }
  function syncVoucherUI() {
    voucherInput.readOnly = !!appliedVoucher;
    voucherApplyBtn.textContent = appliedVoucher ? 'Remove' : 'Apply';
    // Claimed vouchers that work for the current pick, one tap to apply
    const usable = appliedVoucher ? [] : claimedCodes().map(findVoucher)
      .filter((v) => v && !voucherProblem(v, ...currentPick()));
    voucherSuggest.innerHTML = usable.length
      ? `<span>Your vouchers:</span>${usable.map((v) => `<button type="button" class="voucher-chip" data-code="${v.code}">${v.code} · ${v.value} ${v.unit}</button>`).join('')}`
      : '';
    voucherSuggest.hidden = !usable.length;
  }
  function applyVoucher(code) {
    const v = findVoucher(code);
    const problem = code.trim() ? voucherProblem(v, ...currentPick()) : 'Enter a voucher code first.';
    if (problem) {
      appliedVoucher = null;
      setVoucherMsg(problem, 'error');
    } else {
      appliedVoucher = v.code;
      voucherInput.value = v.code;
      setVoucherMsg(`${v.code} applied: ${v.value} ${v.unit}. ${v.terms}`, 'ok');
    }
    syncVoucherUI();
    return !problem;
  }
  // Re-check an applied voucher whenever the date, time or party changes
  function recheckVoucher() {
    if (appliedVoucher) {
      const problem = voucherProblem(findVoucher(appliedVoucher), ...currentPick());
      if (problem) { appliedVoucher = null; setVoucherMsg(`Voucher removed: ${problem}`, 'error'); }
    }
    syncVoucherUI();
  }
  function resetVoucher() {
    appliedVoucher = null;
    voucherInput.value = '';
    setVoucherMsg('', '');
    syncVoucherUI();
  }
  byId('modalBookingName2', 'input').addEventListener('input', (e) => e.target.setCustomValidity(''));
  voucherApplyBtn.addEventListener('click', () => {
    if (appliedVoucher) { resetVoucher(); voucherInput.focus(); return; }
    applyVoucher(voucherInput.value);
  });
  voucherInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (!appliedVoucher) applyVoucher(voucherInput.value); }
  });
  voucherInput.addEventListener('input', () => { voucherInput.value = voucherInput.value.toUpperCase(); if (voucherMsg.textContent) setVoucherMsg('', ''); });
  voucherSuggest.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-code]');
    if (chip) applyVoucher(chip.dataset.code);
  });

  /* -- Menu + pre-order (every restaurant shows its menu; pre-order only where offered) -- */
  const menuView = byId('modalMenuView');
  const menuList = byId('modalMenuList');
  const menuTotal = byId('modalMenuTotal', 'p');
  const menuDone = byId('modalMenuDone', 'button');
  const preorderBlock = byId('modalPreorderBlock');
  const preorderValue = byId('modalPreorderValue', 'p');
  const preorderEdit = byId('modalPreorderEdit', 'button');
  let preorder = new Map();          // "cat-item" -> quantity
  let menuReturnsToBooking = false;  // opened from the booking form (vs. from a card)
  const peso = (n) => `₱${n.toLocaleString('en-PH')}`;
  const MAX_QTY = 20;
  const escText = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function menuItems(r) {
    const out = [];
    r.menu.forEach((c, ci) => c.items.forEach((it, ii) => out.push({ key: `${ci}-${ii}`, ...it })));
    return out;
  }
  function preorderLines(r) {
    return menuItems(r).filter((it) => preorder.get(it.key)).map((it) => ({ name: it.name, qty: preorder.get(it.key), price: it.price }));
  }
  const preorderTotal = (lines) => lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const preorderSummary = (lines) => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    return count ? `${count} dish${count === 1 ? '' : 'es'} · ${peso(preorderTotal(lines))}` : '';
  };

  function renderMenu() {
    const r = modalRestaurant;
    const canOrder = !!r.preorder;
    byId('modalMenuName', 'h3').textContent = r.name;
    byId('modalMenuNote', 'p').textContent = canOrder
      ? 'Add dishes to have them ready when you arrive. You pay for them at the restaurant.'
      : "Menu for reference. This restaurant doesn't take pre-orders, but you can still book a table.";
    menuList.innerHTML = r.menu.map((c, ci) => `
      <section class="menu-cat">
        <h4>${escText(c.cat)}</h4>
        <ul>
          ${c.items.map((it, ii) => {
            const key = `${ci}-${ii}`;
            const q = preorder.get(key) || 0;
            return `<li class="menu-item${q ? ' is-added' : ''}">
              <div class="menu-item-text"><span class="menu-item-name">${escText(it.name)}</span>${it.note ? `<span class="menu-item-note">${escText(it.note)}</span>` : ''}</div>
              <span class="menu-item-price">${peso(it.price)}</span>
              ${canOrder ? `<div class="qty" role="group" aria-label="Quantity of ${escText(it.name)}">
                <button type="button" data-qty="-1" data-key="${key}" aria-label="Remove one ${escText(it.name)}"${q ? '' : ' disabled'}>&minus;</button>
                <span aria-live="polite">${q}</span>
                <button type="button" data-qty="1" data-key="${key}" aria-label="Add one ${escText(it.name)}"${q >= MAX_QTY ? ' disabled' : ''}>+</button>
              </div>` : ''}
            </li>`;
          }).join('')}
        </ul>
      </section>`).join('');
    const summary = preorderSummary(preorderLines(r));
    menuTotal.textContent = canOrder ? (summary ? `Pre-order: ${summary}` : 'No dishes added yet') : '';
    menuDone.textContent = canOrder ? (menuReturnsToBooking ? 'Done' : 'Continue to booking') : 'Book a Table';
  }
  function updatePreorderBlock() {
    const r = modalRestaurant;
    preorderBlock.hidden = !(r && r.preorder && r.menu.length);
    if (preorderBlock.hidden) return;
    const text = preorderSummary(preorderLines(r));
    preorderValue.textContent = text || 'No dishes yet';
    preorderEdit.textContent = text ? 'Edit' : 'Add from menu';
  }
  menuList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qty]');
    if (!btn) return;
    const key = btn.dataset.key;
    const next = Math.min(Math.max((preorder.get(key) || 0) + Number(btn.dataset.qty), 0), MAX_QTY);
    if (next) preorder.set(key, next); else preorder.delete(key);
    renderMenu();
    const again = menuList.querySelector(`[data-key="${key}"][data-qty="${btn.dataset.qty}"]`);
    const other = menuList.querySelector(`[data-key="${key}"]:not(:disabled)`);
    (again && !again.disabled ? again : other || menuDone).focus();
  });
  function openMenuView(fromBooking) {
    menuReturnsToBooking = fromBooking;
    renderMenu();
    showModalView(menuView);
  }
  menuDone.addEventListener('click', () => {
    const goToBooking = () => {
      updatePreorderBlock();
      prefillFromAccount();
      showModalView(modalBookingView);
      (modalRestaurant.preorder ? preorderEdit : modalDateBtn).focus({ preventScroll: true });
    };
    // Going from the menu to the booking form needs a signed-in diner too
    if (requireDiner(goToBooking)) goToBooking();
  });
  // Fill in what we know from the account (name once used, or the mobile number signed in with)
  function prefillFromAccount() {
    const acct = getSession();
    if (!acct || acct.role !== 'diner') return;
    const nameIn = byId('modalBookingName2', 'input');
    const phoneIn = byId('modalBookingPhone', 'input');
    if (!nameIn.value && acct.name) nameIn.value = acct.name;
    if (!phoneIn.value && acct.method === 'mobile') phoneIn.value = acct.id;
  }
  preorderEdit.addEventListener('click', () => openMenuView(true));

  /* -- Table layout (optional per restaurant): pick a table on the floor plan -- */
  const tableBlock = byId('modalTableBlock');
  const tableValue = byId('modalTableValue', 'p');
  const tableToggle = byId('modalTableToggle', 'button');
  const tablePanel = byId('modalTablePanel');
  const floor = byId('modalFloor');
  let selectedTable = null;

  // Availability comes from the restaurant's reservations and blocked tables (see store.js)
  function tableTaken(r, dateISO, mins, t) {
    return !window.TableForStore.isTableFree(r.id, dateISO, mins, t.id);
  }
  // Small parties don't take big tables; groups of 7+ can use any table that seats them
  const tableFits = (t, party) => party >= 1 && t.seats >= party && (t.seats - party <= 4 || party >= 7);
  const tableLabel = (t) => `Table ${t.id} · ${t.zone} · ${t.seats} seats`;

  function renderFloor() {
    const r = modalRestaurant;
    const [, dateISO, mins, party] = currentPick();
    const L = r.layout;
    floor.innerHTML = L.features.map((f) =>
      `<span class="floor-feature" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%">${escText(f.label)}</span>`).join('') +
      L.tables.map((t) => {
        const taken = tableTaken(r, dateISO, mins, t);
        const fits = tableFits(t, party);
        const sel = selectedTable === t.id;
        const state = sel ? 'is-selected' : taken ? 'is-taken' : !fits ? 'is-nofit' : 'is-free';
        const status = sel ? 'your pick' : taken ? 'taken' : !fits ? 'not for your group size' : 'available';
        const w = t.shape === 'round' ? 9 : Math.min(8 + t.seats * 1.6, 22);
        return `<button type="button" class="floor-table ${t.shape} ${state}" data-table="${t.id}" style="left:${t.x}%;top:${t.y}%;width:${w}%"${taken || !fits ? ' disabled' : ''} aria-pressed="${sel}" aria-label="Table ${t.id}, ${t.zone}, ${t.seats} seats, ${status}"><span>${t.id}</span><small>${t.seats}</small></button>`;
      }).join('');
  }
  function syncTableValue(note) {
    const t = selectedTable && modalRestaurant.layout.tables.find((x) => x.id === selectedTable);
    tableValue.textContent = note || (t ? tableLabel(t) : 'Any available table');
    tableValue.classList.toggle('is-note', !!note);
  }
  // Keep the pick valid when the date, time or party changes
  function recheckTable() {
    const r = modalRestaurant;
    if (!r || !r.layout) return;
    if (selectedTable) {
      const [, dateISO, mins, party] = currentPick();
      const t = r.layout.tables.find((x) => x.id === selectedTable);
      if (tableTaken(r, dateISO, mins, t) || !tableFits(t, party)) {
        selectedTable = null;
        syncTableValue(`Table ${t.id} isn't free for that time or group size. Please pick another.`);
      }
    }
    if (!tablePanel.hidden) renderFloor();
  }
  tableToggle.addEventListener('click', () => {
    const open = tablePanel.hidden;
    tablePanel.hidden = !open;
    tableToggle.setAttribute('aria-expanded', String(open));
    tableToggle.textContent = open ? 'Hide map' : 'Choose on map';
    if (open) renderFloor();
  });
  floor.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-table]');
    if (!btn || btn.disabled) return;
    selectedTable = selectedTable === btn.dataset.table ? null : btn.dataset.table;
    syncTableValue();
    renderFloor();
    const again = floor.querySelector(`[data-table="${btn.dataset.table}"]`);
    if (again) again.focus();
  });
  function resetExtras(r) {
    preorder = new Map();
    selectedTable = null;
    tableBlock.hidden = !r.layout;
    tablePanel.hidden = true;
    tableToggle.setAttribute('aria-expanded', 'false');
    tableToggle.textContent = 'Choose on map';
    if (r.layout) syncTableValue();
    updatePreorderBlock();
  }

  function showModalView(view) {
    [modalBookingView, byId('modalMenuView'), modalConfirmView].forEach((v) => { v.hidden = v !== view; });
    modalEl.querySelector('.modal-body').scrollTop = 0;
  }

  /* -- Booking date: the same calendar as the search bar, date only -- */
  const modalDateBtn = byId('modalDateBtn');
  const modalDateText = byId('modalDateText');
  const modalCal = byId('modalCal');
  const modalCalGrid = byId('modalCalGrid');
  const modalCalMonth = byId('modalCalMonth');
  const modalCalPrev = byId('modalCalPrev');
  const modalCalNext = byId('modalCalNext');
  const modalCalQuick = byId('modalCalQuick');
  let bookableDates = new Set();   // ISO dates this restaurant can take
  let lastBookable = null;
  let calViewY = 0;
  let calViewM = 0;
  let calFocusISO = null;

  function fillDates(r, wanted) {
    const wantedISO = wanted ? toISODate(startOfDay(wanted)) : toISODate(today);
    bookableDates = new Set();
    let pick = null;
    let first = null;
    for (let i = 0; i <= BOOKING_WINDOW_DAYS; i++) {
      const d = addDays(today, i);
      if (!restaurantSlots(r, d).length) continue;
      const iso = toISODate(d);
      bookableDates.add(iso);
      lastBookable = iso;
      if (!first) first = iso;
      if (!pick && iso >= wantedISO) pick = iso; // the wanted date, or the next one that works
    }
    modalDate.value = pick || first || '';
    const view = modalDate.value ? fromISODate(modalDate.value) : today;
    calViewY = view.getFullYear();
    calViewM = view.getMonth();
    calFocusISO = modalDate.value || null;
    updateDateText();
    return !!first;
  }

  function updateDateText() {
    if (!modalDate.value) { modalDateText.textContent = 'No dates available'; return; }
    const d = fromISODate(modalDate.value);
    const mins = Number(modalTime.value);
    if (sameDay(d, today)) modalDateText.textContent = mins >= EVENING_FROM ? 'Tonight' : 'Today';
    else if (sameDay(d, addDays(today, 1))) modalDateText.textContent = 'Tomorrow';
    else modalDateText.textContent = shortDate(d);
  }

  function renderModalCal() {
    modalCalMonth.textContent = `${MONTH_NAMES[calViewM]} ${calViewY}`;
    modalCalPrev.disabled = calViewY === today.getFullYear() && calViewM === today.getMonth();
    const last = lastBookable ? fromISODate(lastBookable) : today;
    modalCalNext.disabled = calViewY > last.getFullYear() || (calViewY === last.getFullYear() && calViewM >= last.getMonth());

    let html = '';
    const firstDow = new Date(calViewY, calViewM, 1).getDay();
    const days = new Date(calViewY, calViewM + 1, 0).getDate();
    for (let i = 0; i < firstDow; i++) html += '<span class="cal-day is-empty"></span>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(calViewY, calViewM, d);
      const iso = toISODate(date);
      const ok = bookableDates.has(iso);
      const cls = ['cal-day'];
      if (!ok) cls.push('is-disabled');
      if (sameDay(date, today)) cls.push('is-today');
      if (iso === modalDate.value) cls.push('is-selected');
      html += `<button type="button" class="${cls.join(' ')}" data-iso="${iso}" tabindex="${iso === calFocusISO ? 0 : -1}"${ok ? '' : ' disabled'}${sameDay(date, today) ? ' aria-current="date"' : ''} aria-pressed="${iso === modalDate.value}" aria-label="${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[calViewM]} ${d}${ok ? '' : ', no tables'}">${d}</button>`;
    }
    modalCalGrid.innerHTML = html;

    const wk = weekendDate();
    const chips = [['Today', today], ['Tomorrow', addDays(today, 1)], [shortDate(wk), wk]];
    modalCalQuick.innerHTML = chips.map(([label, d]) => {
      const iso = toISODate(d);
      return `<button type="button" class="date-chip${iso === modalDate.value ? ' is-active' : ''}" data-iso="${iso}"${bookableDates.has(iso) ? '' : ' disabled'}>${label}</button>`;
    }).join('');
  }

  function openModalCal() {
    closeModalTimes(false);
    calFocusISO = modalDate.value;
    const v = fromISODate(modalDate.value);
    calViewY = v.getFullYear();
    calViewM = v.getMonth();
    renderModalCal();
    modalCal.hidden = false;
    modalDateBtn.setAttribute('aria-expanded', 'true');
    const btn = modalCalGrid.querySelector('[tabindex="0"]');
    if (btn) btn.focus({ preventScroll: true });
    modalCal.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function closeModalCal(returnFocus) {
    if (modalCal.hidden) return;
    modalCal.hidden = true;
    modalDateBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) modalDateBtn.focus({ preventScroll: true });
  }
  function pickModalDate(iso) {
    if (!bookableDates.has(iso)) return;
    modalDate.value = iso;
    updateDateText();
    closeModalCal(true);
    onModalDateChange();
  }

  modalDateBtn.addEventListener('click', () => (modalCal.hidden ? openModalCal() : closeModalCal(false)));
  // Clicking anywhere else in the form closes the calendar, like the search bar's
  modalEl.addEventListener('click', (e) => {
    const path = e.composedPath();
    if (!modalCal.hidden && !path.includes(modalCal) && !path.includes(modalDateBtn)) closeModalCal(false);
    if (!modalTimePanel.hidden && !path.includes(modalTimePanel) && !path.includes(modalTimeBtn)) closeModalTimes(false);
  });
  modalCalPrev.addEventListener('click', () => { calViewM -= 1; if (calViewM < 0) { calViewM = 11; calViewY -= 1; } renderModalCal(); });
  modalCalNext.addEventListener('click', () => { calViewM += 1; if (calViewM > 11) { calViewM = 0; calViewY += 1; } renderModalCal(); });
  modalCal.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-iso]');
    if (btn && !btn.disabled) pickModalDate(btn.dataset.iso);
  });
  modalCal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeModalCal(true); return; }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step || !e.target.closest('#modalCalGrid')) return;
    e.preventDefault();
    // Move to the next date in that direction that has tables
    let d = fromISODate(calFocusISO || modalDate.value);
    for (let n = 0; n < 70; n++) {
      d = addDays(d, step > 0 ? 1 : -1);
      if (Math.abs(step) === 7 && (n + 1) % 7 !== 0) continue;
      const iso = toISODate(d);
      if (d < today || (lastBookable && iso > lastBookable)) return;
      if (bookableDates.has(iso)) { calFocusISO = iso; break; }
    }
    calViewY = d.getFullYear();
    calViewM = d.getMonth();
    renderModalCal();
    const btn = modalCalGrid.querySelector(`[data-iso="${calFocusISO}"]`);
    if (btn) btn.focus();
  });

  /* -- Booking time: the same slot grid as the search bar, limited to this restaurant's hours -- */
  const modalTimeBtn = byId('modalTimeBtn', 'button');
  const modalTimeText = byId('modalTimeText', 'span');
  const modalTimePanel = byId('modalTimePanel');
  const modalTimeGrid = byId('modalTimeGrid');
  let modalSlots = [];

  function fillTimes(r, wantedMinutes) {
    modalSlots = restaurantSlots(r, fromISODate(modalDate.value));
    if (!modalSlots.length) { modalTime.value = ''; modalTimeText.textContent = 'No times'; return; }
    // Keep the wanted time, or the closest one to it
    const target = modalSlots.reduce((best, m) => (Math.abs(m - wantedMinutes) < Math.abs(best - wantedMinutes) ? m : best), modalSlots[0]);
    setModalTime(target);
    if (!modalTimePanel.hidden) renderModalTimes();
  }
  function setModalTime(m) {
    modalTime.value = String(m);
    modalTimeText.textContent = formatTime(m);
    updateDateText(); // "Today" becomes "Tonight" for evening times
  }
  function renderModalTimes() {
    const cur = Number(modalTime.value);
    modalTimeGrid.innerHTML = modalSlots.map((m) =>
      `<button type="button" class="time-slot${m === cur ? ' is-selected' : ''}" role="option" aria-selected="${m === cur}" data-minutes="${m}">${formatTime(m)}</button>`).join('');
    byId('modalTimeNote', 'span').textContent = modalDate.value === toISODate(today) ? 'Later today only' : '';
  }
  function openModalTimes() {
    closeModalCal(false);
    renderModalTimes();
    modalTimePanel.hidden = false;
    modalTimeBtn.setAttribute('aria-expanded', 'true');
    const sel = modalTimeGrid.querySelector('.is-selected') || modalTimeGrid.querySelector('.time-slot');
    if (sel) {
      modalTimeGrid.scrollTop = sel.offsetTop - modalTimeGrid.offsetTop - modalTimeGrid.clientHeight / 2 + sel.offsetHeight / 2;
      sel.focus({ preventScroll: true });
    }
    modalTimePanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function closeModalTimes(returnFocus) {
    if (modalTimePanel.hidden) return;
    modalTimePanel.hidden = true;
    modalTimeBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) modalTimeBtn.focus({ preventScroll: true });
  }
  modalTimeBtn.addEventListener('click', () => (modalTimePanel.hidden ? openModalTimes() : closeModalTimes(false)));
  modalTimeGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-minutes]');
    if (!btn) return;
    setModalTime(Number(btn.dataset.minutes));
    closeModalTimes(true);
    onModalTimeChange();
  });
  modalTimePanel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeModalTimes(true); return; }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[e.key];
    if (!step) return;
    e.preventDefault();
    const btns = [...modalTimeGrid.querySelectorAll('.time-slot')];
    const at = btns.indexOf(document.activeElement);
    const next = btns[Math.min(Math.max((at < 0 ? 0 : at) + step, 0), btns.length - 1)];
    if (next) next.focus();
  });


  /* -- Party size: type a number, the word "guest(s)" is added for you -- */
  let partyMin = 1;
  let partyMax = PARTY_CAP;
  const partyRange = byId('modalPartyRange');
  const partyWord = (n) => (n === 1 ? 'guest' : 'guests');
  function getParty() {
    const n = parseInt(modalParty.value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  function checkParty() {
    const n = getParty();
    let msg = '';
    if (n && n < partyMin) msg = `${modalRestaurant.name} takes groups of ${partyMin} or more.`;
    else if (n > partyMax) msg = partyMax === PARTY_CAP
      ? `Bookings are capped at ${PARTY_CAP} guests. For bigger groups, call the restaurant.`
      : `${modalRestaurant.name} takes up to ${partyMax} guests through TableFor.`;
    modalParty.setCustomValidity(msg);
  }
  function setParty(n) {
    modalParty.value = n ? `${n} ${partyWord(n)}` : '';
    checkParty();
    // Arrows show the limits: grey out at the restaurant's smallest and largest party
    byId('partyUp', 'button').disabled = n >= partyMax;
    byId('partyDown', 'button').disabled = !n || n <= partyMin;
  }
  function fillParty(r, wantedGuests) {
    partyMin = r.minParty;
    partyMax = Math.min(r.maxParty, PARTY_CAP);
    partyRange.textContent = `(${partyMin}–${partyMax})`;
    setParty(Math.min(Math.max(wantedGuests, partyMin), partyMax));
  }
  modalParty.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(Math.max((getParty() || partyMin - 1) + (e.key === 'ArrowUp' ? 1 : -1), partyMin), partyMax);
      setParty(next);
      modalParty.setSelectionRange(String(next).length, String(next).length);
      recheckVoucher();
      return;
    }
    // Only digits (plus editing and navigation keys) get through
    if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
  });
  modalParty.addEventListener('input', () => {
    const digits = modalParty.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 2);
    const n = digits ? Math.min(Number(digits), PARTY_CAP) : 0; // hard cap: 20 guests
    setParty(n);
    const caret = n ? String(n).length : 0;
    modalParty.setSelectionRange(caret, caret); // caret stays before the word
    recheckVoucher();
    recheckTable();
  });
  function stepParty(delta) {
    const next = Math.min(Math.max((getParty() || partyMin - (delta > 0 ? 1 : 0)) + delta, partyMin), partyMax);
    setParty(next);
    recheckVoucher();
    recheckTable();
  }
  byId('partyUp', 'button').addEventListener('click', () => stepParty(1));
  byId('partyDown', 'button').addEventListener('click', () => stepParty(-1));
  modalParty.addEventListener('focus', () => {
    const len = String(getParty() || '').length;
    requestAnimationFrame(() => modalParty.setSelectionRange(0, len));
  });


  // Explain any change from what was searched, and stop obvious double-bookings
  function validateModal(requested) {
    const r = modalRestaurant;
    const notes = [];
    if (requested) {
      if (requested.guests > r.maxParty) notes.push(`${r.name} takes up to ${r.maxParty} guests through TableFor. For a bigger group, contact the restaurant directly.`);
      const wantedDay = requested.date ? toISODate(startOfDay(requested.date)) : null;
      if (wantedDay && wantedDay !== modalDate.value) notes.push(`No tables on ${dayLabel(requested.date)}, so we've picked the next available date.`);
      else if (requested.minutes != null && Number(modalTime.value) !== requested.minutes) notes.push(`${formatTime(requested.minutes)} isn't available, so we've picked the closest time.`);
    }
    modalAvailability.textContent = notes.join(' ');
    modalAvailability.hidden = !notes.length;

    const date = modalDate.value;
    const mins = Number(modalTime.value);
    const mine = upcomingBookings();
    const duplicate = mine.find((b) => b.id === r.id && b.date === date && b.minutes === mins);
    const clash = mine.find((b) => b.date === date && Math.abs(b.minutes - mins) < 120 && b !== duplicate);
    if (duplicate) {
      modalWarning.textContent = `You already have this table booked (ref ${duplicate.ref}).`;
      modalWarning.className = 'modal-warning is-error';
    } else if (clash) {
      modalWarning.textContent = `Heads up: you have another booking at ${clash.name}, ${formatTime(clash.minutes)} the same day.`;
      modalWarning.className = 'modal-warning';
    }
    modalWarning.hidden = !(duplicate || clash);
    modalSubmit.disabled = !!duplicate;
  }

  function openBooking(id, requested = {}, returnFocusEl = null, startView = 'booking') {
    const r = RESTAURANTS_BY_ID.get(id);
    if (!r || modalOverlay.classList.contains('is-open')) return;
    // Booking needs a signed-in diner; browsing the menu doesn't
    if (startView !== 'menu' && !requireDiner(() => openBooking(id, requested, returnFocusEl, startView))) return;
    modalRestaurant = r;
    modalReturnFocus = returnFocusEl;

    modalPhoto.style.backgroundImage = r.photo ? `url('${r.photo}')` : '';
    byId('modalCuisine').textContent = r.cuisine;
    byId('modalPrice').textContent = '₱'.repeat(r.price);
    byId('modalRestName').textContent = r.name;
    byId('modalLoc').textContent = `${placeLabel(r)}, Pampanga`;
    byId('modalRating').textContent = r.rating.toFixed(1);
    byId('modalReviews').textContent = `(${r.reviews} reviews)`;
    byId('modalDesc').textContent = r.desc;

    modalBookingView.reset();
    const wanted = {
      date: requested.date || selectedDate,
      minutes: requested.minutes != null ? requested.minutes : selectedMinutes,
      guests: requested.guests || guests,
    };
    const hasDates = fillDates(r, wanted.date);
    if (hasDates) fillTimes(r, wanted.minutes);
    fillParty(r, wanted.guests);
    modalBookingView.querySelectorAll('input, select, textarea, button[type="submit"], .modal-date-btn').forEach((el) => { el.disabled = !hasDates; });
    closeModalCal(false);
    closeModalTimes(false);
    if (!hasDates) {
      modalAvailability.textContent = `No tables in the next ${BOOKING_WINDOW_DAYS} days. Please check back soon.`;
      modalAvailability.hidden = false;
      modalWarning.hidden = true;
    } else {
      validateModal(wanted);
    }

    resetVoucher();
    resetExtras(r);
    prefillFromAccount();
    closeLocDropdown();
    closeDatePopover();
    if (startView === 'menu') openMenuView(false); else showModalView(modalBookingView);
    modalOverlay.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      modalOverlay.classList.add('is-open');
      modalClose.focus({ preventScroll: true });
    });
  }

  function onModalDateChange() {
    fillTimes(modalRestaurant, Number(modalTime.value) || selectedMinutes);
    validateModal(null);
    recheckVoucher();
    recheckTable();
  }
  function onModalTimeChange() { validateModal(null); recheckVoucher(); recheckTable(); }

  function closeRestaurantModal() {
    if (!modalOverlay.classList.contains('is-open')) return;
    modalOverlay.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    setTimeout(() => { modalOverlay.hidden = true; }, 250);
    if (modalReturnFocus && modalReturnFocus.isConnected) modalReturnFocus.focus({ preventScroll: true });
  }

  modalBookingView.addEventListener('submit', (e) => {
    e.preventDefault();
    // Names made of spaces or symbols only aren't accepted
    const nameInput = byId('modalBookingName2', 'input');
    const nameOk = /\p{L}.*\p{L}/u.test(nameInput.value.trim());
    nameInput.setCustomValidity(nameOk ? '' : 'Please enter the name the booking is under.');
    if (!modalBookingView.reportValidity()) return;
    validateModal(null);
    if (modalSubmit.disabled) return;
    if (!appliedVoucher && voucherInput.value.trim() && !applyVoucher(voucherInput.value)) {
      voucherInput.focus();
      return;
    }
    const r = modalRestaurant;
    // Restaurants with a floor plan can't be overbooked: use the picked table, or the
    // smallest free table that fits the party
    let tableForBooking = selectedTable;
    if (r.layout) {
      const dISO = modalDate.value;
      const m = Number(modalTime.value);
      const party = getParty();
      if (tableForBooking && tableTaken(r, dISO, m, r.layout.tables.find((t) => t.id === tableForBooking))) tableForBooking = null;
      if (!tableForBooking) {
        const fit = r.layout.tables.filter((t) => tableFits(t, party) && !tableTaken(r, dISO, m, t)).sort((a, b) => a.seats - b.seats)[0];
        if (!fit) {
          modalWarning.textContent = `${r.name} is fully booked at ${formatTime(m)} for ${party === 1 ? '1 guest' : `${party} guests`}. Please try another time.`;
          modalWarning.className = 'modal-warning is-error';
          modalWarning.hidden = false;
          modalTimeBtn.focus();
          return;
        }
        tableForBooking = fit.id;
      }
    }
    const booking = {
      ref: makeRef(),
      id: r.id,
      name: r.name,
      place: placeLabel(r),
      date: modalDate.value,
      minutes: Number(modalTime.value),
      guests: getParty(),
      fullName: byId('modalBookingName2').value.trim(),
      account: (getSession() || {}).id || null,
      phone: byId('modalBookingPhone').value.trim(),
      occasion: byId('modalOccasion').value,
      notes: byId('modalNotes').value.trim(),
      voucher: appliedVoucher,
      voucherRound: VOUCHER_ROUND,
      status: r.approval === 'manual' ? 'pending' : 'confirmed',
      table: tableForBooking,
      preorder: preorderLines(r),
      createdAt: Date.now(),
    };
    saveBookings([...getBookings(), booking]);
    rememberDinerName(booking.fullName);
    lastBooking = booking;

    const when = formatDateTime(fromISODate(booking.date), booking.minutes);
    const pending = booking.status === 'pending';
    byId('modalConfirmTitle', 'h3').textContent = pending ? 'Request sent' : 'Table reserved';
    byId('modalConfirmMsg', 'p').innerHTML = pending
      ? `<strong>${escText(r.name)}</strong> confirms bookings by hand. You'll see it as confirmed in your bookings once they accept.`
      : `Your table at <strong>${escText(r.name)}</strong> is confirmed.`;
    byId('modalConfirmWhen').textContent = when;
    byId('modalConfirmParty').textContent = booking.guests === 1 ? '1 guest' : `${booking.guests} guests`;
    byId('modalConfirmRef').textContent = booking.ref;
    const v = findVoucher(appliedVoucher);
    byId('modalConfirmVoucher').textContent = v ? `${v.code} · ${v.value} ${v.unit}` : '';
    byId('modalConfirmVoucherRow').hidden = !v;
    const tbl = tableForBooking && r.layout ? r.layout.tables.find((x) => x.id === tableForBooking) : null;
    byId('modalConfirmTable').textContent = tbl ? tableLabel(tbl) : '';
    byId('modalConfirmTableRow').hidden = !tbl;
    byId('modalConfirmPreorder').textContent = preorderSummary(booking.preorder);
    byId('modalConfirmPreorderRow').hidden = !booking.preorder.length;
    byId('modalConfirmOccasion').textContent = booking.occasion;
    byId('modalConfirmOccasionRow').hidden = !booking.occasion;
    modalDirections.href = mapsUrl(r);
    showModalView(modalConfirmView);
    modalDoneBtn.focus({ preventScroll: true });
  });

  // "Add to calendar": a standard .ics file that phone and desktop calendars open
  modalCalendarBtn.addEventListener('click', () => {
    if (!lastBooking) return;
    const b = lastBooking;
    const start = bookingStart(b);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const stamp = (d) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
    const escIcs = (s) => String(s).replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TableFor//Booking//EN', 'BEGIN:VEVENT',
      `UID:${b.ref}@tablefor`, `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:${escIcs(`Table at ${b.name}`)}`,
      `LOCATION:${escIcs(`${b.place}, Pampanga`)}`,
      `DESCRIPTION:${escIcs(`TableFor booking ${b.ref} for ${b.guests}. Show this reference when you arrive.`)}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `tablefor-${b.ref}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  modalClose.addEventListener('click', closeRestaurantModal);
  modalDoneBtn.addEventListener('click', closeRestaurantModal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeRestaurantModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('is-open')) closeRestaurantModal();
  });

  // Keep Tab inside the dialog while it's open
  modalOverlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(modalEl.querySelectorAll('button, input, select, textarea, a[href]'))
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* -- Saved restaurants (heart button), remembered across pages and visits -- */
  const SAVED_KEY = 'tablefor_saved';
  let savedIds;
  try { savedIds = new Set(JSON.parse(localStorage.getItem(SAVED_KEY)) || []); } catch { savedIds = new Set(); }
  function persistSaved() {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify([...savedIds])); } catch { /* storage unavailable */ }
  }
  function syncSaveButton(btn, card) {
    const on = savedIds.has(card.dataset.restaurantId);
    const name = card.dataset.name || (RESTAURANTS_BY_ID.get(card.dataset.restaurantId) || {}).name || 'restaurant';
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? `Remove ${name} from saved` : `Save ${name}`);
  }
  function syncSaveButtons(root) {
    (root || document).querySelectorAll('[data-action="save"]').forEach((btn) => {
      const card = btn.closest('[data-restaurant-id]');
      if (card) syncSaveButton(btn, card);
    });
  }
  syncSaveButtons();

  // Cards are just containers — only their buttons/links do anything.
  // Delegated, so it also works for cards the Explore page renders later.
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const card = actionEl.closest('[data-restaurant-id]');
    if (!card) return;
    const id = card.dataset.restaurantId;
    const action = actionEl.dataset.action;

    if (action === 'save') {
      if (savedIds.has(id)) savedIds.delete(id); else savedIds.add(id);
      persistSaved();
      syncSaveButton(actionEl, card);
      document.dispatchEvent(new CustomEvent('tablefor:savedchange'));
    } else if (action === 'book') {
      openBooking(id, {}, actionEl);
    } else if (action === 'menu') {
      openBooking(id, {}, actionEl, 'menu');
    }
    // 'directions' and 'call' are plain links and follow their href.
  });

  /* ============================================================
     SIGN IN (front end only — this is a mock-up, so any correctly
     formatted details are accepted; the format itself is enforced)
     ============================================================ */
  const SESSION_KEY = 'tablefor_session';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MOBILE_RE = /^(\+63|0)9\d{2}\s?\d{3}\s?\d{4}$/;
  const MIN_PASSWORD = 6;

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function setSession(s) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ }
  }
  function initialsFor(s) {
    const source = s.name || (s.method === 'email' ? s.id.split('@')[0] : '');
    const parts = source.replace(/[^\p{L}\s._-]/gu, ' ').split(/[\s._-]+/).filter(Boolean);
    if (!parts.length) return '';
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
  }

  const PERSON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/></svg>';
  const CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  // One dialog, built once, used on every page
  const authOverlay = document.createElement('div');
  authOverlay.className = 'auth-overlay';
  authOverlay.hidden = true;
  authOverlay.innerHTML = `
    <div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <button type="button" class="auth-close" data-auth="close" aria-label="Close">${CLOSE_SVG}</button>

      <form class="auth-view" id="authDiner" novalidate>
        <p class="eyebrow"><span class="dot"></span>Welcome to TableFor</p>
        <h2 id="authTitle">Sign in</h2>
        <p class="auth-reason" id="authReason">Sign in to book tables, keep your vouchers and see your bookings.</p>
        <div class="auth-method" role="group" aria-label="Sign in with">
          <button type="button" class="auth-method-btn" data-method="email" aria-pressed="true">Email</button>
          <button type="button" class="auth-method-btn" data-method="mobile" aria-pressed="false">Mobile number</button>
        </div>
        <label class="modal-field auth-field" data-for="email">
          <span>Email</span>
          <input type="email" name="email" autocomplete="email" placeholder="juan@email.com" inputmode="email">
        </label>
        <label class="modal-field auth-field" data-for="mobile" hidden>
          <span>Mobile number</span>
          <input type="tel" name="mobile" autocomplete="tel" placeholder="0917 123 4567" inputmode="tel">
        </label>
        <label class="modal-field auth-field">
          <span>Password</span>
          <input type="password" name="password" autocomplete="current-password" placeholder="At least ${MIN_PASSWORD} characters">
        </label>
        <p class="auth-error" role="alert" hidden></p>
        <button type="submit" class="btn btn-amber auth-submit">Sign In</button>
        <p class="auth-demo">Demo site: any correctly formatted details will sign you in.</p>

        <div class="auth-owner-cta">
          <div>
            <strong>Own a restaurant?</strong>
            <span>Manage bookings, menus and tables in the Partner Portal.</span>
          </div>
          <button type="button" class="btn btn-outline-dark btn-sm" data-auth="owner">Restaurant Owner Sign In</button>
        </div>
      </form>

      <form class="auth-view" id="authOwner" novalidate hidden>
        <p class="eyebrow"><span class="dot"></span>Partner Portal</p>
        <h2>Restaurant owner sign in</h2>
        <p class="auth-reason">Use the business email your restaurant registered with TableFor.</p>
        <label class="modal-field auth-field">
          <span>Your restaurant</span>
          <select name="restaurant">
            <option value="">Choose your restaurant</option>
            ${[...RESTAURANTS_BY_ID.values()].sort((a, b) => a.name.localeCompare(b.name)).map((r) => `<option value="${r.id}">${escText(r.name)}</option>`).join('')}
          </select>
        </label>
        <label class="modal-field auth-field">
          <span>Business email</span>
          <input type="email" name="email" autocomplete="email" placeholder="owner@restaurant.ph" inputmode="email">
        </label>
        <label class="modal-field auth-field">
          <span>Password</span>
          <input type="password" name="password" autocomplete="current-password" placeholder="At least ${MIN_PASSWORD} characters">
        </label>
        <p class="auth-error" role="alert" hidden></p>
        <button type="submit" class="btn btn-dark auth-submit">Sign In to Partner Portal</button>
        <p class="auth-demo">Demo site: any correctly formatted details will sign you in.</p>
        <button type="button" class="link-arrow auth-back" data-auth="diner"><span aria-hidden="true">&larr;</span> Back to diner sign in</button>
      </form>
    </div>`;
  document.body.appendChild(authOverlay);

  const authDialog = authOverlay.querySelector('.auth-dialog');
  const dinerForm = authOverlay.querySelector('#authDiner');
  const ownerForm = authOverlay.querySelector('#authOwner');
  let authMethod = 'email';
  let authPending = null;       // what to do after a successful sign-in (e.g. open the booking form)
  let authReturnFocus = null;

  function showAuthError(form, msg, field) {
    const box = form.querySelector('.auth-error');
    box.textContent = msg;
    box.hidden = !msg;
    form.querySelectorAll('input, select').forEach((i) => i.removeAttribute('aria-invalid'));
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  function setMethod(method) {
    authMethod = method;
    dinerForm.querySelectorAll('[data-method]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.method === method)));
    dinerForm.querySelector('[data-for="email"]').hidden = method !== 'email';
    dinerForm.querySelector('[data-for="mobile"]').hidden = method !== 'mobile';
    showAuthError(dinerForm, '');
  }
  function showAuthView(view) {
    dinerForm.hidden = view !== 'diner';
    ownerForm.hidden = view !== 'owner';
    const form = view === 'diner' ? dinerForm : ownerForm;
    showAuthError(form, '');
    requestAnimationFrame(() => {
      const first = form.querySelector('input:not([type="hidden"])');
      const visible = [...form.querySelectorAll('input, select')].find((i) => i.offsetParent !== null) || first;
      if (visible) visible.focus();
    });
  }
  function openAuth({ reason = '', view = 'diner', then = null } = {}) {
    authPending = then;
    authReturnFocus = document.activeElement;
    authOverlay.querySelector('#authReason').textContent = reason || 'Sign in to book tables, keep your vouchers and see your bookings.';
    authOverlay.querySelector('#authTitle').textContent = then ? 'Sign in to book' : 'Sign in';
    authOverlay.hidden = false;
    requestAnimationFrame(() => authOverlay.classList.add('is-open'));
    document.documentElement.classList.add('auth-open');
    showAuthView(view);
  }
  function closeAuth(keepPending) {
    if (authOverlay.hidden) return;
    authOverlay.classList.remove('is-open');
    document.documentElement.classList.remove('auth-open');
    setTimeout(() => { authOverlay.hidden = true; }, 200);
    if (!keepPending) authPending = null;
    if (authReturnFocus && authReturnFocus.isConnected) authReturnFocus.focus({ preventScroll: true });
  }

  authOverlay.addEventListener('click', (e) => {
    if (e.target === authOverlay) { closeAuth(); return; }
    const btn = e.target.closest('[data-auth], [data-method]');
    if (!btn) return;
    if (btn.dataset.method) setMethod(btn.dataset.method);
    else if (btn.dataset.auth === 'close') closeAuth();
    else if (btn.dataset.auth === 'owner') showAuthView('owner');
    else if (btn.dataset.auth === 'diner') showAuthView('diner');
  });
  authOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeAuth(); return; }
    if (e.key !== 'Tab') return;
    // Keep keyboard focus inside the dialog
    const items = [...authDialog.querySelectorAll('button, input, select, a[href]')].filter((el) => el.offsetParent !== null && !el.disabled);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  authOverlay.addEventListener('input', (e) => {
    const form = e.target.closest('form');
    if (form) showAuthError(form, '');
  });

  // Diner: the chosen method's format is enforced; any well-formed details are accepted
  dinerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pwd = dinerForm.elements.password;
    let id;
    if (authMethod === 'email') {
      const f = dinerForm.elements.email;
      id = f.value.trim();
      if (!id) return showAuthError(dinerForm, 'Enter your email address.', f);
      if (/^[\d\s+()-]+$/.test(id)) return showAuthError(dinerForm, 'That looks like a phone number. Enter an email address, or choose "Mobile number" above.', f);
      if (!EMAIL_RE.test(id)) return showAuthError(dinerForm, 'Enter a valid email address, like juan@email.com.', f);
    } else {
      const f = dinerForm.elements.mobile;
      id = f.value.trim();
      if (!id) return showAuthError(dinerForm, 'Enter your mobile number.', f);
      if (id.includes('@') || /[a-z]/i.test(id)) return showAuthError(dinerForm, 'That looks like an email. Enter a mobile number, or choose "Email" above.', f);
      if (!MOBILE_RE.test(id)) return showAuthError(dinerForm, 'Enter a PH mobile number, like 0917 123 4567.', f);
    }
    if (pwd.value.length < MIN_PASSWORD) return showAuthError(dinerForm, `Your password needs at least ${MIN_PASSWORD} characters.`, pwd);

    const prev = getSession();
    const sameUser = prev && prev.role === 'diner' && prev.id === id;
    setSession({ role: 'diner', method: authMethod, id, name: sameUser ? prev.name || '' : '', since: Date.now() });
    dinerForm.reset();
    renderAccount();
    const next = authPending;
    authPending = null;
    closeAuth(true);
    showToast('Signed in. Welcome to TableFor!');
    if (next) setTimeout(next, 220); // carry on with what they were doing (e.g. booking)
  });

  // Owner: business email only, then straight to the Partner Portal
  ownerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = ownerForm.elements.email;
    const pwd = ownerForm.elements.password;
    const rest = ownerForm.elements.restaurant;
    const id = f.value.trim();
    if (!rest.value) return showAuthError(ownerForm, 'Choose the restaurant you manage.', rest);
    if (!id) return showAuthError(ownerForm, 'Enter your business email.', f);
    if (!EMAIL_RE.test(id)) return showAuthError(ownerForm, 'Enter a valid business email, like owner@restaurant.ph.', f);
    if (pwd.value.length < MIN_PASSWORD) return showAuthError(ownerForm, `Your password needs at least ${MIN_PASSWORD} characters.`, pwd);
    setSession({ role: 'owner', method: 'email', id, name: '', restaurantId: rest.value, since: Date.now() });
    window.location.href = 'owner.html';
  });

  /* -- Header: "Sign In" button, or a round profile icon once signed in -- */
  const signInLink = document.querySelector('.header-actions .btn-dark');
  const accountWrap = document.createElement('div');
  accountWrap.className = 'account';
  accountWrap.hidden = true;
  if (signInLink) signInLink.after(accountWrap);

  function renderAccount() {
    const s = getSession();
    if (signInLink) {
      signInLink.hidden = !!s;
      signInLink.setAttribute('role', 'button');
    }
    accountWrap.hidden = !s;
    if (!s) { accountWrap.innerHTML = ''; return; }
    const initials = initialsFor(s);
    const roleLabel = s.role === 'owner' ? 'Restaurant owner' : 'Diner';
    accountWrap.innerHTML = `
      <button type="button" class="account-btn${s.role === 'owner' ? ' is-owner' : ''}" aria-haspopup="true" aria-expanded="false" aria-controls="accountMenu" aria-label="Your account (${roleLabel})">
        ${initials ? `<span aria-hidden="true">${escText(initials)}</span>` : PERSON_SVG}
      </button>
      <div class="account-menu" id="accountMenu" hidden>
        <p class="account-who"><strong>${escText(s.name || s.id)}</strong><span>${s.role === 'owner' && RESTAURANTS_BY_ID.get(s.restaurantId) ? escText(RESTAURANTS_BY_ID.get(s.restaurantId).name) : roleLabel}${s.name ? ` · ${escText(s.id)}` : ''}</span></p>
        ${s.role === 'owner'
          ? '<a href="owner.html" class="account-item">Partner Portal</a>'
          : '<a href="explore.html#upcomingBookings" class="account-item">My bookings</a><a href="index.html#vouchers" class="account-item">My vouchers</a>'}
        <button type="button" class="account-item account-signout" data-account="signout">Sign out</button>
      </div>`;
  }
  function setAccountMenu(open) {
    const btn = accountWrap.querySelector('.account-btn');
    const menu = accountWrap.querySelector('.account-menu');
    if (!btn || !menu) return;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }
  if (signInLink) {
    signInLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openAuth();
    });
  }
  accountWrap.addEventListener('click', (e) => {
    if (e.target.closest('.account-btn')) {
      const menu = accountWrap.querySelector('.account-menu');
      setAccountMenu(menu.hidden);
      return;
    }
    if (e.target.closest('[data-account="signout"]')) {
      const wasOwner = (getSession() || {}).role === 'owner';
      clearSession();
      renderAccount();
      showToast('You have signed out.');
      if (wasOwner || document.body.dataset.page === 'owner') window.location.href = 'index.html';
    }
  });
  document.addEventListener('click', (e) => { if (!accountWrap.contains(e.target)) setAccountMenu(false); });
  accountWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setAccountMenu(false); accountWrap.querySelector('.account-btn').focus(); }
  });
  renderAccount();

  // Any button with data-open-auth opens the sign-in dialog ("diner" or "owner")
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-auth]');
    if (btn) { e.preventDefault(); openAuth({ view: btn.dataset.openAuth }); }
  });


  // Booking needs a signed-in diner. Returns true when it's fine to carry on now.
  function requireDiner(then) {
    const s = getSession();
    if (s && s.role === 'diner') return true;
    openAuth({
      reason: s && s.role === 'owner'
        ? "You're signed in as a restaurant owner. Sign in with a diner account to book a table."
        : 'Sign in to book this table. It only takes a moment.',
      then,
    });
    return false;
  }
  // Remember the name used on a booking, so the profile icon shows proper initials
  function rememberDinerName(fullName) {
    const s = getSession();
    if (s && s.role === 'diner' && fullName && !s.name) { s.name = fullName; setSession(s); renderAccount(); }
  }

  /* ---------- Search form (demo: validates, then jumps to results) ---------- */
  const searchCard = document.querySelector('.search-card');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (prefersReducedMotion.matches ? 'auto' : 'smooth');

  function searchToParams() {
    const p = new URLSearchParams();
    const sel = locSelection;
    if (sel) {
      p.set('loc', locInput.value.trim());
      p.set('ltype', sel.type);
      if (sel.city) p.set('city', sel.city);
      if (sel.name) p.set('brgy', sel.name);
      if (typeof sel.lat === 'number') { p.set('lat', sel.lat.toFixed(5)); p.set('lng', sel.lng.toFixed(5)); }
    }
    p.set('date', `${selectedDate.getFullYear()}-${pad2(selectedDate.getMonth() + 1)}-${pad2(selectedDate.getDate())}`);
    p.set('time', String(selectedMinutes));
    p.set('guests', String(guests));
    return p;
  }

  if (searchCard) {
    searchCard.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!hasValidLocation()) { showLocError(); return; }
      closeLocDropdown();
      closeDatePopover();
      if (PAGE === 'explore') {
        // Already on Explore: results update live; the button just takes you to them
        document.dispatchEvent(new CustomEvent('tablefor:searchsubmit'));
        return;
      }
      window.location.href = `explore.html?${searchToParams().toString()}`;
    });
  }

  /* ---------- Opening hours → "Open now · Closes 11 PM" ---------- */
  function shortTime(mins) {
    const m = mins % 1440;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${((h + 11) % 12) + 1}${mm ? `:${pad2(mm)}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
  }
  function openStatus(r) {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const todayClosed = r.closedDays.includes(now.getDay());
    if (!todayClosed && mins >= r.hours.open && mins < r.hours.close) {
      return { open: true, text: 'Open now', detail: `Closes ${shortTime(r.hours.close)}` };
    }
    if (!todayClosed && mins < r.hours.open) return { open: false, text: 'Closed', detail: `Opens ${shortTime(r.hours.open)}` };
    // Find the next day it opens
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      if (!r.closedDays.includes(d.getDay())) {
        const when = i === 1 ? 'tomorrow' : DAY_NAMES[d.getDay()];
        return { open: false, text: todayClosed ? 'Closed today' : 'Closed', detail: `Opens ${when} ${shortTime(r.hours.open)}` };
      }
    }
    return { open: false, text: 'Closed', detail: '' };
  }

  // Call buttons: a real tel: link when a number is listed, otherwise shown as unavailable
  function setCallLink(a, r) {
    if (r.phone) {
      a.href = `tel:${r.phone.replace(/\s+/g, '')}`;
      a.removeAttribute('aria-disabled');
      a.classList.remove('is-disabled');
      a.setAttribute('aria-label', `Call ${r.name}`);
      a.removeAttribute('title');
    } else {
      a.removeAttribute('href');
      a.setAttribute('aria-disabled', 'true');
      a.classList.add('is-disabled');
      a.setAttribute('aria-label', `Call ${r.name} (number not listed yet)`);
      a.title = 'Phone number not listed yet';
    }
  }

  // Home page cards: status and distance come from the same data as Explore
  function hydrateHomeCards() {
    if (PAGE !== 'home') return;
    const point = window.TableFor.getSearch().point;
    document.querySelectorAll('.restaurant-card[data-restaurant-id]').forEach((card) => {
      const r = RESTAURANTS_BY_ID.get(card.dataset.restaurantId);
      if (!r) return;
      const st = openStatus(r);
      const status = card.querySelector('[data-live="status"]');
      const detail = card.querySelector('[data-live="status-detail"]');
      if (status) { status.textContent = st.text; status.classList.toggle('is-open', st.open); status.classList.toggle('is-closed', !st.open); }
      if (detail) detail.textContent = st.detail;
      // "Book a Table" opens this restaurant's card on Explore, carrying the current search
      const book = card.querySelector('.restaurant-book-btn');
      if (book) {
        const params = window.TableFor.searchToParams();
        params.set('avail', '0');
        params.set('focus', r.id);
        book.href = `explore.html?${params.toString()}`;
      }
      const call = card.querySelector('[data-action="call"]');
      if (call) setCallLink(call, r);
      const dist = card.querySelector('.card-distance');
      if (dist && point) {
        const km = haversineKm(point.lat, point.lng, r.lat, r.lng);
        dist.textContent = ` · ${formatDistance(km)}`;
      }
    });
  }

  /* ---------- Shared state for other scripts (Explore page) ---------- */
  window.TableFor = {
    getSession,
    signOut() { clearSession(); window.location.href = 'index.html'; },
    openAuth,
    getSearch() {
      const sel = locSelection;
      let point = null;
      if (sel && sel.type === 'city') point = CITY_CENTRES[sel.city] || null;
      else if (sel && (sel.type === 'barangay' || sel.type === 'current')) point = { lat: sel.lat, lng: sel.lng };
      return {
        valid: hasValidLocation(),
        type: sel ? sel.type : null,
        label: locInput.value.trim(),
        point: point || CITY_CENTRES['Angeles City'],
        date: new Date(selectedDate),
        minutes: selectedMinutes,
        whenLabel: dtInput.value,
        guests,
      };
    },
    searchToParams,
    restaurantSlots,
    dayLabel,
    whenLabel: (date, mins) => formatDateTime(startOfDay(date), mins),
    toISODate,
    formatTime,
    haversineKm,
    formatDistance,
    placeLabel,
    mapsUrl,
    syncSaveButtons,
    isSaved: (id) => savedIds.has(id),
    openBooking,
    openStatus,
    shortTime,
    setCallLink,
    upcomingBookings,
    declinedBookings,
    bookingStatus,
    dismissBooking(ref) { saveBookings(getBookings().map((b) => (b.ref === ref ? { ...b, dismissed: true } : b))); },
    cancelBooking,
    bookingStart,
    FREE_CANCEL_MINUTES,
    BOOKING_FEE,
  };

  // Home page vouchers: claim a code here, enter it when booking
  const escHTML = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function renderHomeVouchers() {
    const grid = document.getElementById('voucherGrid');
    if (!grid) return;
    const claimed = claimedCodes();
    grid.innerHTML = VOUCHERS.filter((v) => toISODate(today) <= v.validUntil).map((v) => {
      const where = v.cuisines ? v.cuisines.join(' · ') : 'Every restaurant';
      const isClaimed = claimed.includes(v.code);
      const inUse = isClaimed && voucherInUse(v.code);
      let foot;
      if (inUse && bookingIsPast(inUse)) foot = `<span class="voucher-status is-used">Used at ${escHTML(inUse.name)}</span>`;
      else if (inUse) foot = `<span class="voucher-status">In use: ${escHTML(inUse.name)}, ${escHTML(formatDateTime(fromISODate(inUse.date), inUse.minutes))}</span>`;
      else if (isClaimed) foot = `<span class="voucher-claimed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>Claimed</span><span class="voucher-code-sm">Code <strong>${v.code}</strong></span>`;
      else foot = `<button type="button" class="btn btn-dark btn-sm" data-voucher="claim" data-code="${v.code}">Claim voucher</button>`;
      return `<article class="voucher${isClaimed ? ' is-claimed' : ''}" data-ticket="${v.code}">
        <div class="voucher-stub"><strong>${escHTML(v.value)}</strong><span>${escHTML(v.unit)}</span></div>
        <div class="voucher-body">
          <p class="voucher-where">${escHTML(where)}</p>
          <h3>${escHTML(v.title)}</h3>
          <p class="voucher-terms">${escHTML(v.terms)} Valid until ${formatValidUntil(v)}.</p>
          <div class="voucher-foot" aria-live="polite">${foot}</div>
        </div>
      </article>`;
    }).join('');
  }
  const voucherGrid = document.getElementById('voucherGrid');
  if (voucherGrid) {
    voucherGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-voucher="claim"]');
      if (!btn) return;
      claimVoucher(btn.dataset.code); // the ticket re-renders as "Claimed"
      const claimed = voucherGrid.querySelector(`[data-ticket="${btn.dataset.code}"] .voucher-claimed`);
      if (claimed) { claimed.setAttribute('tabindex', '-1'); claimed.focus({ preventScroll: true }); }
    });
    document.addEventListener('tablefor:voucherschange', renderHomeVouchers);
    document.addEventListener('tablefor:bookingschange', renderHomeVouchers);
  }

  renderHomeVouchers();

  // Home stats come from the data, so they're always true
  (function fillStats() {
    const list = [...RESTAURANTS_BY_ID.values()];
    const count = document.querySelector('[data-stat="count"]');
    const rating = document.querySelector('[data-stat="rating"]');
    if (!list.length) return;
    if (count) count.textContent = String(list.length);
    if (rating) rating.textContent = `${(list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1)}/5`;
  })();
  hydrateHomeCards();
  document.addEventListener('tablefor:searchchange', hydrateHomeCards);
  setInterval(hydrateHomeCards, 60000);

  /* ---------- Home blog carousel: arrow buttons page through the cards ---------- */
  const blogTrack = document.getElementById('blogTrack');
  if (blogTrack) {
    const prevBtn = document.getElementById('blogPrev');
    const nextBtn = document.getElementById('blogNext');
    const page = () => {
      const card = blogTrack.querySelector('.blog-card');
      const gap = parseFloat(getComputedStyle(blogTrack).columnGap) || 0;
      const perView = card ? Math.max(1, Math.round((blogTrack.clientWidth + gap) / (card.offsetWidth + gap))) : 1;
      return card ? perView * (card.offsetWidth + gap) : blogTrack.clientWidth;
    };
    const syncButtons = () => {
      const max = blogTrack.scrollWidth - blogTrack.clientWidth - 2;
      prevBtn.disabled = blogTrack.scrollLeft <= 2;
      nextBtn.disabled = blogTrack.scrollLeft >= max;
    };
    prevBtn.addEventListener('click', () => blogTrack.scrollBy({ left: -page(), behavior: scrollBehavior() }));
    nextBtn.addEventListener('click', () => blogTrack.scrollBy({ left: page(), behavior: scrollBehavior() }));
    blogTrack.addEventListener('scroll', syncButtons, { passive: true });
    blogTrack.addEventListener('keydown', (e) => {
      if (e.target !== blogTrack) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevBtn.click(); }
    });
    window.addEventListener('resize', syncButtons);
    syncButtons();
  }

  /* ---------- Partner page: application form + live link in the code sample ---------- */
  const partnerForm = document.getElementById('partnerForm');
  if (partnerForm) {
    const status = document.getElementById('partnerStatus');
    partnerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!partnerForm.reportValidity()) return;
      const data = new FormData(partnerForm);
      status.textContent = `Thanks! We've received ${data.get('restaurant')}'s application and will contact you at ${data.get('email')} to arrange a visit.`;
      status.classList.add('is-ok');
      partnerForm.reset();
    });
    partnerForm.addEventListener('input', () => { status.textContent = ''; status.classList.remove('is-ok'); });
  }
  // Pricing: monthly / yearly switch
  const billingBtns = document.querySelectorAll('[data-billing]');
  billingBtns.forEach((btn) => btn.addEventListener('click', () => {
    const mode = btn.dataset.billing;
    billingBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    document.querySelectorAll('.pp-price strong, .pp-bill').forEach((el) => { el.textContent = el.dataset[mode]; });
  }));
  // Section tabs: highlight the section in view
  const ppTabs = document.querySelectorAll('.pp-tab');
  if (ppTabs.length && 'IntersectionObserver' in window) {
    const byId = new Map([...ppTabs].map((t) => [t.getAttribute('href').slice(1), t]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        ppTabs.forEach((t) => { t.classList.remove('is-active'); t.removeAttribute('aria-current'); });
        const tab = byId.get(en.target.id);
        if (tab) { tab.classList.add('is-active'); tab.setAttribute('aria-current', 'location'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const sec = document.getElementById(id); if (sec) spy.observe(sec); });
  }

  /* ---------- Toast: short, polite status messages ---------- */
  let toastEl = document.getElementById('toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    toastEl.className = 'x-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  let toastTimer = null;
  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 3200);
  }
  window.TableFor.showToast = showToast;

  /* ---------- Placeholder links: explain instead of doing nothing ---------- */
  function placeholderMessage(link) {
    const label = (link.getAttribute('aria-label') || link.textContent).trim().toLowerCase();
    if (label.includes('app store') || label.includes('google play')) return 'The TableFor app is coming soon to iOS and Android.';
    if (label.includes('instagram') || label.includes('facebook') || label.includes('twitter')) return 'Our social pages are coming soon.';
    if (label.includes('privacy') || label.includes('terms')) return 'Our privacy policy and terms of service are being finalised.';
    return '';
  }
  document.querySelectorAll('a[href="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (link.getAttribute('href') !== '#') return; // the href may have been filled in since
      e.preventDefault();
      if (link.classList.contains('logo') || link.closest('.nav-list')) {
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        return;
      }
      const msg = placeholderMessage(link);
      if (msg) showToast(msg);
    });
  });

  /* ---------- Scroll-reveal ---------- */
  // Once an element has faded in, the reveal classes are removed so its own hover
  // transitions (cards, buttons) take over again instead of the slow reveal timing.
  const revealEls = document.querySelectorAll('.reveal');
  function finishReveal(el) {
    const cleanup = () => {
      el.classList.remove('reveal', 'is-visible');
      el.style.transitionDelay = '';
    };
    el.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 1200); // fallback if transitionend never fires
  }
  document.querySelectorAll('.reveal-group').forEach((group) => {
    group.querySelectorAll(':scope > .reveal').forEach((el, i) => { el.style.transitionDelay = `${i * 90}ms`; });
  });
  if ('IntersectionObserver' in window && revealEls.length && !prefersReducedMotion.matches) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            finishReveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => { el.classList.remove('reveal'); el.style.transitionDelay = ''; });
  }
})();