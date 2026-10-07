// ============================================================
// TableFor — Explore page
// Data: restaurants.js · Search bar, booking modal and shared helpers:
// window.TableFor (script.js) · This file: filters, sorting, cards,
// upcoming bookings.
// ============================================================

(function () {
  'use strict';

  const TF = window.TableFor;
  const RESTAURANTS = window.TABLEFOR_RESTAURANTS || [];
  if (!TF || !RESTAURANTS.length) {
    // Say what's wrong instead of leaving a blank page (usually restaurants.js is missing)
    const list = document.getElementById('resultsList');
    if (list) {
      list.innerHTML = '<p class="x-load-error">Restaurants couldn\'t be loaded. Check that <code>restaurants.js</code> is in the same folder as <code>explore.html</code>, then refresh.</p>';
    }
    return;
  }

  /* ---------- Elements ---------- */
  const $ = (id) => document.getElementById(id);
  const filterPanel = $('filterPanel');
  const filterBody = $('filterBody');
  const openFiltersBtn = $('openFilters');
  const closeFiltersBtn = $('closeFilters');
  const sheetBackdrop = $('sheetBackdrop');
  const sheetShowBtn = $('sheetShowResults');
  const sheetClearBtn = $('sheetClear');
  const sidebarClearBtn = $('sidebarClear');
  const filterBadge = $('filterBadge');
  const sortSelect = $('sortSelect');
  const keywordInput = $('keywordInput');
  const keywordClear = $('keywordClear');
  const resultsHeading = $('resultsHeading');
  const resultsContext = $('resultsContext');
  const activePills = $('activePills');
  const resultsList = $('resultsList');
  const emptyState = $('emptyState');
  const resultsSection = $('results');
  const bookingsBox = $('upcomingBookings');

  /* ---------- Options ---------- */
  const PRICE_LABEL = (n) => '₱'.repeat(n);
  const SORTS = {
    trending: 'Most booked',
    nearest: 'Nearest',
    rating: 'Top rated',
    price: 'Lowest price',
  };
  const DIST_MAX = 15;               // km; the slider's far right means "any distance"
  const RATING_MIN = 4;              // slider floor, shown as "Any"
  const RATING_MAX = 5;
  const CUISINE_PREVIEW = 6;         // cuisines shown before "Show all"
  const BADGE_TEXT = { 'critics-pick': "Critic's pick", 'local-favourite': 'Local favourite' };

  // Trending rank is global (bookings this week), whatever the sort order
  const RANK = new Map([...RESTAURANTS].sort((a, b) => b.bookingsWeek - a.bookingsWeek).map((r, i) => [r.id, i + 1]));

  // Cuisines, most common first
  const CUISINES = Object.entries(RESTAURANTS.reduce((acc, r) => { acc[r.cuisine] = (acc[r.cuisine] || 0) + 1; return acc; }, {}))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);

  const fold = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* ---------- State ---------- */
  const DEFAULTS = () => ({
    keyword: '', cuisines: new Set(), prices: new Set(),
    maxKm: 0, minRating: 0, availOnly: true, preorder: false, tablemap: false, pets: false, savedOnly: false,
  });
  const state = { ...DEFAULTS(), sort: 'trending' };
  let sortTouched = false;
  let cuisinesExpanded = false;

  function readStateFromUrl() {
    const p = new URLSearchParams(window.location.search);
    state.keyword = (p.get('q') || '').slice(0, 60);
    (p.get('cuisine') || '').split(',').filter((c) => CUISINES.includes(c)).forEach((c) => state.cuisines.add(c));
    (p.get('price') || '').split(',').map(Number).filter((n) => n >= 1 && n <= 4).forEach((n) => state.prices.add(n));
    const pick = (list, v) => (list.includes(v) ? v : 0);
    const dist = Math.round(Number(p.get('dist')));
    state.maxKm = dist >= 1 && dist < DIST_MAX ? dist : 0;
    const rating = Math.round(Number(p.get('rating')) * 10) / 10;
    state.minRating = rating > RATING_MIN && rating <= RATING_MAX ? rating : 0;
    if (p.get('avail') === '0') state.availOnly = false;
    state.preorder = p.get('preorder') === '1';
    state.tablemap = p.get('tables') === '1';
    state.pets = p.get('pets') === '1';
    state.savedOnly = p.get('saved') === '1';
    if (SORTS[p.get('sort')]) { state.sort = p.get('sort'); sortTouched = true; }
    else autoSort();
    if (state.cuisines.size && CUISINES.indexOf([...state.cuisines].pop()) >= CUISINE_PREVIEW) cuisinesExpanded = true;
  }

  // A precise location (barangay / GPS) makes "Nearest" the natural default,
  // until the user picks a sort themselves.
  function autoSort() {
    if (sortTouched) return;
    const t = TF.getSearch().type;
    state.sort = t === 'barangay' || t === 'current' ? 'nearest' : 'trending';
  }

  /* ---------- Per-restaurant helpers ---------- */
  const guestsText = (n) => (n === 1 ? '1 guest' : `${n} guests`);
  const distanceKm = (r, s) => TF.haversineKm(s.point.lat, s.point.lng, r.lat, r.lng);
  const partyFits = (r, s) => s.guests >= r.minParty && s.guests <= r.maxParty;
  const isAvailable = (r, s) => partyFits(r, s) && TF.restaurantSlots(r, s.date).includes(s.minutes);

  function matchesKeyword(r) {
    if (!state.keyword) return true;
    const hay = fold(`${r.name} ${r.cuisine} ${r.style} ${r.area} ${r.city}`);
    return fold(state.keyword).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  }

  function matches(r, s, skip) {
    if (skip !== 'keyword' && !matchesKeyword(r)) return false;
    if (skip !== 'cuisine' && state.cuisines.size && !state.cuisines.has(r.cuisine)) return false;
    if (skip !== 'price' && state.prices.size && !state.prices.has(r.price)) return false;
    if (skip !== 'distance' && state.maxKm && distanceKm(r, s) > state.maxKm) return false;
    if (skip !== 'rating' && state.minRating && r.rating < state.minRating) return false;
    if (skip !== 'avail' && state.availOnly && !isAvailable(r, s)) return false;
    if (skip !== 'preorder' && state.preorder && !r.preorder) return false;
    if (skip !== 'tablemap' && state.tablemap && !r.layout) return false;
    if (skip !== 'pets' && state.pets && !r.petFriendly) return false;
    if (skip !== 'saved' && state.savedOnly && !TF.isSaved(r.id)) return false;
    return true;
  }

  function sortResults(list, s) {
    const byRating = (a, b) => b.rating - a.rating || b.reviews - a.reviews;
    const sorters = {
      trending: (a, b) => b.bookingsWeek - a.bookingsWeek,
      nearest: (a, b) => distanceKm(a, s) - distanceKm(b, s) || byRating(a, b),
      rating: byRating,
      price: (a, b) => a.price - b.price || byRating(a, b),
    };
    return [...list].sort(sorters[state.sort] || sorters.trending);
  }

  function activeFilterCount() {
    return (state.keyword ? 1 : 0) + state.cuisines.size + state.prices.size +
      (state.maxKm ? 1 : 0) + (state.minRating ? 1 : 0) +
      (state.availOnly ? 1 : 0) + (state.preorder ? 1 : 0) + (state.tablemap ? 1 : 0) + (state.pets ? 1 : 0) + (state.savedOnly ? 1 : 0);
  }

  function clearAll() {
    const keepSort = state.sort;
    Object.assign(state, DEFAULTS(), { availOnly: false, sort: keepSort });
    keywordInput.value = '';
  }

  const esc = (str) => String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Filter panel (built once, then kept in sync) ---------- */
  const idFor = (group, value) => `f-${group}-${String(value).replace(/\W+/g, '-')}`;
  function checkRow(group, value, label, extraClass = '') {
    const id = idFor(group, value);
    return `<label class="x-check ${extraClass}" for="${id}">
      <input type="checkbox" id="${id}" data-filter="${group}" value="${esc(value)}">
      <span class="x-check-box" aria-hidden="true"></span>
      <span class="x-check-label">${esc(label)}</span>
      <span class="x-check-count" data-count="${group}:${esc(value)}"></span>
    </label>`;
  }


  function buildFilterPanel() {
    filterBody.innerHTML = `
      <fieldset class="x-fgroup">
        <legend>Availability</legend>
        <label class="x-switch" for="f-avail">
          <span class="x-switch-text"><span class="x-switch-label">Tables for your search</span><span class="x-switch-hint" id="availHint"></span></span>
          <input type="checkbox" role="switch" id="f-avail" data-filter="avail">
          <span class="x-switch-track" aria-hidden="true"><span class="x-switch-thumb"></span></span>
        </label>
        <a class="x-text-btn x-change-search" id="changeSearch" href="index.html">Change date, time or guests</a>
      </fieldset>
      <fieldset class="x-fgroup">
        <legend><label for="f-dist">Distance</label> <output class="x-legend-note x-rating-out" id="distOut" for="f-dist"></output></legend>
        <input type="range" class="x-range" id="f-dist" min="1" max="${DIST_MAX}" step="1" value="${DIST_MAX}">
        <div class="x-range-scale" aria-hidden="true"><span>1km</span><span>8km</span><span>Any</span></div>
      </fieldset>
      <fieldset class="x-fgroup">
        <legend>Cuisine</legend>
        ${CUISINES.map((c, i) => checkRow('cuisine', c, c, i >= CUISINE_PREVIEW ? 'is-extra' : '')).join('')}
        ${CUISINES.length > CUISINE_PREVIEW ? `<button type="button" class="x-text-btn x-more" id="cuisineMore" aria-expanded="false">Show all ${CUISINES.length} cuisines</button>` : ''}
      </fieldset>
      <fieldset class="x-fgroup">
        <legend>Price</legend>
        <div class="x-seg" role="group" aria-label="Price range (pick any)">
          ${[1, 2, 3, 4].map((n) => `<button type="button" class="x-seg-btn" data-filter="price" data-value="${n}" aria-pressed="false" aria-label="Price level ${n} of 4">${PRICE_LABEL(n)}</button>`).join('')}
        </div>
      </fieldset>
      <fieldset class="x-fgroup">
        <legend><label for="f-rating">Minimum rating</label> <output class="x-legend-note x-rating-out" id="ratingOut" for="f-rating"></output></legend>
        <input type="range" class="x-range" id="f-rating" min="${RATING_MIN}" max="${RATING_MAX}" step="0.1" value="${RATING_MIN}">
        <div class="x-range-scale" aria-hidden="true"><span>4.0</span><span>4.5</span><span>5.0</span></div>
      </fieldset>
      <fieldset class="x-fgroup">
        <legend>More</legend>
        ${checkRow('preorder', '1', 'Pre-order available')}
        ${checkRow('tablemap', '1', 'Pick your table')}
        ${checkRow('pets', '1', 'Pet-friendly')}
        ${checkRow('saved', '1', 'Saved restaurants')}
      </fieldset>`;

    filterBody.addEventListener('change', (e) => {
      const input = e.target.closest('input[data-filter]');
      if (!input) return;
      const f = input.dataset.filter;
      if (f === 'cuisine') { if (input.checked) state.cuisines.add(input.value); else state.cuisines.delete(input.value); }
      if (f === 'avail') state.availOnly = input.checked;
      if (f === 'preorder') state.preorder = input.checked;
      if (f === 'tablemap') state.tablemap = input.checked;
      if (f === 'pets') state.pets = input.checked;
      if (f === 'saved') state.savedOnly = input.checked;
      render();
    });
    filterBody.addEventListener('click', (e) => {
      if (e.target.closest('#cuisineMore')) { cuisinesExpanded = !cuisinesExpanded; syncFilterPanel(TF.getSearch()); return; }
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      const v = Number(btn.dataset.value);
      const f = btn.dataset.filter;
      if (f === 'price') { if (state.prices.has(v)) state.prices.delete(v); else state.prices.add(v); }
      render();
    });
    // Sliders update the results live while dragging
    filterBody.addEventListener('input', (e) => {
      if (e.target.id === 'f-dist') {
        const v = Number(e.target.value);
        state.maxKm = v >= DIST_MAX ? 0 : v;
        render();
        return;
      }
      if (e.target.id !== 'f-rating') return;
      const v = Math.round(Number(e.target.value) * 10) / 10;
      state.minRating = v > RATING_MIN ? v : 0;
      render();
    });
  }

  function syncFilterPanel(s) {
    $('f-avail').checked = state.availOnly;
    $('availHint').textContent = `${s.whenLabel}, ${guestsText(s.guests)}`;
    // The search bar lives on Home: open it pre-filled with the current search
    $('changeSearch').href = `index.html?${TF.searchToParams().toString()}#main`;

    filterBody.querySelectorAll('input[data-filter="cuisine"]').forEach((i) => { i.checked = state.cuisines.has(i.value); });
    filterBody.querySelector('input[data-filter="preorder"]').checked = state.preorder;
    filterBody.querySelector('input[data-filter="tablemap"]').checked = state.tablemap;
    filterBody.querySelector('input[data-filter="pets"]').checked = state.pets;
    filterBody.querySelector('input[data-filter="saved"]').checked = state.savedOnly;
    filterBody.querySelectorAll('[data-filter="price"]').forEach((b) => b.setAttribute('aria-pressed', String(state.prices.has(Number(b.dataset.value)))));
    const dSlider = $('f-dist');
    const dv = state.maxKm || DIST_MAX;
    dSlider.value = String(dv);
    dSlider.style.setProperty('--fill', `${((dv - 1) / (DIST_MAX - 1)) * 100}%`);
    $('distOut').textContent = state.maxKm ? `Within ${state.maxKm}km` : '';
    dSlider.setAttribute('aria-valuetext', state.maxKm ? `Within ${state.maxKm} kilometres` : 'Any distance');
    const slider = $('f-rating');
    const rv = state.minRating || RATING_MIN;
    slider.value = String(rv);
    slider.style.setProperty('--fill', `${((rv - RATING_MIN) / (RATING_MAX - RATING_MIN)) * 100}%`);
    const ratingText = state.minRating ? `${state.minRating.toFixed(1)}+ stars` : '';
    $('ratingOut').textContent = ratingText;
    slider.setAttribute('aria-valuetext', state.minRating ? `${state.minRating.toFixed(1)} stars and up` : 'Any rating');

    // Live counts: results you'd get by ticking that option (given everything else)
    const count = (skip, test) => RESTAURANTS.filter((r) => matches(r, s, skip) && test(r)).length;
    const setCount = (input, n) => {
      filterBody.querySelector(`[data-count="${input.dataset.filter}:${input.value}"]`).textContent = n;
      input.closest('.x-check').classList.toggle('is-empty', n === 0 && !input.checked);
    };
    filterBody.querySelectorAll('input[data-filter="cuisine"]').forEach((i) => setCount(i, count('cuisine', (r) => r.cuisine === i.value)));
    setCount(filterBody.querySelector('input[data-filter="preorder"]'), count('preorder', (r) => r.preorder));
    setCount(filterBody.querySelector('input[data-filter="tablemap"]'), count('tablemap', (r) => !!r.layout));
    setCount(filterBody.querySelector('input[data-filter="pets"]'), count('pets', (r) => r.petFriendly));
    setCount(filterBody.querySelector('input[data-filter="saved"]'), count('saved', (r) => TF.isSaved(r.id)));

    // Extra cuisines stay visible while one of them is ticked
    const more = $('cuisineMore');
    const extraChecked = [...state.cuisines].some((c) => CUISINES.indexOf(c) >= CUISINE_PREVIEW);
    filterBody.querySelectorAll('.x-check.is-extra').forEach((row) => { row.hidden = !(cuisinesExpanded || extraChecked); });
    if (more) {
      more.hidden = extraChecked;
      more.textContent = cuisinesExpanded ? 'Show fewer' : `Show all ${CUISINES.length} cuisines`;
      more.setAttribute('aria-expanded', String(cuisinesExpanded));
    }

    const n = activeFilterCount();
    filterBadge.textContent = n ? String(n) : '';
    filterBadge.hidden = !n;
    sidebarClearBtn.disabled = !n;
    sheetClearBtn.disabled = !n;
  }

  /* ---------- Active filter pills ---------- */
  function renderPills(s) {
    const pills = [];
    const add = (label, clear) => pills.push({ label, clear });
    if (state.keyword) add(`“${state.keyword}”`, () => { state.keyword = ''; keywordInput.value = ''; });
    if (state.availOnly) add(`${s.whenLabel}, ${guestsText(s.guests)}`, () => { state.availOnly = false; });
    if (state.maxKm) add(`Within ${state.maxKm}km`, () => { state.maxKm = 0; });
    state.cuisines.forEach((c) => add(c, () => state.cuisines.delete(c)));
    [...state.prices].sort().forEach((p) => add(PRICE_LABEL(p), () => state.prices.delete(p)));
    if (state.minRating) add(`${state.minRating.toFixed(1)}+ stars`, () => { state.minRating = 0; });
    if (state.preorder) add('Pre-order', () => { state.preorder = false; });
    if (state.tablemap) add('Pick your table', () => { state.tablemap = false; });
    if (state.pets) add('Pet-friendly', () => { state.pets = false; });
    if (state.savedOnly) add('Saved', () => { state.savedOnly = false; });

    activePills.innerHTML = pills.map((p, i) =>
      `<button type="button" class="x-pill" data-pill="${i}" aria-label="Remove filter: ${esc(p.label)}">${esc(p.label)}<span aria-hidden="true">&times;</span></button>`
    ).join('') + (pills.length > 1 ? '<button type="button" class="x-pill-clear" data-pill="all">Clear all</button>' : '');
    activePills.hidden = !pills.length;
    activePills.onclick = (e) => {
      const btn = e.target.closest('[data-pill]');
      if (!btn) return;
      if (btn.dataset.pill === 'all') clearAll(); else pills[Number(btn.dataset.pill)].clear();
      render();
    };
  }

  /* ---------- Cards ---------- */
  const ICON = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20.3S3.5 15.4 3.5 9.4A4.9 4.9 0 0 1 12 6.3a4.9 4.9 0 0 1 8.5 3.1c0 6-8.5 10.9-8.5 10.9Z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.2"/></svg>',
    directions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3,11 21,3 13,21 11,13 3,11"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/><path d="M7 8h2M7 11h2M15 8h2M15 11h2"/></svg>',
    layout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><circle cx="8.5" cy="8.5" r="1.8"/><rect x="13" y="7" width="4.5" height="3" rx="0.8"/><rect x="7" y="14" width="10" height="3.5" rx="0.8"/></svg>',
    paw: '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="7" cy="9" rx="1.9" ry="2.4"/><ellipse cx="12" cy="6.6" rx="1.9" ry="2.4"/><ellipse cx="17" cy="9" rx="1.9" ry="2.4"/><ellipse cx="19.3" cy="13.6" rx="1.6" ry="2"/><path d="M12 11.2c-3 0-6.2 4.3-6.2 6.6 0 1.6 1.2 2.4 2.7 2.4 1.4 0 2.2-.8 3.5-.8s2.1.8 3.5.8c1.5 0 2.7-.8 2.7-2.4 0-2.3-3.2-6.6-6.2-6.6Z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5v6A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M15.5 14.3c2.8.4 4.9 2.5 5 5.7"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 4h3.7l1.6 4.5-2 1.7a12.3 12.3 0 0 0 6 6l1.7-2 4.5 1.6v3.7c0 1-.9 1.8-1.9 1.7A16.5 16.5 0 0 1 3 5.9C2.9 4.9 3.7 4 4.5 4Z"/></svg>',
  };

  function badgesFor(r) {
    const out = [];
    const rank = RANK.get(r.id);
    if (rank <= 3) out.push(`<span class="x-badge x-badge-hot">#${rank} most booked</span>`);
    if (r.fillingFast) out.push('<span class="x-badge x-badge-hot">Seats filling fast</span>');
    if (r.isNew) out.push('<span class="x-badge x-badge-new">New this month</span>');
    if (r.badge) out.push(`<span class="x-badge x-badge-light">${BADGE_TEXT[r.badge]}</span>`);
    return out.slice(0, 1).join(''); // one badge keeps the photo clean
  }

  // Only shown when the restaurant can't take the search
  const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  function availabilityLine(r, s) {
    if (isAvailable(r, s)) return ''; // nothing to flag
    let why;
    if (r.paused) why = 'Not taking online bookings right now';
    else if (!partyFits(r, s)) why = `Takes up to ${r.maxParty} guests`;
    else if (r.closedDays.includes(s.date.getDay())) why = `Closed on ${DAYS[s.date.getDay()]}`;
    else why = `No tables at ${TF.formatTime(s.minutes)}`;
    return `<p class="x-avail is-no">${esc(why)}</p>`;
  }

  function cardHTML(r, s) {
    const st = TF.openStatus(r);
    const dist = TF.formatDistance(distanceKm(r, s));
    const cap = Math.min(r.maxParty, 20);
    return `<article class="x-card" id="r-${esc(r.id)}" data-restaurant-id="${esc(r.id)}" data-name="${esc(r.name)}">
      <div class="x-card-media">
        <img src="${esc(r.photo)}" alt="${esc(r.name)}" loading="lazy" decoding="async">
        <div class="x-badges">${badgesFor(r)}</div>
        <div class="x-media-actions">
          <button type="button" class="x-round-btn" data-share="${esc(r.id)}" aria-label="Share ${esc(r.name)}">${ICON.share}</button>
          <button type="button" class="save-btn" data-action="save" aria-pressed="false" aria-label="Save ${esc(r.name)}">${ICON.heart}</button>
        </div>
      </div>
      <div class="x-card-body">
        <div class="x-kicker">
          <span class="x-cuisine">${esc(r.cuisine)} <span aria-hidden="true">&middot;</span> ${esc(r.style)}</span>
          <span class="x-rating"><span class="stars" aria-hidden="true">&#9733;</span> ${r.rating.toFixed(1)} <span class="reviews">(${r.reviews})</span></span>
        </div>
        <h3 title="${esc(r.name)}">${esc(r.name)}</h3>
        <p class="x-place"><span class="pin-icon" aria-hidden="true">${ICON.pin}</span><span>${esc(TF.placeLabel(r))}</span><span class="x-dist"${r.approxLocation ? ' title="Approximate: city-level location"' : ''}>${dist}</span></p>
        <p class="x-desc">${esc(r.desc)}</p>
        <ul class="x-facts">
          <li><span class="x-fact-icon" aria-hidden="true">${ICON.clock}</span><span class="status ${st.open ? 'is-open' : 'is-closed'}">${st.text}</span>${st.detail ? `<span class="x-fact-muted">${st.detail}</span>` : ''}</li>
          <li><span class="x-fact-icon" aria-hidden="true">${ICON.people}</span>Up to ${cap} guests</li>
          ${r.preorder ? `<li><span class="x-fact-icon" aria-hidden="true">${ICON.bag}</span>Pre-order</li>` : ''}
          ${r.layout ? `<li><span class="x-fact-icon" aria-hidden="true">${ICON.layout}</span>Pick your table</li>` : ''}
          ${r.petFriendly ? `<li><span class="x-fact-icon" aria-hidden="true">${ICON.paw}</span>Pet-friendly</li>` : ''}
        </ul>
        ${availabilityLine(r, s)}
        <div class="x-card-foot">
          <a class="icon-btn" data-action="call" data-call="${esc(r.id)}">${ICON.phone}</a>
          <a class="icon-btn" href="${TF.mapsUrl(r)}" target="_blank" rel="noopener" aria-label="Directions to ${esc(r.name)} (opens Google Maps)" data-action="directions">${ICON.directions}</a>
          <button type="button" class="icon-btn" data-action="menu" aria-label="See the menu for ${esc(r.name)}">${ICON.menu}</button>
          <button type="button" class="btn btn-amber btn-sm x-book" data-action="book">Book a Table</button>
        </div>
      </div>
    </article>`;
  }

  /* ---------- Share a restaurant (native share sheet, or copy the link) ---------- */
  const toast = document.getElementById('toast');
  let toastTimer = null;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }
  resultsList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-share]');
    if (!btn) return;
    const r = RESTAURANTS.find((x) => x.id === btn.dataset.share);
    const url = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(r.name)}&avail=0`;
    const data = { title: `${r.name} on TableFor`, text: `${r.name}, ${TF.placeLabel(r)}`, url };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(url);
      showToast('Link copied');
    } catch (err) {
      if (err && err.name === 'AbortError') return; // share sheet dismissed
      showToast('Could not copy the link');
    }
  });

  // If a photo fails to load, fall back to a neutral placeholder
  resultsList.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const name = (img.closest('.x-card') || {}).dataset?.name || '';
    const ph = document.createElement('div');
    ph.className = 'x-photo-placeholder';
    ph.setAttribute('aria-hidden', 'true');
    ph.innerHTML = `<span class="x-monogram">${esc(name.charAt(0))}</span>`;
    img.replaceWith(ph);
  }, true);

  /* ---------- Empty state ---------- */
  function renderEmpty(s) {
    const fixes = [];
    if (state.keyword) fixes.push(['keyword', `Clear “${state.keyword}”`]);
    if (state.availOnly) fixes.push(['avail', 'Show every time']);
    if (state.maxKm) fixes.push(['distance', 'Any distance']);
    const why = state.availOnly
      ? `Nothing matches for <strong>${esc(s.whenLabel)}</strong>, ${guestsText(s.guests)}, with these filters.`
      : 'Nothing matches all of these filters.';
    emptyState.innerHTML = `
      <h3>No tables match yet</h3>
      <p>${why} Try loosening one.</p>
      <div class="x-empty-actions">
        ${fixes.map(([k, l]) => `<button type="button" class="btn btn-outline-dark btn-sm" data-empty="${k}">${esc(l)}</button>`).join('')}
        <button type="button" class="btn btn-dark btn-sm" data-empty="all">Clear all filters</button>
      </div>`;
  }
  emptyState.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-empty]');
    if (!btn) return;
    const k = btn.dataset.empty;
    if (k === 'keyword') { state.keyword = ''; keywordInput.value = ''; }
    if (k === 'avail') state.availOnly = false;
    if (k === 'distance') state.maxKm = 0;
    if (k === 'all') clearAll();
    render();
  });

  /* ---------- Upcoming bookings (made on this device) ---------- */
  let confirmingRef = null;
  function renderBookings() {
    const list = TF.upcomingBookings();
    const declined = TF.declinedBookings();
    bookingsBox.hidden = !list.length && !declined.length;
    if (bookingsBox.hidden) { bookingsBox.innerHTML = ''; return; }
    const now = Date.now();
    bookingsBox.innerHTML = `
      <h2 class="x-bookings-title">Your upcoming bookings <span>${list.length + declined.length}</span></h2>
      <ul class="x-bookings-list">
        ${list.map((b) => {
          const r = RESTAURANTS.find((x) => x.id === b.id);
          const start = TF.bookingStart(b);
          const late = start.getTime() - now < TF.FREE_CANCEL_MINUTES * 60000;
          const when = TF.whenLabel(start, b.minutes);
          const confirming = confirmingRef === b.ref;
          return `<li class="x-booking${confirming ? ' is-confirming' : ''}" data-ref="${esc(b.ref)}">
            ${r && r.photo ? `<img src="${esc(r.photo)}" alt="" class="x-booking-thumb">` : '<span class="x-booking-thumb" aria-hidden="true"></span>'}
            <div class="x-booking-text">
              <strong>${esc(b.name)} ${TF.bookingStatus(b) === 'pending' ? '<span class="x-status-chip is-pending">Awaiting confirmation</span>' : '<span class="x-status-chip is-confirmed">Confirmed</span>'}</strong>
              <span>${esc(when)} · ${guestsText(b.guests)} · Ref ${esc(b.ref)}${b.voucher ? ` · ${esc(b.voucher)}` : ''}</span>
              ${confirming ? `<span class="x-booking-warn">${late ? `Less than 2 hours to go, so your ₱${TF.BOOKING_FEE} deposit goes to the restaurant.` : `Your ₱${TF.BOOKING_FEE} deposit will be refunded in full.`}</span>` : ''}
            </div>
            <div class="x-booking-actions">
              ${confirming
                ? `<button type="button" class="btn btn-dark btn-sm" data-booking="cancel-yes">Cancel booking</button>
                   <button type="button" class="btn btn-outline-dark btn-sm" data-booking="cancel-no">Keep it</button>`
                : `<button type="button" class="x-text-btn" data-booking="details">View details</button>
                   ${r ? `<a class="x-text-btn" href="${TF.mapsUrl(r)}" target="_blank" rel="noopener">Directions</a>` : ''}
                   <button type="button" class="x-text-btn" data-booking="cancel">Cancel</button>`}
            </div>
          </li>`;
        }).join('')}
        ${declined.map((b) => `<li class="x-booking is-declined" data-ref="${esc(b.ref)}">
            <span class="x-booking-thumb" aria-hidden="true"></span>
            <div class="x-booking-text">
              <strong>${esc(b.name)} <span class="x-status-chip is-declined">Declined by the restaurant</span></strong>
              <span>${esc(TF.whenLabel(TF.bookingStart(b), b.minutes))} · ${guestsText(b.guests)} · Ref ${esc(b.ref)}. Your ₱${TF.BOOKING_FEE} deposit will be refunded in full.</span>
            </div>
            <div class="x-booking-actions">
              <button type="button" class="x-text-btn" data-booking="dismiss">Dismiss</button>
            </div>
          </li>`).join('')}
      </ul>`;
  }
  bookingsBox.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-booking]');
    if (!btn) return;
    const ref = btn.closest('[data-ref]').dataset.ref;
    const act = btn.dataset.booking;
    if (act === 'details') { TF.openBookingDetails(ref); return; }
    if (act === 'cancel') confirmingRef = ref;
    if (act === 'cancel-no') confirmingRef = null;
    if (act === 'cancel-yes') { confirmingRef = null; TF.cancelBooking(ref); return; } // re-renders via event
    if (act === 'dismiss') { TF.dismissBooking(ref); return; }
    renderBookings();
    const again = bookingsBox.querySelector(`[data-ref="${ref}"] [data-booking]`);
    if (again) again.focus();
  });
  document.addEventListener('tablefor:bookingschange', renderBookings);
  // A booking thumbnail that fails to load becomes a plain tile
  bookingsBox.addEventListener('error', (e) => {
    if (e.target instanceof HTMLImageElement) {
      const tile = document.createElement('span');
      tile.className = 'x-booking-thumb';
      tile.setAttribute('aria-hidden', 'true');
      e.target.replaceWith(tile);
    }
  }, true);

  /* ---------- URL (any filtered view can be shared or bookmarked) ---------- */
  function syncUrl() {
    const p = TF.searchToParams();
    if (state.keyword) p.set('q', state.keyword);
    if (state.cuisines.size) p.set('cuisine', [...state.cuisines].join(','));
    if (state.prices.size) p.set('price', [...state.prices].sort().join(','));
    if (state.maxKm) p.set('dist', String(state.maxKm));
    if (state.minRating) p.set('rating', String(state.minRating));
    if (!state.availOnly) p.set('avail', '0');
    if (state.preorder) p.set('preorder', '1');
    if (state.tablemap) p.set('tables', '1');
    if (state.pets) p.set('pets', '1');
    if (state.savedOnly) p.set('saved', '1');
    if (sortTouched) p.set('sort', state.sort);
    history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
  }

  /* ---------- Render ---------- */
  function render() {
    const s = TF.getSearch();
    const results = sortResults(RESTAURANTS.filter((r) => matches(r, s)), s);

    syncFilterPanel(s);
    renderPills(s);
    sortSelect.value = state.sort;
    keywordClear.hidden = !keywordInput.value;

    const total = RESTAURANTS.length;
    resultsHeading.textContent = results.length === total ? `${total} restaurants` : `${results.length} of ${total} restaurants`;
    resultsContext.textContent = `${SORTS[state.sort]} · from ${s.type === 'current' ? 'your location' : s.label}`;
    sheetShowBtn.textContent = results.length === 1 ? 'Show 1 restaurant' : `Show ${results.length} restaurants`;

    resultsList.innerHTML = results.map((r) => cardHTML(r, s)).join('');
    TF.syncSaveButtons(resultsList);
    resultsList.querySelectorAll('[data-call]').forEach((a) => TF.setCallLink(a, RESTAURANTS.find((r) => r.id === a.dataset.call)));
    resultsList.hidden = !results.length;
    emptyState.hidden = !!results.length;
    if (!results.length) renderEmpty(s);
    syncUrl();
  }

  /* ---------- Sort + keyword ---------- */
  sortSelect.innerHTML = Object.entries(SORTS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; sortTouched = true; render(); });

  let keywordTimer = null;
  keywordInput.addEventListener('input', () => {
    keywordClear.hidden = !keywordInput.value;
    clearTimeout(keywordTimer);
    keywordTimer = setTimeout(() => { state.keyword = keywordInput.value.trim().slice(0, 60); render(); }, 150);
  });
  keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && keywordInput.value) { e.stopPropagation(); keywordInput.value = ''; state.keyword = ''; render(); }
  });
  keywordClear.addEventListener('click', () => { keywordInput.value = ''; state.keyword = ''; render(); keywordInput.focus(); });

  /* ---------- Mobile filter sheet ---------- */
  function openSheet() {
    filterPanel.classList.add('is-open');
    sheetBackdrop.hidden = false;
    requestAnimationFrame(() => sheetBackdrop.classList.add('is-open'));
    document.body.classList.add('modal-open');
    openFiltersBtn.setAttribute('aria-expanded', 'true');
    closeFiltersBtn.focus({ preventScroll: true });
  }
  function closeSheet(returnFocus = true) {
    if (!filterPanel.classList.contains('is-open')) return;
    filterPanel.classList.remove('is-open');
    sheetBackdrop.classList.remove('is-open');
    setTimeout(() => { sheetBackdrop.hidden = true; }, 250);
    document.body.classList.remove('modal-open');
    openFiltersBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) openFiltersBtn.focus({ preventScroll: true });
  }
  openFiltersBtn.addEventListener('click', openSheet);
  closeFiltersBtn.addEventListener('click', () => closeSheet());
  sheetBackdrop.addEventListener('click', () => closeSheet());
  sheetShowBtn.addEventListener('click', () => { closeSheet(false); resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  sheetClearBtn.addEventListener('click', () => { clearAll(); render(); });
  sidebarClearBtn.addEventListener('click', () => { clearAll(); render(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => { if (e.matches) closeSheet(false); });

  /* ---------- Search bar → results ---------- */
  let pending = null;
  document.addEventListener('tablefor:searchchange', (e) => {
    if (e.detail && e.detail.reason === 'location') autoSort();
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = null; render(); });
  });
  document.addEventListener('tablefor:searchsubmit', () => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    resultsSection.focus({ preventScroll: true });
  });
  document.addEventListener('tablefor:savedchange', () => { if (state.savedOnly) render(); else syncFilterPanel(TF.getSearch()); });

  // Opening hours, time slots and bookings move with the clock
  // (skipped while someone is using a card, so focus isn't pulled away)
  setInterval(() => {
    const busy = resultsList.contains(document.activeElement) || document.body.classList.contains('modal-open');
    if (!busy) render();
    if (!confirmingRef) renderBookings();
  }, 60000);

  /* ---------- Arriving from a Home card: show that restaurant's card ---------- */
  const focusId = new URLSearchParams(window.location.search).get('focus');
  function focusCard() {
    if (!focusId || !RESTAURANTS.some((r) => r.id === focusId)) return;
    let card = document.getElementById(`r-${focusId}`);
    if (!card) { clearAll(); render(); card = document.getElementById(`r-${focusId}`); } // make sure it isn't filtered out
    if (!card) return;
    card.classList.add('is-focused');
    requestAnimationFrame(() => card.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    const book = card.querySelector('[data-action="book"]');
    if (book) setTimeout(() => book.focus({ preventScroll: true }), 600);
    setTimeout(() => card.classList.remove('is-focused'), 3200);
  }

  /* ---------- Init ---------- */
  buildFilterPanel();
  readStateFromUrl();
  keywordInput.value = state.keyword;
  render();
  renderBookings();
  focusCard();
})();
