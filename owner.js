// ============================================================
// TableFor — Partner Portal (owner.js)
// Everything a restaurant owner manages, front end only.
// Data: store.js (window.TableForStore) · Session: script.js (window.TableFor)
// ============================================================

(function () {
  'use strict';

  const TF = window.TableFor;
  const S = window.TableForStore;
  if (!TF || !S || document.body.dataset.page !== 'owner') return;

  const session = TF.getSession();
  const rid = session && session.role === 'owner' ? session.restaurantId : null;
  const R = rid ? (window.TABLEFOR_RESTAURANTS || []).find((x) => x.id === rid) : null;
  if (!R) {
    // Signed-in owners from before restaurants were linked to accounts: ask them to sign in again
    if (session && session.role === 'owner') {
      document.querySelector('.op-locked-card p:not(.eyebrow)').textContent = 'Please sign in again and choose the restaurant you manage.';
    } else if (session && session.role === 'diner') {
      document.querySelector('.op-locked-card p:not(.eyebrow)').textContent = `You're signed in as a diner (${session.id}). Only one account can be signed in at a time, so sign out first to use the Partner Portal.`;
    }
    return;
  }

  /* ---------- Constants and helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const content = $('opContent');
  const drawer = $('opDrawer');
  const drawerBody = $('opDrawerBody');
  const drawerBackdrop = $('opDrawerBackdrop');
  const PARTY_CAP = 20;
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', seated: 'Seated', completed: 'Completed', 'no-show': 'No-show', cancelled: 'Cancelled' };
  const SOURCE_LABEL = { tablefor: 'TableFor', sample: 'TableFor', phone: 'Phone', 'walk-in': 'Walk-in' };
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const peso = (n) => `₱${Number(n).toLocaleString('en-PH')}`;
  const pad2 = (n) => String(n).padStart(2, '0');
  function fmtTime(mins) {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${pad2(((h + 11) % 12) + 1)}:${pad2(m)} ${h < 12 ? 'AM' : 'PM'}`;
  }
  function fmtDay(dateIso) {
    const today = S.todayIso();
    if (dateIso === today) return 'Today';
    if (dateIso === S.addDaysIso(today, 1)) return 'Tomorrow';
    if (dateIso === S.addDaysIso(today, -1)) return 'Yesterday';
    const d = S.fromIso(dateIso);
    return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  const fullDay = (dateIso) => { const d = S.fromIso(dateIso); return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const nowMins = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const guestsText = (n) => (n === 1 ? '1 guest' : `${n} guests`);
  const isToday = (dateIso) => dateIso === S.todayIso();
  const startMs = (x) => S.startMs(x.date, x.minutes);
  const toast = (t) => TF.showToast && TF.showToast(t);
  const phoneOk = (p) => /^(\+63|0)9\d{2}\s?\d{3}\s?\d{4}$/.test(p.trim());
  const contactOk = (p) => /^\+?[\d\s()-]{7,}$/.test(p.trim());   // mobile or landline

  const ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
  };

  // Seating times the restaurant can take on a date (last seating an hour before close)
  function daySlots(dateIso) {
    if (R.closedDays.includes(S.fromIso(dateIso).getDay())) return [];
    const out = [];
    for (let m = R.hours.open; m <= R.hours.close - 60; m += 30) out.push(m);
    return out;
  }
  const tableFits = (t, party) => t.seats >= party && (t.seats - party <= 4 || party >= 7); // same rule as the diner side
  const allRes = () => S.reservationsFor(rid);
  const resOn = (dateIso) => allRes().filter((x) => x.date === dateIso);
  const activeOn = (dateIso) => resOn(dateIso).filter((x) => S.ACTIVE.includes(x.status));

  /* ---------- State ---------- */
  const state = {
    view: 'dashboard',
    date: S.todayIso(),
    statusFilter: 'all',
    query: '',
    floorDate: S.todayIso(),
    floorTime: null,
    floorPick: null,
    menuDraft: null,       // unsaved menu edits
    menuDirty: false,
  };

  /* ---------- Show the portal ---------- */
  document.querySelectorAll('[data-owner="locked"]').forEach((el) => { el.hidden = true; });
  document.querySelectorAll('[data-owner="app"]').forEach((el) => { el.hidden = false; });
  $('opPublicLink').href = `explore.html?focus=${encodeURIComponent(R.id)}&avail=0`;

  function renderVenue() {
    $('opVenue').innerHTML = `
      ${R.photo ? `<img src="${esc(R.photo)}" alt="" class="op-venue-photo" onerror="this.remove()">` : ''}
      <div>
        <strong>${esc(R.name)}</strong>
        <span>${esc(R.cuisine)} · ${esc(R.area)}</span>
        <span class="op-pill ${R.paused ? 'is-paused' : 'is-live'}">${R.paused ? 'Online bookings paused' : 'Taking bookings'}</span>
      </div>
      <button type="button" class="op-guide-btn" data-guide="open" aria-label="Open the portal guide" title="Portal guide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.1-2.4 3.6"/><circle cx="12" cy="17.2" r="0.6" fill="currentColor"/></svg>
        <span>Portal guide</span>
      </button>`;
    const pending = allRes().filter((x) => x.status === 'pending' && startMs(x) > Date.now()).length;
    const badge = $('opPendingBadge');
    badge.hidden = !pending;
    badge.textContent = pending;
    badge.setAttribute('aria-label', `${pending} waiting for approval`);
  }

  function setView(view) {
    if (state.view === 'menu' && state.menuDirty && view !== 'menu'
      && !window.confirm('You have unsaved menu changes. Leave without saving?')) return;
    if (view !== 'menu') { state.menuDraft = null; state.menuDirty = false; }
    state.view = view;
    document.querySelectorAll('.op-nav-item').forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle('is-active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (window.location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
    render();
    content.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }

  function render() {
    // Keep unsaved menu typing when anything else re-renders the page
    if (state.view === 'menu' && state.menuDraft && $('opMenuForm')) readMenuForm($('opMenuForm'));
    S.applyOverrides();          // pick up any change just saved
    renderVenue();
    const views = { dashboard: viewDashboard, reservations: viewReservations, floor: viewFloor, menu: viewMenu, vouchers: viewVouchers, profile: viewProfile, settings: viewSettings };
    content.innerHTML = (views[state.view] || viewDashboard)();
    if (state.view === 'floor') afterFloor();
  }

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }
  function viewDashboard() {
    const today = S.todayIso();
    const todays = resOn(today);
    const active = todays.filter((x) => S.ACTIVE.includes(x.status));
    const covers = active.reduce((n, x) => n + x.guests, 0) + todays.filter((x) => x.status === 'completed').reduce((n, x) => n + x.guests, 0);
    const pendingAll = allRes().filter((x) => x.status === 'pending' && startMs(x) > Date.now());
    const seatedNow = todays.filter((x) => x.status === 'seated').length;
    const needsCheck = todays.filter((x) => x.status === 'confirmed' && startMs(x) + 15 * 60000 < Date.now());
    const upcoming = active.filter((x) => x.status !== 'seated' && startMs(x) + 15 * 60000 >= Date.now()).slice(0, 5);

    // Covers for the next 7 days
    const week = [...Array(7)].map((_, i) => {
      const d = S.addDaysIso(today, i);
      return { d, covers: activeOn(d).reduce((n, x) => n + x.guests, 0) + resOn(d).filter((x) => x.status === 'completed').reduce((n, x) => n + x.guests, 0) };
    });
    const max = Math.max(1, ...week.map((w) => w.covers));

    // Kitchen prep: pre-ordered dishes for today
    const prep = prepList(today);

    return `
      <header class="op-page-head">
        <div>
          <p class="eyebrow"><span class="dot"></span>${esc(fullDay(today))}</p>
          <h1>${greeting()}, ${esc(R.name)}</h1>
        </div>
        <button type="button" class="btn btn-amber btn-sm" data-op="new-res">${ICON.plus} New reservation</button>
      </header>

      ${R.paused ? `<div class="op-alert is-warn"><div><strong>Online bookings are paused.</strong> Diners can see your listing but can't book.</div><button type="button" class="btn btn-outline-dark btn-sm" data-go="settings">Booking settings</button></div>` : ''}
      ${pendingAll.length ? `<div class="op-alert"><div><strong>${pendingAll.length} booking${pendingAll.length === 1 ? '' : 's'} waiting for approval.</strong> Diners see these as "Awaiting confirmation" until you accept.</div><button type="button" class="btn btn-dark btn-sm" data-op="show-pending">Review</button></div>` : ''}
      ${needsCheck.length ? `<div class="op-alert is-warn"><div><strong>${needsCheck.length} guest${needsCheck.length === 1 ? '' : 's'} past their booking time today.</strong> Mark them as seated or as a no-show.</div><button type="button" class="btn btn-outline-dark btn-sm" data-op="show-today">Check in</button></div>` : ''}

      <div class="op-kpis">
        <div class="op-kpi"><span>Reservations today</span><strong>${active.length + todays.filter((x) => x.status === 'completed').length}</strong></div>
        <div class="op-kpi"><span>Guests today</span><strong>${covers}</strong></div>
        <div class="op-kpi"><span>Seated now</span><strong>${seatedNow}</strong></div>
        <div class="op-kpi"><span>Waiting for approval</span><strong>${pendingAll.length}</strong></div>
      </div>

      <div class="op-grid-2">
        <section class="op-panel">
          <div class="op-panel-head"><h2>Next up today</h2><button type="button" class="x-text-btn" data-op="show-today">All of today</button></div>
          ${upcoming.length ? `<ul class="op-list">${upcoming.map(resRow).join('')}</ul>` : '<p class="op-empty">No more reservations today.</p>'}
        </section>
        <section class="op-panel">
          <div class="op-panel-head"><h2>Guests this week</h2></div>
          <ul class="op-bars" aria-label="Guests per day for the next 7 days">
            ${week.map((w) => `<li><span class="op-bar-label">${esc(i18nShort(w.d))}</span><span class="op-bar"><span style="width:${Math.round((w.covers / max) * 100)}%"></span></span><span class="op-bar-num">${w.covers}</span></li>`).join('')}
          </ul>
        </section>
      </div>

      <section class="op-panel">
        <div class="op-panel-head"><h2>Kitchen prep: pre-orders today</h2>${R.preorder ? '' : '<span class="op-muted">Pre-orders are off</span>'}</div>
        ${prep.length ? `<ul class="op-prep">${prep.map((p) => `<li><strong>${p.qty}×</strong> ${esc(p.name)}</li>`).join('')}</ul>` : '<p class="op-empty">No pre-ordered dishes for today.</p>'}
      </section>`;
  }
  function i18nShort(dateIso) {
    if (isToday(dateIso)) return 'Today';
    const d = S.fromIso(dateIso);
    return `${DAYS_SHORT[d.getDay()]} ${d.getDate()}`;
  }
  function prepList(dateIso) {
    const map = new Map();
    activeOn(dateIso).forEach((x) => (x.preorder || []).forEach((l) => map.set(l.name, (map.get(l.name) || 0) + l.qty)));
    return [...map.entries()].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
  }

  /* ============================================================
     RESERVATIONS
     ============================================================ */
  function statusChip(x) { return `<span class="op-status is-${x.status}">${STATUS_LABEL[x.status]}</span>`; }
  function tagsFor(x) {
    const tags = [];
    if (x.occasion) tags.push(esc(x.occasion));
    if (x.preorder && x.preorder.length) tags.push(`Pre-order ${x.preorder.reduce((n, l) => n + l.qty, 0)}`);
    if (x.voucher) tags.push(esc(x.voucher));
    if (x.notes) tags.push('Note');
    return tags.map((t) => `<span class="op-tag">${t}</span>`).join('');
  }
  function resRow(x) {
    return `<li>
      <button type="button" class="op-res" data-ref="${esc(x.ref)}">
        <span class="op-res-time">${fmtTime(x.minutes)}</span>
        <span class="op-res-main">
          <strong>${esc(x.fullName)}</strong>
          <span>${guestsText(x.guests)}${x.table ? ` · Table ${esc(x.table)}` : R.layout ? ' · No table yet' : ''} · ${SOURCE_LABEL[x.source] || 'TableFor'}</span>
          <span class="op-res-tags">${tagsFor(x)}</span>
        </span>
        ${statusChip(x)}
      </button>
    </li>`;
  }
  function viewReservations() {
    const list = resOn(state.date);
    const q = state.query.trim().toLowerCase();
    const counts = { all: list.length };
    Object.keys(STATUS_LABEL).forEach((k) => { counts[k] = list.filter((x) => x.status === k).length; });
    const shown = list.filter((x) => (state.statusFilter === 'all' || x.status === state.statusFilter)
      && (!q || `${x.fullName} ${x.ref} ${x.phone || ''}`.toLowerCase().includes(q)));
    const covers = list.filter((x) => S.ACTIVE.includes(x.status) || x.status === 'completed').reduce((n, x) => n + x.guests, 0);
    const closedDay = !daySlots(state.date).length;

    return `
      <header class="op-page-head">
        <div>
          <p class="eyebrow"><span class="dot"></span>Reservations</p>
          <h1>${esc(fullDay(state.date))}</h1>
          <p class="op-sub">${list.length} reservation${list.length === 1 ? '' : 's'} · ${covers} guest${covers === 1 ? '' : 's'}${closedDay ? ' · Closed this day' : ''}</p>
        </div>
        <button type="button" class="btn btn-amber btn-sm" data-op="new-res">${ICON.plus} New reservation</button>
      </header>

      <div class="op-toolbar">
        <div class="op-daynav" role="group" aria-label="Choose a day">
          <button type="button" class="op-icon-btn" data-op="day" data-step="-1" aria-label="Previous day">${ICON.back}</button>
          <button type="button" class="op-chip${isToday(state.date) ? ' is-on' : ''}" data-op="day-today">Today</button>
          <button type="button" class="op-icon-btn" data-op="day" data-step="1" aria-label="Next day">${ICON.next}</button>
          <label class="visually-hidden" for="opDate">Date</label>
          <input type="date" id="opDate" class="op-date" value="${state.date}" data-op="date">
        </div>
        <label class="op-search">
          ${ICON.search}
          <span class="visually-hidden">Search reservations</span>
          <input type="search" id="opSearch" placeholder="Name, phone or ref" value="${esc(state.query)}" data-op="search">
        </label>
      </div>

      <div class="op-filters" role="group" aria-label="Filter by status">
        ${['all', 'pending', 'confirmed', 'seated', 'completed', 'no-show', 'cancelled'].map((k) =>
          `<button type="button" class="op-chip${state.statusFilter === k ? ' is-on' : ''}" data-op="filter" data-status="${k}" aria-pressed="${state.statusFilter === k}">${k === 'all' ? 'All' : STATUS_LABEL[k]} <span>${counts[k]}</span></button>`).join('')}
      </div>

      <section class="op-panel op-panel-flush">
        ${shown.length ? `<ul class="op-list">${shown.map(resRow).join('')}</ul>`
          : `<p class="op-empty">${list.length ? 'No reservations match this filter.' : closedDay ? 'You are closed on this day.' : 'No reservations on this day yet.'}</p>`}
      </section>`;
  }

  // What an owner can do next, based on status and the clock
  function actionsFor(x) {
    const now = Date.now();
    const start = startMs(x);
    const today = isToday(x.date);
    const acts = [];
    if (x.status === 'pending') {
      acts.push({ id: 'accept', label: 'Accept', cls: 'btn-amber', ok: start > now });
      acts.push({ id: 'decline', label: 'Decline', cls: 'btn-outline-dark', ok: true });
    } else if (x.status === 'confirmed') {
      const canSeat = today && now >= start - 30 * 60000;
      acts.push({ id: 'seat', label: 'Mark seated', cls: 'btn-amber', ok: canSeat, why: canSeat ? '' : 'Available from 30 minutes before the booking time on the day.' });
      const canNoShow = now >= start + 15 * 60000;
      acts.push({ id: 'noshow', label: 'No-show', cls: 'btn-outline-dark', ok: canNoShow, why: canNoShow ? '' : 'Available 15 minutes after the booking time.' });
      acts.push({ id: 'cancel', label: 'Cancel booking', cls: 'btn-outline-dark', ok: start > now });
    } else if (x.status === 'seated') {
      acts.push({ id: 'complete', label: 'Finish and clear table', cls: 'btn-amber', ok: true });
    }
    return acts;
  }

  function openDetails(ref) {
    const x = S.findReservation(rid, ref);
    if (!x) return;
    const acts = actionsFor(x);
    const tables = R.layout ? R.layout.tables : [];
    const editableTable = R.layout && S.ACTIVE.includes(x.status);
    const tableOptions = tables.map((t) => {
      const free = S.isTableFree(rid, x.date, x.minutes, t.id, x.ref);
      const fits = tableFits(t, x.guests);
      const label = `Table ${t.id} · ${t.zone} · ${t.seats} seats${!free ? ' (taken)' : !fits ? ' (not for this party size)' : ''}`;
      return `<option value="${esc(t.id)}"${x.table === t.id ? ' selected' : ''}${(!free || !fits) && x.table !== t.id ? ' disabled' : ''}>${esc(label)}</option>`;
    }).join('');
    const pre = x.preorder || [];
    drawer.dataset.ref = x.ref;
    openDrawer(`${esc(x.fullName)}`, `
      <div class="op-detail-status">${statusChip(x)}<span class="op-muted">Ref ${esc(x.ref)} · ${SOURCE_LABEL[x.source] || 'TableFor'}</span></div>
      <dl class="op-dl">
        <div><dt>When</dt><dd>${esc(fullDay(x.date))}, ${fmtTime(x.minutes)}</dd></div>
        <div><dt>Party</dt><dd>${guestsText(x.guests)}</dd></div>
        <div><dt>Phone</dt><dd>${x.phone ? `<a href="tel:${esc(x.phone.replace(/\s+/g, ''))}">${esc(x.phone)}</a>` : '<span class="op-muted">Not given</span>'}</dd></div>
        ${x.occasion ? `<div><dt>Occasion</dt><dd>${esc(x.occasion)}</dd></div>` : ''}
        ${x.notes ? `<div><dt>Requests</dt><dd>${esc(x.notes)}</dd></div>` : ''}
        ${x.voucher ? `<div><dt>Voucher</dt><dd>${esc(x.voucher)}</dd></div>` : ''}
        ${pre.length ? `<div><dt>Pre-order</dt><dd><ul class="op-mini-list">${pre.map((l) => `<li>${l.qty}× ${esc(l.name)} <span class="op-muted">${peso(l.qty * l.price)}</span></li>`).join('')}</ul><strong>${peso(pre.reduce((n, l) => n + l.qty * l.price, 0))}</strong> <span class="op-muted">total</span></dd></div>` : ''}
        ${x.payment ? `<div><dt>Paid online</dt><dd><strong>${peso(x.payment.total)}</strong> <span class="op-muted">via ${esc(S.paidWith(x.payment))}</span>
          <ul class="op-mini-list">
            <li>Reservation tax <span class="op-muted">${peso(x.payment.tax)}</span></li>
            ${x.payment.preorderDeposit ? `<li>Pre-order deposit (20%) <span class="op-muted">${peso(x.payment.preorderDeposit)}</span></li>` : ''}
            ${x.payment.held ? '' : `<li>Cancellation fee <span class="op-muted">${peso(x.payment.perGuest)} × ${x.guests} = ${peso(x.payment.cancelFee)}</span></li>`}
          </ul>
          ${x.payment.held ? `<span class="op-hold${x.payment.feeCharged ? ' is-charged' : ''}">Cancellation fee ${peso(x.payment.cancelFee)}: ${x.payment.feeCharged ? `charged to the diner and paid to you` : `on hold on the diner's linked ${esc(x.payment.holdWith || 'account')}. Charged only if they cancel late or don't show up`}</span>` : ''}
          <span class="op-muted">${x.lateCancel ? `Cancelled late by the diner: ${peso(x.forfeited)} goes to you.` : x.payment.held ? (x.payment.preorderDeposit ? `Take ${peso(x.payment.preorderDeposit)} off the bill when they dine.` : '') : `Take ${peso(x.payment.credit)} off the bill when they dine.`} Ref ${esc(x.payment.txn)}</span></dd></div>` : ''}
      </dl>
      ${editableTable ? `
        <label class="modal-field">
          <span>Table</span>
          <select data-op="assign-table" data-ref="${esc(x.ref)}">
            <option value="">No table assigned</option>
            ${tableOptions}
          </select>
        </label>` : x.table ? `<p class="op-muted">Table ${esc(x.table)}</p>` : ''}
      <div class="op-actions" data-ref="${esc(x.ref)}">
        ${acts.length ? acts.map((a) => `<button type="button" class="btn btn-sm ${a.cls}" data-act="${a.id}"${a.ok ? '' : ' disabled'}${a.why ? ` title="${esc(a.why)}"` : ''}>${a.label}</button>`).join('') : '<p class="op-muted">This reservation is closed. No further actions.</p>'}
      </div>
      ${acts.some((a) => !a.ok && a.why) ? `<p class="op-hint">${esc(acts.filter((a) => !a.ok && a.why).map((a) => `${a.label}: ${a.why}`).join(' '))}</p>` : ''}
      <div class="op-confirm" id="opConfirm" hidden></div>`);
  }

  function setStatus(ref, status, extra) {
    // A no-show is charged the cancellation fee held on their linked payment method
    const before = S.findReservation(rid, ref);
    const more = { ...(extra || {}) };
    if (status === 'no-show' && before && before.payment && before.payment.held && !before.payment.feeCharged) {
      more.payment = { ...before.payment, feeCharged: true, feeChargedAt: Date.now() };
    }
    const x = S.updateReservation(rid, ref, { status, ...more });
    if (!x) return;
    const msg = {
      confirmed: `Accepted. ${x.fullName} will see the booking as confirmed.`,
      seated: `${x.fullName} is seated.`,
      completed: `Visit completed. The table is free again.`,
      'no-show': x.payment && x.payment.held ? `Marked ${x.fullName} as a no-show. Their ${peso(x.payment.cancelFee)} cancellation fee was charged and paid to you.` : `Marked ${x.fullName} as a no-show.`,
      cancelled: extra && extra.declined ? `Declined. ${x.fullName} will be told and refunded.` : `Cancelled. ${x.fullName} will be told and refunded.`,
    }[status];
    toast(msg);
    closeDrawer();
    render();
  }

  function handleAction(ref, act) {
    const box = $('opConfirm');
    if (act === 'accept') {
      const x = S.findReservation(rid, ref);
      if (x.table && !S.isTableFree(rid, x.date, x.minutes, x.table, x.ref)) {
        box.hidden = false;
        box.innerHTML = `<p>Table ${esc(x.table)} is now taken at that time. Choose another table above first.</p>`;
        return;
      }
      setStatus(ref, 'confirmed');
    } else if (act === 'seat') setStatus(ref, 'seated');
    else if (act === 'complete') setStatus(ref, 'completed');
    else if (act === 'noshow') setStatus(ref, 'no-show');
    else if (act === 'decline' || act === 'cancel') {
      // A second, explicit step before cancelling someone's booking
      box.hidden = false;
      box.innerHTML = `
        <p>${act === 'decline' ? 'Decline this booking request?' : 'Cancel this confirmed booking?'} The diner is told straight away and their ${peso(S.paymentOf(S.findReservation(rid, ref)).total)} payment is refunded in full.</p>
        <div class="op-actions">
          <button type="button" class="btn btn-dark btn-sm" data-act="${act}-yes">${act === 'decline' ? 'Yes, decline' : 'Yes, cancel it'}</button>
          <button type="button" class="btn btn-outline-dark btn-sm" data-act="keep">Keep it</button>
        </div>`;
      box.querySelector('button').focus();
    } else if (act === 'decline-yes') setStatus(ref, 'cancelled', { cancelledBy: 'restaurant', declined: true });
    else if (act === 'cancel-yes') setStatus(ref, 'cancelled', { cancelledBy: 'restaurant' });
    else if (act === 'keep') { box.hidden = true; box.innerHTML = ''; }
  }

  /* -- New reservation (phone booking or walk-in) -- */
  function openNewReservation(prefill) {
    const p = prefill || {};
    delete drawer.dataset.ref;
    const today = S.todayIso();
    const dates = [...Array(60)].map((_, i) => S.addDaysIso(today, i)).filter((d) => daySlots(d).length);
    const date = p.date && dates.includes(p.date) ? p.date : dates[0];
    openDrawer('New reservation', `
      <form class="op-form" id="opNewRes" novalidate>
        <div class="auth-method" role="group" aria-label="Type of reservation">
          <button type="button" class="auth-method-btn" data-kind="phone" aria-pressed="true">Phone booking</button>
          <button type="button" class="auth-method-btn" data-kind="walk-in" aria-pressed="false">Walk-in (now)</button>
        </div>
        <label class="modal-field"><span>Guest name</span><input type="text" name="name" autocomplete="off" maxlength="60" required></label>
        <label class="modal-field"><span>Mobile number <em data-phone-hint>(required)</em></span><input type="tel" name="phone" inputmode="tel" placeholder="0917 123 4567" maxlength="16"></label>
        <div class="modal-grid" data-when>
          <label class="modal-field"><span>Date</span>
            <select name="date">${dates.map((d) => `<option value="${d}"${d === date ? ' selected' : ''}>${esc(fmtDay(d) === 'Today' || fmtDay(d) === 'Tomorrow' ? `${fmtDay(d)} (${fullDay(d)})` : fullDay(d))}</option>`).join('')}</select>
          </label>
          <label class="modal-field"><span>Time</span><select name="time"></select></label>
        </div>
        <div class="modal-grid">
          <label class="modal-field"><span>Party size</span>
            <select name="guests">${[...Array(Math.min(R.maxParty, PARTY_CAP) - R.minParty + 1)].map((_, i) => { const n = R.minParty + i; return `<option value="${n}"${n === 2 ? ' selected' : ''}>${guestsText(n)}</option>`; }).join('')}</select>
          </label>
          ${R.layout ? '<label class="modal-field"><span>Table <em>(optional)</em></span><select name="table"></select></label>' : '<div></div>'}
        </div>
        <label class="modal-field"><span>Requests <em>(optional)</em></span><input type="text" name="notes" maxlength="120"></label>
        <p class="auth-error" role="alert" hidden></p>
        <button type="submit" class="btn btn-amber">Save reservation</button>
      </form>`);
    const f = $('opNewRes');
    f.dataset.kind = 'phone';
    syncNewResTimes(f, p.minutes);
  }
  function syncNewResTimes(f, wanted) {
    const walkIn = f.dataset.kind === 'walk-in';
    const timeSel = f.elements.time;
    const today = S.todayIso();
    if (walkIn) {
      const m = nowMins();
      timeSel.innerHTML = `<option value="${m}">${fmtTime(m)} (now)</option>`;
    } else {
      const date = f.elements.date.value;
      const cutoff = date === today ? nowMins() : -1;
      const slots = daySlots(date).filter((m) => m > cutoff);
      const keep = wanted != null ? wanted : Number(timeSel.value);
      timeSel.innerHTML = slots.length
        ? slots.map((m) => `<option value="${m}"${m === keep ? ' selected' : ''}>${fmtTime(m)}</option>`).join('')
        : '<option value="">No times left on this day</option>';
    }
    syncNewResTables(f);
  }
  function syncNewResTables(f) {
    if (!f.elements.table) return;
    const walkIn = f.dataset.kind === 'walk-in';
    const date = walkIn ? S.todayIso() : f.elements.date.value;
    const mins = Number(f.elements.time.value);
    const party = Number(f.elements.guests.value);
    const prev = f.elements.table.value;
    f.elements.table.innerHTML = '<option value="">Assign later</option>' + R.layout.tables.map((t) => {
      const ok = S.isTableFree(rid, date, mins, t.id) && tableFits(t, party);
      return ok ? `<option value="${esc(t.id)}"${prev === t.id ? ' selected' : ''}>Table ${esc(t.id)} · ${esc(t.zone)} · ${t.seats} seats</option>` : '';
    }).join('');
  }
  function submitNewReservation(f) {
    const err = f.querySelector('.auth-error');
    const fail = (msg, field) => { err.textContent = msg; err.hidden = false; if (field) field.focus(); };
    const walkIn = f.dataset.kind === 'walk-in';
    const name = f.elements.name.value.trim();
    const phone = f.elements.phone.value.trim();
    if (!/\p{L}.*\p{L}/u.test(name)) return fail('Enter the guest\'s name.', f.elements.name);
    if (!walkIn && !phone) return fail('Phone bookings need a mobile number, so you can reach the guest.', f.elements.phone);
    if (phone && !phoneOk(phone)) return fail('Enter a PH mobile number, like 0917 123 4567.', f.elements.phone);
    const date = walkIn ? S.todayIso() : f.elements.date.value;
    const minutes = Number(f.elements.time.value);
    if (walkIn) {
      const m = nowMins();
      const openToday = daySlots(date).length && m >= R.hours.open && m < R.hours.close;
      if (!openToday) return fail(`You're closed right now. Walk-ins can be added between ${fmtTime(R.hours.open)} and ${fmtTime(R.hours.close % 1440)} on open days.`);
    }
    if (!walkIn && !f.elements.time.value) return fail('There are no times left on that day. Choose another date.', f.elements.date);
    const guests = Number(f.elements.guests.value);
    const table = f.elements.table ? f.elements.table.value || null : null;
    if (table && !S.isTableFree(rid, date, minutes, table)) return fail(`Table ${table} was just taken. Choose another.`, f.elements.table);
    const res = {
      ref: `TF-${walkIn ? 'W' : 'P'}${Date.now().toString(36).toUpperCase().slice(-5)}`,
      source: walkIn ? 'walk-in' : 'phone',
      date, minutes, guests, fullName: name, phone,
      occasion: '', notes: f.elements.notes.value.trim(), preorder: [], voucher: null, table,
      status: walkIn ? 'seated' : 'confirmed',
      createdAt: Date.now(),
    };
    S.addReservation(rid, res);
    toast(walkIn ? `${name} is seated.` : `Reservation saved for ${fmtDay(date)}, ${fmtTime(minutes)}.`);
    closeDrawer();
    state.date = date;
    state.statusFilter = 'all';
    if (state.view !== 'reservations') setView('reservations'); else render();
  }

  /* ============================================================
     FLOOR PLAN
     ============================================================ */
  // Starter floor plan: everyday tables plus group tables up to the largest party taken
  function starterLayout() {
    const tables = [
      { id: '1', seats: 2, x: 30, y: 8, shape: 'round', zone: 'Window' }, { id: '2', seats: 2, x: 44, y: 8, shape: 'round', zone: 'Window' },
      { id: '3', seats: 4, x: 58, y: 8, shape: 'rect', zone: 'Window' }, { id: '4', seats: 4, x: 8, y: 36, shape: 'rect', zone: 'Main room' },
      { id: '5', seats: 4, x: 30, y: 36, shape: 'rect', zone: 'Main room' }, { id: '6', seats: 6, x: 52, y: 36, shape: 'rect', zone: 'Main room' },
      { id: '7', seats: 2, x: 8, y: 64, shape: 'round', zone: 'Main room' }, { id: '8', seats: 8, x: 24, y: 64, shape: 'rect', zone: 'Main room' },
    ];
    if (R.maxParty > 8) tables.push({ id: 'G1', seats: Math.min(R.maxParty, 12), x: 50, y: 64, shape: 'rect', zone: 'Group area' });
    if (R.maxParty > 12) tables.push({ id: 'G2', seats: R.maxParty, x: 76, y: 50, shape: 'rect', zone: 'Group area' });
    return {
      features: [{ label: 'Kitchen', x: 76, y: 4, w: 20, h: 14 }, { label: 'Entrance', x: 4, y: 86, w: 20, h: 10 }],
      tables,
    };
  }
  function floorSlots() {
    const slots = daySlots(state.floorDate);
    return slots;
  }
  function viewFloor() {
    if (!R.layout) {
      return `
        <header class="op-page-head"><div><p class="eyebrow"><span class="dot"></span>Floor plan</p><h1>Let diners pick a table</h1></div></header>
        <section class="op-panel op-empty-state">
          <h2>You don't have a floor plan yet</h2>
          <p>A floor plan is optional. Without one, diners book and you assign tables when they arrive. With one, diners can choose a table and you can see what's free at a glance.</p>
          <button type="button" class="btn btn-amber" data-op="starter-layout">Use a starter floor plan</button>
        </section>`;
    }
    const slots = floorSlots();
    if (state.floorTime == null || !slots.includes(state.floorTime)) {
      const nm = nowMins();
      state.floorTime = slots.find((m) => isToday(state.floorDate) ? m >= nm - 30 : true) ?? slots[0] ?? null;
    }
    const blocked = (S.ownerData(rid).blocked || {})[state.floorDate] || [];
    const tables = R.layout.tables;
    const statusOfTable = (t) => {
      if (blocked.includes(t.id)) return 'blocked';
      if (state.floorTime == null) return 'free';
      const h = S.tableHolder(rid, state.floorDate, state.floorTime, t.id);
      return h ? (h.status === 'seated' ? 'seated' : 'booked') : 'free';
    };
    const counts = { free: 0, booked: 0, seated: 0, blocked: 0 };
    tables.forEach((t) => { counts[statusOfTable(t)] += 1; });

    return `
      <header class="op-page-head">
        <div><p class="eyebrow"><span class="dot"></span>Floor plan</p><h1>${esc(fullDay(state.floorDate))}</h1>
        <p class="op-sub">${counts.free} free · ${counts.booked} booked · ${counts.seated} seated · ${counts.blocked} blocked</p></div>
      </header>
      <div class="op-toolbar">
        <div class="op-daynav" role="group" aria-label="Choose a day">
          <button type="button" class="op-icon-btn" data-op="floor-day" data-step="-1" aria-label="Previous day">${ICON.back}</button>
          <button type="button" class="op-chip${isToday(state.floorDate) ? ' is-on' : ''}" data-op="floor-today">Today</button>
          <button type="button" class="op-icon-btn" data-op="floor-day" data-step="1" aria-label="Next day">${ICON.next}</button>
        </div>
        <label class="op-select"><span>Time</span>
          <select data-op="floor-time"${slots.length ? '' : ' disabled'}>${slots.length ? slots.map((m) => `<option value="${m}"${m === state.floorTime ? ' selected' : ''}>${fmtTime(m)}</option>`).join('') : '<option>Closed</option>'}</select>
        </label>
      </div>
      <div class="op-floor-wrap">
        <section class="op-panel">
          <div class="floor op-floor" id="opFloor" role="group" aria-label="Floor plan">
            ${R.layout.features.map((f) => `<span class="floor-feature" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%">${esc(f.label)}</span>`).join('')}
            ${tables.map((t) => {
              const st = statusOfTable(t);
              const w = t.shape === 'round' ? 9 : Math.min(8 + t.seats * 1.6, 22);
              return `<button type="button" class="floor-table ${t.shape} op-t-${st}${state.floorPick === t.id ? ' is-picked' : ''}" data-table="${esc(t.id)}" style="left:${t.x}%;top:${t.y}%;width:${w}%" aria-pressed="${state.floorPick === t.id}" aria-label="Table ${esc(t.id)}, ${t.seats} seats, ${st}"><span>${esc(t.id)}</span><small>${t.seats}</small></button>`;
            }).join('')}
          </div>
          <ul class="floor-legend">
            <li><span class="lg op-lg-free"></span>Free</li><li><span class="lg op-lg-booked"></span>Booked</li>
            <li><span class="lg op-lg-seated"></span>Seated</li><li><span class="lg op-lg-blocked"></span>Blocked for the day</li>
          </ul>
        </section>
        <section class="op-panel op-floor-side" id="opFloorSide">${floorSide(blocked)}</section>
      </div>`;
  }
  function floorSide(blocked) {
    const t = state.floorPick && R.layout.tables.find((x) => x.id === state.floorPick);
    if (!t) {
      const unassigned = activeOn(state.floorDate).filter((x) => !x.table);
      return `<h2>Pick a table</h2><p class="op-muted">Select a table to see who's there or to block it for the day.</p>
        ${unassigned.length ? `<h3 class="op-h3">No table yet (${unassigned.length})</h3><ul class="op-list op-list-compact">${unassigned.map(resRow).join('')}</ul>` : ''}`;
    }
    const dayRes = activeOn(state.floorDate).filter((x) => x.table === t.id);
    const isBlocked = blocked.includes(t.id);
    const holder = state.floorTime != null ? S.tableHolder(rid, state.floorDate, state.floorTime, t.id) : null;
    return `
      <h2>Table ${esc(t.id)}</h2>
      <p class="op-muted">${esc(t.zone)} · ${t.seats} seats</p>
      ${holder ? `<p class="op-now">At ${fmtTime(state.floorTime)}: <strong>${esc(holder.fullName)}</strong>, ${guestsText(holder.guests)} (${STATUS_LABEL[holder.status]})</p>` : state.floorTime != null && !isBlocked ? `<p class="op-now">Free at ${fmtTime(state.floorTime)}.</p>` : ''}
      <h3 class="op-h3">Bookings at this table ${esc(fmtDay(state.floorDate).toLowerCase() === 'today' ? 'today' : 'on this day')}</h3>
      ${dayRes.length ? `<ul class="op-list op-list-compact">${dayRes.map(resRow).join('')}</ul>` : '<p class="op-empty">None.</p>'}
      <div class="op-actions">
        ${isBlocked
          ? '<button type="button" class="btn btn-outline-dark btn-sm" data-op="unblock">Open table again</button>'
          : `<button type="button" class="btn btn-outline-dark btn-sm" data-op="block"${dayRes.length ? ' disabled' : ''}>Block for the day</button>`}
      </div>
      ${!isBlocked && dayRes.length ? '<p class="op-hint">Move or cancel the bookings at this table before blocking it.</p>' : ''}`;
  }
  function afterFloor() { /* layout already rendered; nothing to measure */ }

  /* ============================================================
     MENU AND PRE-ORDERS
     ============================================================ */
  function menuDraft() {
    if (!state.menuDraft) state.menuDraft = JSON.parse(JSON.stringify(R.menu || []));
    return state.menuDraft;
  }
  function viewMenu() {
    const menu = menuDraft();
    const date = S.todayIso();
    const prep = prepList(date);
    const tomorrowPrep = prepList(S.addDaysIso(date, 1));
    return `
      <header class="op-page-head">
        <div><p class="eyebrow"><span class="dot"></span>Menu and pre-orders</p><h1>Your menu</h1>
        <p class="op-sub">Shown on your restaurant card. Diners can pre-order from it when pre-orders are on.</p></div>
      </header>

      <section class="op-panel op-switch-row">
        <div><h2>Accept pre-orders</h2><p class="op-muted">Diners add dishes when they book and pay for them at the restaurant.</p></div>
        <button type="button" class="op-switch" role="switch" aria-checked="${!!R.preorder}" data-op="toggle-preorder"${menu.length ? '' : ' disabled title="Add at least one dish first"'}><span></span><span class="visually-hidden">Accept pre-orders</span></button>
      </section>

      <form class="op-panel" id="opMenuForm" novalidate>
        <div class="op-panel-head op-menu-head">
          <h2>Dishes</h2>
          <div class="op-actions">
            <button type="button" class="btn btn-outline-dark btn-sm" data-op="menu-discard"${state.menuDirty ? '' : ' disabled'}>Discard changes</button>
            <button type="submit" class="btn btn-amber btn-sm"${state.menuDirty ? '' : ' disabled'}>Save menu</button>
          </div>
        </div>
        ${menu.map((c, ci) => `
          <fieldset class="op-cat" data-ci="${ci}">
            <legend class="visually-hidden">${esc(c.cat || 'Category')}</legend>
            <div class="op-cat-head">
              <label class="op-inline"><span class="visually-hidden">Category name</span><input type="text" value="${esc(c.cat)}" data-field="cat" maxlength="40" placeholder="Category name"></label>
              <button type="button" class="op-icon-btn" data-op="del-cat" aria-label="Delete category ${esc(c.cat)}">${ICON.trash}</button>
            </div>
            <div class="op-dish-head" aria-hidden="true"><span>Dish</span><span>Description</span><span>Price (₱)</span><span></span></div>
            ${c.items.map((it, ii) => `
              <div class="op-dish" data-ii="${ii}">
                <label><span class="visually-hidden">Dish name</span><input type="text" value="${esc(it.name)}" data-field="name" maxlength="60" placeholder="Dish name"></label>
                <label><span class="visually-hidden">Description</span><input type="text" value="${esc(it.note || '')}" data-field="note" maxlength="80" placeholder="Optional"></label>
                <label><span class="visually-hidden">Price in pesos</span><input type="number" value="${it.price}" data-field="price" min="1" max="100000" step="1" inputmode="numeric"></label>
                <button type="button" class="op-icon-btn" data-op="del-dish" aria-label="Delete ${esc(it.name || 'dish')}">${ICON.trash}</button>
              </div>`).join('')}
            <button type="button" class="x-text-btn op-add" data-op="add-dish">${ICON.plus} Add dish</button>
          </fieldset>`).join('')}
        <button type="button" class="btn btn-outline-dark btn-sm op-add-cat" data-op="add-cat">${ICON.plus} Add category</button>
        <p class="auth-error" role="alert" hidden></p>
      </form>

      <div class="op-grid-2">
        <section class="op-panel"><div class="op-panel-head"><h2>Pre-orders today</h2></div>
          ${prep.length ? `<ul class="op-prep">${prep.map((p) => `<li><strong>${p.qty}×</strong> ${esc(p.name)}</li>`).join('')}</ul>` : '<p class="op-empty">None yet.</p>'}</section>
        <section class="op-panel"><div class="op-panel-head"><h2>Pre-orders tomorrow</h2></div>
          ${tomorrowPrep.length ? `<ul class="op-prep">${tomorrowPrep.map((p) => `<li><strong>${p.qty}×</strong> ${esc(p.name)}</li>`).join('')}</ul>` : '<p class="op-empty">None yet.</p>'}</section>
      </div>`;
  }
  function readMenuForm(form) {
    const draft = menuDraft();
    form.querySelectorAll('.op-cat').forEach((fs) => {
      const c = draft[Number(fs.dataset.ci)];
      c.cat = fs.querySelector('[data-field="cat"]').value;
      fs.querySelectorAll('.op-dish').forEach((row) => {
        const it = c.items[Number(row.dataset.ii)];
        it.name = row.querySelector('[data-field="name"]').value;
        it.note = row.querySelector('[data-field="note"]').value;
        it.price = Number(row.querySelector('[data-field="price"]').value);
      });
    });
  }
  function saveMenu(form) {
    readMenuForm(form);
    const err = form.querySelector('.auth-error');
    const draft = menuDraft();
    const fail = (msg, sel) => { err.textContent = msg; err.hidden = false; const el = sel && form.querySelector(sel); if (el) el.focus(); };
    for (let ci = 0; ci < draft.length; ci++) {
      const c = draft[ci];
      if (!c.cat.trim()) return fail('Every category needs a name.', `[data-ci="${ci}"] [data-field="cat"]`);
      if (!c.items.length) return fail(`"${c.cat}" has no dishes. Add one or delete the category.`, `[data-ci="${ci}"] [data-op="add-dish"]`);
      for (let ii = 0; ii < c.items.length; ii++) {
        const it = c.items[ii];
        if (!it.name.trim()) return fail('Every dish needs a name.', `[data-ci="${ci}"] [data-ii="${ii}"] [data-field="name"]`);
        if (!Number.isInteger(it.price) || it.price < 1 || it.price > 100000) return fail(`Enter a whole-peso price between 1 and 100,000 for "${it.name}".`, `[data-ci="${ci}"] [data-ii="${ii}"] [data-field="price"]`);
      }
    }
    const clean = draft.map((c) => ({ cat: c.cat.trim(), items: c.items.map((it) => ({ name: it.name.trim(), note: (it.note || '').trim(), price: it.price, published: !!it.published })) }));
    const data = S.ownerData(rid);
    data.menu = clean;
    if (!clean.length) data.preorder = false;   // no dishes, no pre-orders
    S.saveOwnerData(rid, data);
    state.menuDraft = null;
    state.menuDirty = false;
    toast('Menu saved. Diners see the new menu straight away.');
    render();
  }

  /* ============================================================
     VOUCHERS
     ============================================================ */
  function viewVouchers() {
    const vouchers = (window.TABLEFOR_VOUCHERS || []).filter((v) => !v.cuisines || v.cuisines.includes(R.cuisine));
    const optOut = R.voucherOptOut || [];
    const bookings = S.getBookings().filter((b) => b.id === rid && b.voucher && (b.status || 'confirmed') !== 'cancelled');
    return `
      <header class="op-page-head"><div><p class="eyebrow"><span class="dot"></span>Vouchers</p><h1>Vouchers you accept</h1>
      <p class="op-sub">These TableFor vouchers apply to your cuisine or table sizes. Turn one off and diners can't use it at your restaurant.</p></div></header>
      ${vouchers.length ? `<div class="op-voucher-list">${vouchers.map((v) => {
        const on = !optOut.includes(v.code);
        const used = bookings.filter((b) => b.voucher === v.code).length;
        return `<article class="op-panel op-voucher">
          <div class="op-voucher-value"><strong>${esc(v.value)}</strong><span>${esc(v.unit)}</span></div>
          <div class="op-voucher-body">
            <h2>${esc(v.title)} <code>${esc(v.code)}</code></h2>
            <p class="op-muted">${esc(v.terms)} Valid until ${esc(v.validUntil.split('-').reverse().join('/'))}.</p>
            <p class="op-muted">Used on ${used} booking${used === 1 ? '' : 's'} here.</p>
          </div>
          <button type="button" class="op-switch" role="switch" aria-checked="${on}" data-op="toggle-voucher" data-code="${esc(v.code)}"><span></span><span class="visually-hidden">Accept ${esc(v.code)}</span></button>
        </article>`;
      }).join('')}</div>` : '<section class="op-panel"><p class="op-empty">No vouchers apply to your restaurant right now.</p></section>'}`;
  }

  /* ============================================================
     PROFILE AND HOURS
     ============================================================ */
  function timeOptions(selected, from, to) {
    let out = '';
    for (let m = from; m <= to; m += 30) out += `<option value="${m}"${m === selected ? ' selected' : ''}>${m === 1440 ? '12:00 AM (midnight)' : fmtTime(m)}</option>`;
    return out;
  }
  function viewProfile() {
    return `
      <header class="op-page-head"><div><p class="eyebrow"><span class="dot"></span>Profile and hours</p><h1>${esc(R.name)}</h1>
      <p class="op-sub">What diners see on your card and the times they can book.</p></div></header>
      <form class="op-panel op-form" id="opProfile" novalidate>
        <label class="modal-field"><span>Short description <em>(shown on your card, up to 200 characters)</em></span>
          <textarea name="desc" maxlength="200" rows="4">${esc(R.desc)}</textarea></label>
        <label class="modal-field"><span>Phone number for the Call button</span>
          <input type="tel" name="phone" value="${esc(R.phone || '')}" placeholder="0917 123 4567" maxlength="20"></label>
        <div class="modal-grid">
          <label class="modal-field"><span>Opens</span><select name="open">${timeOptions(R.hours.open, 0, 1410)}</select></label>
          <label class="modal-field"><span>Closes</span><select name="close">${timeOptions(R.hours.close, 60, 1440)}</select></label>
        </div>
        <fieldset class="op-days">
          <legend>Open on</legend>
          ${DAYS.map((d, i) => `<label class="op-day"><input type="checkbox" name="day" value="${i}"${R.closedDays.includes(i) ? '' : ' checked'}><span>${DAYS_SHORT[i]}</span></label>`).join('')}
        </fieldset>
        <div class="modal-grid">
          <label class="modal-field"><span>Smallest party</span><select name="minParty">${[...Array(PARTY_CAP)].map((_, i) => `<option value="${i + 1}"${i + 1 === R.minParty ? ' selected' : ''}>${guestsText(i + 1)}</option>`).join('')}</select></label>
          <label class="modal-field"><span>Largest party <em>(up to 20)</em></span><select name="maxParty">${[...Array(PARTY_CAP)].map((_, i) => `<option value="${i + 1}"${i + 1 === R.maxParty ? ' selected' : ''}>${guestsText(i + 1)}</option>`).join('')}</select></label>
        </div>
        <p class="auth-error" role="alert" hidden></p>
        <p class="op-hint" id="opProfileImpact" hidden></p>
        <div class="op-actions op-actions-end">
          <a class="btn btn-outline-dark btn-sm" href="explore.html?focus=${encodeURIComponent(R.id)}&amp;avail=0">Preview on Explore</a>
          <button type="submit" class="btn btn-amber btn-sm">Save changes</button>
        </div>
      </form>`;
  }
  function saveProfile(form) {
    const err = form.querySelector('.auth-error');
    const fail = (msg, field) => { err.textContent = msg; err.hidden = false; if (field) field.focus(); };
    err.hidden = true;
    const desc = form.elements.desc.value.trim();
    const phone = form.elements.phone.value.trim();
    const open = Number(form.elements.open.value);
    const close = Number(form.elements.close.value);
    const openDays = [...form.querySelectorAll('input[name="day"]:checked')].map((i) => Number(i.value));
    const minParty = Number(form.elements.minParty.value);
    const maxParty = Number(form.elements.maxParty.value);
    if (desc.length < 20) return fail('Write a description of at least 20 characters.', form.elements.desc);
    if (phone && !contactOk(phone)) return fail('Enter a valid phone number, like 0917 123 4567 or (045) 892 0252.', form.elements.phone);
    if (close - open < 120) return fail('Opening hours must be at least 2 hours long, so there is time for a last seating.', form.elements.close);
    if (!openDays.length) return fail('Choose at least one day you are open.', form.querySelector('input[name="day"]'));
    if (minParty > maxParty) return fail('The smallest party can\'t be bigger than the largest party.', form.elements.minParty);
    const biggest = R.layout ? Math.max(...R.layout.tables.map((t) => t.seats)) : PARTY_CAP;
    if (maxParty > biggest) return fail(`Your biggest table seats ${biggest}, so the largest party can be up to ${biggest}.`, form.elements.maxParty);

    const closedDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !openDays.includes(d));
    // Existing bookings that fall outside the new rules are kept, but flagged
    const affected = allRes().filter((x) => S.ACTIVE.includes(x.status) && startMs(x) > Date.now()
      && (closedDays.includes(S.fromIso(x.date).getDay()) || x.minutes < open || x.minutes > close - 60 || x.guests > maxParty || x.guests < minParty));
    const data = S.ownerData(rid);
    data.profile = { desc, phone: phone || null, hours: { open, close }, closedDays, minParty, maxParty };
    S.saveOwnerData(rid, data);
    render();
    toast('Profile saved. Your card on Explore is updated.');
    if (affected.length) {
      const note = $('opProfileImpact');
      note.hidden = false;
      note.textContent = `${affected.length} upcoming reservation${affected.length === 1 ? ' falls' : 's fall'} outside your new hours or party sizes. They're still booked, so contact those guests or cancel them in Reservations.`;
    }
  }

  /* ============================================================
     BOOKING SETTINGS
     ============================================================ */
  function viewSettings() {
    return `
      <header class="op-page-head"><div><p class="eyebrow"><span class="dot"></span>Booking settings</p><h1>How diners book you</h1></div></header>

      <section class="op-panel">
        <h2>Confirming bookings</h2>
        <div class="op-choice" role="radiogroup" aria-label="Confirming bookings">
          ${[['auto', 'Confirm automatically', 'Bookings are confirmed the moment a diner books. Best for most restaurants.'],
             ['manual', 'Review each booking', 'Bookings arrive as requests. Diners see "Awaiting confirmation" until you accept or decline.']].map(([k, t, d]) =>
            `<button type="button" class="op-choice-card" role="radio" aria-checked="${R.approval === k}" data-op="approval" data-value="${k}"><strong>${t}</strong><span>${d}</span></button>`).join('')}
        </div>
      </section>

      <section class="op-panel op-switch-row">
        <div><h2>Take online bookings</h2><p class="op-muted">Pause when you're fully booked, closed for an event or short-staffed. Existing bookings stay as they are.</p></div>
        <button type="button" class="op-switch" role="switch" aria-checked="${!R.paused}" data-op="toggle-paused"><span></span><span class="visually-hidden">Take online bookings</span></button>
      </section>

      <form class="op-panel op-form" id="opTax" novalidate>
        <h2>Reservation tax</h2>
        <p class="op-muted">The amount every diner pays online to reserve a table with you, together with the 20% pre-order deposit. It pays for TableFor's booking service, and you receive a share of it. The minimum is ${peso(S.TAX_MIN)}. Unlike the pre-order deposit, it isn't taken off the diner's bill. It's refunded only when a booking is cancelled at least ${S.FREE_CANCEL_MINUTES} minutes ahead, or when you decline or cancel it.</p>
        <div class="op-tax-row">
          <label class="modal-field op-tax-field"><span>Amount per booking</span>
            <span class="op-peso-input"><span aria-hidden="true">₱</span><input type="number" name="tax" min="${S.TAX_MIN}" step="10" inputmode="numeric" value="${R.tax}" aria-describedby="opTaxPreview"></span></label>
          <button type="submit" class="btn btn-amber btn-sm">Save tax</button>
        </div>
        <p class="auth-error" role="alert" hidden></p>
        <p class="op-hint" id="opTaxPreview">${taxPreview(R.tax)}</p>
      </form>

      <section class="op-panel">
        <h2>Share your booking link</h2>
        <p class="op-muted">Add this link to your website, Facebook or Instagram bio, and your Google Business Profile, so guests can book you in a tap.</p>
        <div class="op-link-row">
          <input type="text" readonly value="${esc(bookingLink())}" aria-label="Your booking link" id="opBookingLink">
          <button type="button" class="btn btn-dark btn-sm" data-op="copy-link">Copy link</button>
        </div>
      </section>

      <section class="op-panel">
        <h2>TableFor policies</h2>
        <ul class="op-policy">
          <li><strong>Paid online before the table is reserved</strong><span>Diners pay the reservation tax and 20% of any pre-order with the GCash, Maya or bank account linked to their TableFor account. The pre-order deposit is taken off their bill when they dine.</span></li>
          <li><strong>${peso(S.CANCEL_FEE_PER_GUEST)}-per-guest cancellation fee, held</strong><span>It isn't paid when booking. It stays on hold on the diner's linked account and is charged and paid to you only if they cancel less than ${S.FREE_CANCEL_MINUTES} minutes before or don't show up (when you mark a no-show).</span></li>
          <li><strong>Free cancellation up to ${S.FREE_CANCEL_MINUTES} minutes before</strong><span>The diner gets their payment back and is never charged the cancellation fee. After that, or on a no-show, the cancellation fee is charged and the pre-order deposit goes to you.</span></li>
          <li><strong>15-minute grace period</strong><span>Hold the table for 15 minutes after the booking time, then you can mark the guest as a no-show.</span></li>
          <li><strong>Your cancellations</strong><span>If you decline or cancel a booking, the diner's payment is refunded in full.</span></li>
          <li><strong>Tables held for 90 minutes</strong><span>A table can't be booked again within 90 minutes of another booking.</span></li>
          <li><strong>Up to 20 guests per booking</strong><span>Set your own limit in Profile and hours.</span></li>
        </ul>
      </section>

      <section class="op-panel">
        <h2>Account</h2>
        <p class="op-muted">Signed in as <strong>${esc(session.id)}</strong> for ${esc(R.name)}.</p>
        <div class="op-actions">
          <button type="button" class="btn btn-outline-dark btn-sm" data-op="reset">Reset demo data</button>
          <button type="button" class="btn btn-dark btn-sm" data-op="signout">Sign out</button>
        </div>
        <div class="op-confirm" id="opResetConfirm" hidden>
          <p>This restores ${esc(R.name)}'s original listing and sample bookings on this device. Diner bookings made on this device are kept.</p>
          <div class="op-actions">
            <button type="button" class="btn btn-dark btn-sm" data-op="reset-yes">Yes, reset</button>
            <button type="button" class="btn btn-outline-dark btn-sm" data-op="reset-no">Keep my changes</button>
          </div>
        </div>
      </section>`;
  }

  function taxPreview(tax) {
    const c = S.charges({ tax }, 2, []);
    return `Example: a table for 2 with no pre-order pays ${peso(c.total)} when booking. Their ${peso(c.cancelFee)} cancellation fee stays on hold unless they cancel late or don't show up.`;
  }
  function saveTax(form) {
    const err = form.querySelector('.auth-error');
    const field = form.elements.tax;
    const v = Number(field.value);
    err.hidden = true;
    if (!field.value.trim() || !Number.isFinite(v) || v !== Math.round(v)) { err.textContent = 'Enter the tax as a whole peso amount.'; err.hidden = false; field.focus(); return; }
    if (v < S.TAX_MIN) { err.textContent = `The reservation tax can't be lower than ${peso(S.TAX_MIN)}.`; err.hidden = false; field.focus(); return; }
    if (v > 5000) { err.textContent = 'That looks too high. Keep it at ₱5,000 or less.'; err.hidden = false; field.focus(); return; }
    const d = S.ownerData(rid);
    d.settings = { ...d.settings, tax: v };
    S.saveOwnerData(rid, d);
    toast(`Reservation tax set to ${peso(v)}. New bookings pay this amount.`);
    render();
  }

  function bookingLink() {
    const base = window.location.href.replace(/[^/]*([?#].*)?$/, '');
    return `${base}explore.html?focus=${encodeURIComponent(R.id)}&avail=0`;
  }

  /* ============================================================
     PORTAL GUIDE (shown on first visit; reopen any time with "Guide")
     ============================================================ */
  const GUIDE_KEY = `tablefor_owner_guide_${session.id}|${rid}`;
  const GUIDE = [
    { t: 'Welcome to your Partner Portal', d: `This is where you run ${R.name} on TableFor. Everything you change here saves straight away and shows on your public listing.` },
    { t: 'Dashboard', d: 'Your day at a glance: reservations, guests expected, who is seated, and alerts for bookings to approve or guests to check in. The kitchen prep list shows pre-ordered dishes.' },
    { t: 'Reservations', d: 'Pick a day and open any booking to accept or decline it, mark guests as seated, record a no-show or finish the visit. Use "New reservation" for phone bookings and walk-ins.' },
    { t: 'Floor plan', d: 'Optional. See which tables are free, booked or seated at any time, assign tables to guests, and block a table for the day.' },
    { t: 'Menu, vouchers and profile', d: 'Update dishes and prices, switch pre-orders on or off, choose which vouchers you accept, and set your hours, open days and party sizes.' },
    { t: 'Booking settings', d: 'Confirm bookings automatically or review each one, pause online bookings when you need to, and copy your booking link to share.' },
  ];
  const guideEl = document.createElement('div');
  guideEl.className = 'auth-overlay op-guide';
  guideEl.hidden = true;
  guideEl.innerHTML = `<div class="auth-dialog op-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="opGuideTitle">
      <button type="button" class="auth-close" data-guide="close" aria-label="Close the guide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <p class="eyebrow"><span class="dot"></span>Portal guide <span class="op-guide-count" id="opGuideCount"></span></p>
      <h2 id="opGuideTitle"></h2>
      <p class="op-guide-text" id="opGuideText"></p>
      <div class="op-guide-dots" id="opGuideDots" aria-hidden="true"></div>
      <div class="op-guide-foot">
        <button type="button" class="btn btn-outline-dark btn-sm" data-guide="back">Back</button>
        <button type="button" class="btn btn-amber btn-sm" data-guide="next">Next</button>
      </div>
    </div>`;
  document.body.appendChild(guideEl);
  let guideStep = 0;
  let guideReturn = null;
  const guideSeen = () => { try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch { return true; } };
  function renderGuide() {
    const g = GUIDE[guideStep];
    $('opGuideTitle').textContent = g.t;
    $('opGuideText').textContent = g.d;
    $('opGuideCount').textContent = `${guideStep + 1} of ${GUIDE.length}`;
    $('opGuideDots').innerHTML = GUIDE.map((_, i) => `<span class="${i === guideStep ? 'is-on' : ''}"></span>`).join('');
    guideEl.querySelector('[data-guide="back"]').disabled = guideStep === 0;
    guideEl.querySelector('[data-guide="next"]').textContent = guideStep === GUIDE.length - 1 ? 'Done' : 'Next';
  }
  function openGuide() {
    guideReturn = document.activeElement;
    guideStep = 0;
    renderGuide();
    guideEl.hidden = false;
    requestAnimationFrame(() => guideEl.classList.add('is-open'));
    document.documentElement.classList.add('auth-open');
    guideEl.querySelector('[data-guide="next"]').focus();
  }
  function closeGuide() {
    if (guideEl.hidden) return;
    try { localStorage.setItem(GUIDE_KEY, '1'); } catch { /* storage unavailable */ }
    guideEl.classList.remove('is-open');
    document.documentElement.classList.remove('auth-open');
    setTimeout(() => { guideEl.hidden = true; }, 200);
    if (guideReturn && guideReturn.isConnected) guideReturn.focus({ preventScroll: true });
  }
  guideEl.addEventListener('click', (e) => {
    if (e.target === guideEl) { closeGuide(); return; }
    const b = e.target.closest('[data-guide]');
    if (!b || b.disabled) return;
    const act = b.dataset.guide;
    if (act === 'close') closeGuide();
    else if (act === 'back') { guideStep = Math.max(0, guideStep - 1); renderGuide(); }
    else if (act === 'next') { if (guideStep === GUIDE.length - 1) closeGuide(); else { guideStep += 1; renderGuide(); } }
  });
  guideEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeGuide(); return; }
    if (e.key === 'ArrowRight') guideEl.querySelector('[data-guide="next"]').click();
    if (e.key === 'ArrowLeft' && guideStep > 0) guideEl.querySelector('[data-guide="back"]').click();
    if (e.key !== 'Tab') return;
    const items = [...guideEl.querySelectorAll('button')].filter((x) => !x.disabled && !x.hidden && x.offsetParent !== null);
    if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus(); }
  });
  $('opVenue').addEventListener('click', (e) => { if (e.target.closest('[data-guide="open"]')) openGuide(); });

  /* ============================================================
     DRAWER
     ============================================================ */
  let drawerReturn = null;
  function openDrawer(title, html) {
    drawerReturn = document.activeElement;
    $('opDrawerTitle').innerHTML = title;
    drawerBody.innerHTML = html;
    drawer.hidden = false;
    drawerBackdrop.hidden = false;
    requestAnimationFrame(() => { drawer.classList.add('is-open'); drawerBackdrop.classList.add('is-open'); });
    document.documentElement.classList.add('auth-open');
    const first = drawerBody.querySelector('input, select, button:not([disabled])');
    (first || drawer.querySelector('[data-op="close-drawer"]')).focus({ preventScroll: true });
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove('is-open');
    drawerBackdrop.classList.remove('is-open');
    document.documentElement.classList.remove('auth-open');
    setTimeout(() => { drawer.hidden = true; drawerBackdrop.hidden = true; }, 200);
    if (drawerReturn && drawerReturn.isConnected) drawerReturn.focus({ preventScroll: true });
  }
  drawerBackdrop.addEventListener('click', closeDrawer);
  drawer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeDrawer(); return; }
    if (e.key !== 'Tab') return;
    const items = [...drawer.querySelectorAll('button, input, select, textarea, a[href]')].filter((el) => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus(); }
  });
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-op="close-drawer"]')) { closeDrawer(); return; }
    const kindBtn = e.target.closest('[data-kind]');
    if (kindBtn) {
      const f = $('opNewRes');
      f.dataset.kind = kindBtn.dataset.kind;
      f.querySelectorAll('[data-kind]').forEach((b) => b.setAttribute('aria-pressed', String(b === kindBtn)));
      const walkIn = f.dataset.kind === 'walk-in';
      f.querySelector('[data-when]').hidden = walkIn;
      f.querySelector('[data-phone-hint]').textContent = walkIn ? '(optional)' : '(required)';
      syncNewResTimes(f);
      return;
    }
    const actBtn = e.target.closest('[data-act]');
    if (actBtn && !actBtn.disabled) handleAction(drawer.dataset.ref, actBtn.dataset.act);
    const res = e.target.closest('.op-res');
    if (res) { closeDrawer(); setTimeout(() => openDetails(res.dataset.ref), 220); }
  });
  drawer.addEventListener('change', (e) => {
    const f = e.target.closest('#opNewRes');
    if (f) {
      if (e.target.name === 'date') syncNewResTimes(f);
      else if (e.target.name === 'time' || e.target.name === 'guests') syncNewResTables(f);
      return;
    }
    if (e.target.matches('[data-op="assign-table"]')) {
      const ref = e.target.dataset.ref;
      const x = S.findReservation(rid, ref);
      const tableId = e.target.value || null;
      if (tableId && !S.isTableFree(rid, x.date, x.minutes, tableId, ref)) {
        toast(`Table ${tableId} is taken at that time.`);
        e.target.value = x.table || '';
        return;
      }
      S.updateReservation(rid, ref, { table: tableId });
      toast(tableId ? `Assigned to table ${tableId}.` : 'Table removed.');
      render();
    }
  });
  // Clear a form error as soon as the owner starts fixing it (on typing, so the
  // layout never shifts under the pointer mid-click)
  drawer.addEventListener('input', (e) => {
    const f = e.target.closest('form');
    if (f && f.querySelector('.auth-error')) f.querySelector('.auth-error').hidden = true;
  });
  drawer.addEventListener('submit', (e) => {
    if (e.target.id === 'opNewRes') { e.preventDefault(); submitNewReservation(e.target); }
  });

  /* ============================================================
     MAIN CONTENT EVENTS
     ============================================================ */
  document.querySelector('.op-nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) setView(b.dataset.view);
  });
  document.querySelector('.op-side-foot').addEventListener('click', (e) => {
    if (e.target.closest('[data-op="signout"]')) TF.signOut();
  });

  content.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { setView(go.dataset.go); return; }
    const res = e.target.closest('.op-res');
    if (res) { openDetails(res.dataset.ref); return; }
    const t = e.target.closest('[data-table]');
    if (t) { state.floorPick = state.floorPick === t.dataset.table ? null : t.dataset.table; render(); const again = content.querySelector(`[data-table="${t.dataset.table}"]`); if (again) again.focus(); return; }
    const btn = e.target.closest('[data-op]');
    if (!btn || btn.disabled) return;
    const op = btn.dataset.op;
    const data = () => S.ownerData(rid);

    if (op === 'new-res') openNewReservation({ date: state.view === 'reservations' ? state.date : undefined });
    else if (op === 'show-pending') { state.statusFilter = 'pending'; state.date = firstPendingDate() || S.todayIso(); setView('reservations'); }
    else if (op === 'show-today') { state.statusFilter = 'all'; state.date = S.todayIso(); setView('reservations'); }
    else if (op === 'day') { state.date = S.addDaysIso(state.date, Number(btn.dataset.step)); render(); }
    else if (op === 'day-today') { state.date = S.todayIso(); render(); }
    else if (op === 'filter') { state.statusFilter = btn.dataset.status; render(); focusSel(`[data-op="filter"][data-status="${btn.dataset.status}"]`); }
    else if (op === 'floor-day') { state.floorDate = S.addDaysIso(state.floorDate, Number(btn.dataset.step)); state.floorTime = null; state.floorPick = null; render(); }
    else if (op === 'floor-today') { state.floorDate = S.todayIso(); state.floorTime = null; state.floorPick = null; render(); }
    else if (op === 'starter-layout') { const d = data(); d.layout = starterLayout(); S.saveOwnerData(rid, d); toast('Starter floor plan added. Diners can now pick a table.'); render(); }
    else if (op === 'block' || op === 'unblock') {
      const d = data();
      d.blocked = d.blocked || {};
      const list = d.blocked[state.floorDate] || [];
      d.blocked[state.floorDate] = op === 'block' ? [...new Set([...list, state.floorPick])] : list.filter((x) => x !== state.floorPick);
      S.saveOwnerData(rid, d);
      toast(op === 'block' ? `Table ${state.floorPick} is blocked for ${fmtDay(state.floorDate).toLowerCase() === 'today' ? 'today' : fullDay(state.floorDate)}.` : `Table ${state.floorPick} is open again.`);
      render();
    }
    else if (op === 'toggle-preorder') { const d = data(); d.preorder = !R.preorder; S.saveOwnerData(rid, d); toast(d.preorder ? 'Pre-orders are on.' : 'Pre-orders are off. Existing pre-orders are kept.'); render(); }
    else if (op === 'add-cat') { readMenuForm($('opMenuForm')); menuDraft().push({ cat: '', items: [{ name: '', note: '', price: 100 }] }); state.menuDirty = true; render(); focusSel('.op-cat:last-of-type [data-field="cat"]'); }
    else if (op === 'del-cat') { readMenuForm($('opMenuForm')); menuDraft().splice(Number(btn.closest('.op-cat').dataset.ci), 1); state.menuDirty = true; render(); }
    else if (op === 'add-dish') { readMenuForm($('opMenuForm')); const ci = Number(btn.closest('.op-cat').dataset.ci); menuDraft()[ci].items.push({ name: '', note: '', price: 100 }); state.menuDirty = true; render(); focusSel(`.op-cat[data-ci="${ci}"] .op-dish:last-of-type [data-field="name"]`); }
    else if (op === 'del-dish') { readMenuForm($('opMenuForm')); const ci = Number(btn.closest('.op-cat').dataset.ci); menuDraft()[ci].items.splice(Number(btn.closest('.op-dish').dataset.ii), 1); state.menuDirty = true; render(); }
    else if (op === 'menu-discard') { state.menuDraft = null; state.menuDirty = false; render(); }
    else if (op === 'toggle-voucher') {
      const d = data();
      const code = btn.dataset.code;
      const set = new Set(d.voucherOptOut || []);
      if (set.has(code)) set.delete(code); else set.add(code);
      d.voucherOptOut = [...set];
      S.saveOwnerData(rid, d);
      toast(set.has(code) ? `${code} is off. Bookings that already use it are honoured.` : `${code} is on.`);
      render();
    }
    else if (op === 'approval') { const d = data(); d.settings = { ...d.settings, approval: btn.dataset.value }; S.saveOwnerData(rid, d); toast(btn.dataset.value === 'manual' ? 'New bookings will wait for your approval.' : 'New bookings are confirmed automatically.'); render(); }
    else if (op === 'toggle-paused') { const d = data(); d.settings = { ...d.settings, paused: !R.paused }; S.saveOwnerData(rid, d); toast(d.settings.paused ? 'Online bookings paused.' : 'Online bookings are back on.'); render(); }
    else if (op === 'reset') { const box = $('opResetConfirm'); box.hidden = false; box.querySelector('button').focus(); }
    else if (op === 'reset-no') { $('opResetConfirm').hidden = true; }
    else if (op === 'reset-yes') { S.resetRestaurant(rid); state.menuDraft = null; state.menuDirty = false; toast('Demo data reset.'); render(); }
    else if (op === 'signout') TF.signOut();
    else if (op === 'copy-link') {
      const field = $('opBookingLink');
      const done = () => toast('Booking link copied.');
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(field.value).then(done, () => { field.select(); toast('Press Ctrl + C to copy the link.'); });
      else { field.select(); toast('Press Ctrl + C to copy the link.'); }
    }
  });
  content.addEventListener('change', (e) => {
    const op = e.target.dataset.op;
    if (op === 'date' && e.target.value) { state.date = e.target.value; render(); }
    else if (op === 'floor-time') { state.floorTime = Number(e.target.value); render(); }
  });
  content.addEventListener('input', (e) => {
    if (e.target.dataset.op === 'search') {
      state.query = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const s = $('opSearch');
      s.focus();
      s.setSelectionRange(pos, pos);
    } else if (e.target.name === 'tax' && e.target.closest('#opTax')) {
      const v = Number(e.target.value);
      $('opTaxPreview').textContent = v >= S.TAX_MIN ? taxPreview(Math.round(v)) : `The minimum is ${peso(S.TAX_MIN)}.`;
    } else if (e.target.closest('#opMenuForm')) {
      if (!state.menuDirty) {
        state.menuDirty = true;
        const form = $('opMenuForm');
        form.querySelectorAll('[data-op="menu-discard"], button[type="submit"]').forEach((b) => { b.disabled = false; });
      }
    }
  });
  content.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.id === 'opMenuForm') saveMenu(e.target);
    if (e.target.id === 'opProfile') saveProfile(e.target);
    if (e.target.id === 'opTax') saveTax(e.target);
  });
  window.addEventListener('beforeunload', (e) => {
    if (state.menuDirty) { e.preventDefault(); e.returnValue = ''; }
  });

  function focusSel(sel) { const el = content.querySelector(sel); if (el) el.focus(); }
  function firstPendingDate() {
    const p = allRes().filter((x) => x.status === 'pending' && startMs(x) > Date.now());
    return p.length ? p[0].date : null;
  }

  // Refresh the dashboard clock-based states every minute
  setInterval(() => { if (state.view === 'dashboard' && drawer.hidden) render(); }, 60000);
  // Diner bookings made in another tab show up here too
  window.addEventListener('storage', () => { if (drawer.hidden && !state.menuDirty) render(); });

  // Links like owner.html#reservations switch sections without reloading
  window.addEventListener('hashchange', () => {
    const v = (window.location.hash || '').slice(1);
    if (v && v !== state.view && document.querySelector(`.op-nav-item[data-view="${v}"]`)) setView(v);
  });
  const start = (window.location.hash || '').slice(1);
  content.setAttribute('tabindex', '-1');
  setView(['dashboard', 'reservations', 'floor', 'menu', 'vouchers', 'profile', 'settings'].includes(start) ? start : 'dashboard');
  if (!guideSeen()) setTimeout(openGuide, 400);
})();
