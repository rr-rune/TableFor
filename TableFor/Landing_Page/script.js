// ============================================================
// TableFor — Landing Page Interactivity
// ============================================================

(function () {
  'use strict';

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
    updateActiveNav();
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

  /* ---------- Guest stepper in the hero search card ---------- */
  const guestCountEl = document.getElementById('guestCount');
  const guestMinus = document.getElementById('guestMinus');
  const guestPlus = document.getElementById('guestPlus');
  let guests = 2;

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
  });
  guestPlus.addEventListener('click', () => {
    guests = Math.min(GUESTS_MAX, guests + 1);
    renderGuests();
  });
  renderGuests();

  /* ---------- City / neighborhood dropdown ---------- */
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

  const locFieldWrap = document.querySelector('.search-field-loc');
  const locInput = document.getElementById('loc');
  const locClear = document.getElementById('locClear');
  const locDropdown = document.getElementById('locDropdown');
  const locDropdownInner = document.getElementById('locDropdownInner');

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

  function formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
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
  if (navigator.permissions && navigator.permissions.query) {
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

  // The whole "City or Neighborhood" block is one tap target
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
  const dtField = document.querySelector('.search-field-date');
  const dtInput = document.getElementById('dt');
  const datePopover = document.getElementById('datePopover');
  const calMonthLabel = document.getElementById('calMonthLabel');
  const calGrid = document.getElementById('calGrid');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  const timeGrid = document.getElementById('timeGrid');
  const timeNote = document.getElementById('timeNote');
  const dateDoneBtn = document.getElementById('dateDone');
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
    else dayLabel = `${MONTH_NAMES[date.getMonth()]} ${pad2(date.getDate())}`;
    return `${dayLabel}, ${formatTime(mins)}`;
  }

  // Write the current selection into the field (called on every change)
  function commit() {
    dtInput.value = formatDateTime(selectedDate, selectedMinutes);
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
      if (sameDay(dateObj, today)) btn.classList.add('is-today');
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
      if (key === 'weekend') chip.textContent = `${DAY_NAMES[wk.getDay()]}, ${MONTH_NAMES[wk.getMonth()].slice(0, 3)} ${wk.getDate()}`;
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

  // Default: today (or tomorrow if today's done), 8:00 PM or the next open slot
  refreshToday();

  /* ---------- Restaurant detail / booking modal ---------- */
  const modalOverlay = document.getElementById('restaurantModalOverlay');
  const modalClose = document.getElementById('modalClose');
  const modalPhoto = document.getElementById('modalPhoto');
  const modalDetailView = document.getElementById('modalDetailView');
  const modalBookingView = document.getElementById('modalBookingView');
  const modalConfirmView = document.getElementById('modalConfirmView');
  const modalBookBtn = document.getElementById('modalBookBtn');
  const modalBack = document.getElementById('modalBack');
  const modalDoneBtn = document.getElementById('modalDoneBtn');

  function showModalView(view) {
    [modalDetailView, modalBookingView, modalConfirmView].forEach((v) => { v.hidden = v !== view; });
    modalEl && (modalEl.querySelector('.modal-body').scrollTop = 0);
  }

  const modalEl = modalOverlay.querySelector('.restaurant-modal');
  const bookingGuests = document.getElementById('modalBookingGuests');
  let modalReturnFocus = null;

  function syncPartySize() {
    const label = guests >= 6 ? '6+ Guests' : guests === 1 ? '1 Guest' : `${guests} Guests`;
    bookingGuests.value = label;
  }

  function openRestaurantModal(card) {
    if (modalOverlay.classList.contains('is-open')) return;
    modalReturnFocus = card;
    const data = card.dataset;
    modalPhoto.style.backgroundImage = `url('${data.photo}')`;
    document.getElementById('modalCuisine').textContent = data.cuisine;
    document.getElementById('modalPrice').textContent = data.price;
    document.getElementById('modalRestName').textContent = data.name;
    document.getElementById('modalLoc').textContent = data.loc;
    document.getElementById('modalRating').textContent = data.rating;
    document.getElementById('modalReviews').textContent = `(${data.reviews} reviews)`;
    document.getElementById('modalDesc').textContent = data.desc;
    document.getElementById('modalBookingName').textContent = data.name;
    document.getElementById('modalConfirmName').textContent = data.name;
    modalBookingView.reset();
    document.getElementById('modalBookingDate').value = dtInput.value;
    syncPartySize();

    closeLocDropdown();
    closeDatePopover();
    showModalView(modalDetailView);
    modalOverlay.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      modalOverlay.classList.add('is-open');
      modalClose.focus({ preventScroll: true });
    });
  }

  function closeRestaurantModal() {
    if (!modalOverlay.classList.contains('is-open')) return;
    modalOverlay.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    setTimeout(() => { modalOverlay.hidden = true; }, 250);
    if (modalReturnFocus) modalReturnFocus.focus({ preventScroll: true });
  }

  // Keep Tab inside the dialog while it's open
  modalOverlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(modalEl.querySelectorAll('button, input, select, a[href]'))
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.querySelectorAll('.restaurant-card').forEach((card) => {
    card.addEventListener('click', () => openRestaurantModal(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openRestaurantModal(card);
      }
    });

    // Quick actions inside the card (save / book / directions / call) should
    // not also trigger the card's own "open details" click handler.
    card.querySelectorAll('[data-action]').forEach((actionEl) => {
      actionEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = actionEl.dataset.action;

        if (action === 'save') {
          const pressed = actionEl.getAttribute('aria-pressed') === 'true';
          actionEl.setAttribute('aria-pressed', String(!pressed));
          actionEl.setAttribute(
            'aria-label',
            (pressed ? 'Save ' : 'Remove ') + card.dataset.name + (pressed ? '' : ' from saved')
          );
        }

        if (action === 'book') {
          openRestaurantModal(card);
          showModalView(modalBookingView);
          modalReturnFocus = actionEl;
        }
        // 'directions' and 'call' are plain links and follow their href.
      });
      actionEl.addEventListener('keydown', (e) => e.stopPropagation());
    });
  });

  modalClose.addEventListener('click', closeRestaurantModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeRestaurantModal();
  });
  modalBookBtn.addEventListener('click', () => showModalView(modalBookingView));
  modalBack.addEventListener('click', () => showModalView(modalDetailView));
  modalDoneBtn.addEventListener('click', closeRestaurantModal);

  modalBookingView.addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('modalConfirmWhen').textContent =
      `${bookingGuests.value.toLowerCase()}, ${document.getElementById('modalBookingDate').value}`;
    showModalView(modalConfirmView);
    modalDoneBtn.focus({ preventScroll: true });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('is-open')) closeRestaurantModal();
  });

  /* ---------- Search form (demo: validates, then jumps to results) ---------- */
  const searchCard = document.querySelector('.search-card');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (prefersReducedMotion.matches ? 'auto' : 'smooth');

  if (searchCard) {
    const submitBtn = searchCard.querySelector('.search-submit');
    searchCard.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!hasValidLocation()) { showLocError(); return; }
      closeLocDropdown();
      closeDatePopover();
      if (submitBtn.disabled) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Searching…';
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Find Tables';
        document.getElementById('trending').scrollIntoView({ behavior: scrollBehavior() });
      }, 700);
    });
  }

  /* ---------- Placeholder links: don't jump to the top of the page ---------- */
  document.querySelectorAll('a[href="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (link.classList.contains('logo') || link.closest('.nav-list')) {
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
      }
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