// ============================================================
// TableFor — shared data layer (store.js)
// Links the diner side and the Partner Portal without a server:
// everything lives in this browser's localStorage.
//   · Owner changes (hours, menu, rules, tables, vouchers) are applied
//     to the restaurant data here, before any page renders.
//   · Reservations = diner bookings made on this device + the owner's
//     own entries (phone / walk-in) + SAMPLE bookings for the demo.
// Load order on every page: restaurants.js → store.js → script.js
// ============================================================

(function () {
  'use strict';

  const OWNER_KEY = 'tablefor_owner';
  const BOOKINGS_KEY = 'tablefor_bookings';
  const TURN_MINUTES = 90;          // how long a table is held for one booking
  const SEED_DAYS = 7;              // sample bookings for today and the next 6 days
  const RESTAURANTS = window.TABLEFOR_RESTAURANTS || [];
  const byId = new Map(RESTAURANTS.map((r) => [r.id, r]));

  /* ---------- Small date helpers (local time) ---------- */
  const pad2 = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayIso = () => iso(new Date());
  const addDaysIso = (s, n) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
  const startMs = (dateIso, mins) => { const d = fromIso(dateIso); d.setMinutes(mins); return d.getTime(); };

  /* ---------- Storage ---------- */
  function readAll() {
    try { return JSON.parse(localStorage.getItem(OWNER_KEY)) || {}; } catch { return {}; }
  }
  function writeAll(all) {
    try { localStorage.setItem(OWNER_KEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
    document.dispatchEvent(new CustomEvent('tablefor:ownerchange'));
  }
  function getBookings() {
    try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || []; } catch { return []; }
  }
  function saveBookings(list) {
    try { localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
    document.dispatchEvent(new CustomEvent('tablefor:bookingschange'));
  }

  // Owner record for one restaurant (created with defaults on first use)
  function ownerData(rid) {
    const all = readAll();
    return all[rid] || {
      settings: { approval: 'auto', paused: false },
      profile: {},          // desc, phone, hours, closedDays, minParty, maxParty
      preorder: null,       // null = keep the listing's setting
      menu: null,           // null = keep the listing's menu
      layout: null,         // null = keep the listing's floor plan (if any)
      blocked: {},          // { 'YYYY-MM-DD': ['T1', ...] } tables closed for the day
      voucherOptOut: [],    // voucher codes this restaurant doesn't accept
      reservations: [],     // phone / walk-in entries + sample bookings
      seededDates: [],
    };
  }
  function saveOwnerData(rid, data) {
    const all = readAll();
    all[rid] = data;
    writeAll(all);
  }

  /* ---------- Apply owner changes to the public listing ---------- */
  const ORIGINAL = new Map(RESTAURANTS.map((r) => [r.id, JSON.parse(JSON.stringify({
    desc: r.desc, phone: r.phone, hours: r.hours, closedDays: r.closedDays, minParty: r.minParty,
    maxParty: r.maxParty, preorder: r.preorder, menu: r.menu, layout: r.layout,
  }))]));
  function applyOverrides() {
    const all = readAll();
    RESTAURANTS.forEach((r) => {
      const base = ORIGINAL.get(r.id);
      const o = all[r.id];
      Object.assign(r, JSON.parse(JSON.stringify(base)));  // start from the original listing
      r.paused = false;
      r.approval = 'auto';
      r.voucherOptOut = [];
      if (!o) return;
      const p = o.profile || {};
      ['desc', 'phone', 'hours', 'closedDays', 'minParty', 'maxParty'].forEach((k) => { if (p[k] !== undefined) r[k] = p[k]; });
      if (o.preorder !== null && o.preorder !== undefined) r.preorder = o.preorder;
      if (o.menu) r.menu = o.menu;
      if (o.layout) r.layout = o.layout;
      r.paused = !!(o.settings && o.settings.paused);
      r.approval = (o.settings && o.settings.approval) || 'auto';
      r.voucherOptOut = o.voucherOptOut || [];
    });
  }
  applyOverrides();

  /* ---------- Sample bookings (so the portal isn't empty in a demo) ---------- */
  const FIRST = ['Maria', 'Jose', 'Ana', 'Carlo', 'Bea', 'Paolo', 'Kim', 'Rafael', 'Nina', 'Miguel', 'Tricia', 'Enzo', 'Lea', 'Marco', 'Joy', 'Gino'];
  const LAST = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Dizon', 'Manalo', 'Lacson', 'Tolentino', 'David', 'Yambao', 'Pineda', 'Sicat'];
  const OCCASIONS = ['', '', '', 'Birthday', 'Anniversary', 'Date night', 'Business meal', 'Family gathering'];
  const NOTES = ['', '', '', 'Window seat if possible', 'High chair please', 'Celebrating, cake arriving at 8', 'No peanuts'];

  function rng(seedText) {
    let h = 2166136261;
    for (const ch of seedText) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function slotsFor(r, dateIso) {
    if (r.closedDays.includes(fromIso(dateIso).getDay())) return [];
    const out = [];
    for (let m = Math.max(r.hours.open, 11 * 60); m <= Math.min(r.hours.close - 60, 22 * 60); m += 30) out.push(m);
    return out;
  }
  function seedDay(r, data, dateIso) {
    const rand = rng(`${r.id}|${dateIso}`);
    const slots = slotsFor(r, dateIso);
    if (!slots.length) return;
    const count = 3 + Math.floor(rand() * 5);   // 3–7 bookings a day
    const tables = r.layout ? r.layout.tables : [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const minutes = slots[Math.floor(rand() * slots.length)];
      const guests = Math.min(Math.max(r.minParty, 1 + Math.floor(rand() * 5)), r.maxParty);
      const fits = tables.filter((t) => t.seats >= guests && t.seats - guests <= 4
        && !data.reservations.some((x) => x.date === dateIso && x.table === t.id && Math.abs(x.minutes - minutes) < TURN_MINUTES));
      const table = fits.length ? fits[Math.floor(rand() * fits.length)].id : null;
      const hasPre = r.preorder && r.menu && r.menu.length && rand() < 0.35;
      const items = hasPre ? r.menu.flatMap((c) => c.items) : [];
      const preorder = hasPre ? [items[Math.floor(rand() * items.length)]].map((it) => ({ name: it.name, qty: 1 + Math.floor(rand() * 2), price: it.price })) : [];
      const past = startMs(dateIso, minutes) + TURN_MINUTES * 60000 < now;
      data.reservations.push({
        ref: `TF-S${(dateIso.replace(/-/g, '').slice(4))}${i}${r.id.slice(0, 2).toUpperCase()}`,
        source: 'sample',
        date: dateIso, minutes, guests,
        fullName: `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`,
        phone: `09${17 + Math.floor(rand() * 10)} ${100 + Math.floor(rand() * 900)} ${1000 + Math.floor(rand() * 9000)}`,
        occasion: OCCASIONS[Math.floor(rand() * OCCASIONS.length)],
        notes: NOTES[Math.floor(rand() * NOTES.length)],
        preorder, voucher: null, table,
        status: past ? (rand() < 0.1 ? 'no-show' : 'completed') : (r.approval === 'manual' && rand() < 0.5 ? 'pending' : 'confirmed'),
        createdAt: now,
      });
    }
  }
  // Make sure sample bookings exist for today and the next few days
  function ensureSeeded(rid) {
    const r = byId.get(rid);
    if (!r) return ownerData(rid);
    const data = ownerData(rid);
    const start = todayIso();
    let changed = false;
    for (let i = 0; i < SEED_DAYS; i++) {
      const d = addDaysIso(start, i);
      if (!data.seededDates.includes(d)) { seedDay(r, data, d); data.seededDates.push(d); changed = true; }
    }
    if (changed) saveOwnerData(rid, data);
    return data;
  }

  /* ---------- Reservations: one list for the owner ---------- */
  const ACTIVE = ['pending', 'confirmed', 'seated'];
  const statusOf = (b) => b.status || 'confirmed';
  function reservationsFor(rid) {
    const data = ensureSeeded(rid);
    const diner = getBookings().filter((b) => b.id === rid).map((b) => ({ ...b, source: 'tablefor', status: statusOf(b) }));
    return [...diner, ...data.reservations].sort((a, b) => a.date.localeCompare(b.date) || a.minutes - b.minutes);
  }
  function findReservation(rid, ref) {
    return reservationsFor(rid).find((x) => x.ref === ref) || null;
  }
  // Update a reservation wherever it lives (diner bookings or the owner's list)
  function updateReservation(rid, ref, changes) {
    const list = getBookings();
    const i = list.findIndex((b) => b.ref === ref && b.id === rid);
    if (i >= 0) {
      list[i] = { ...list[i], ...changes };
      saveBookings(list);
      return list[i];
    }
    const data = ensureSeeded(rid);
    const j = data.reservations.findIndex((x) => x.ref === ref);
    if (j < 0) return null;
    data.reservations[j] = { ...data.reservations[j], ...changes };
    saveOwnerData(rid, data);
    return data.reservations[j];
  }
  function addReservation(rid, res) {
    const data = ensureSeeded(rid);
    data.reservations.push(res);
    saveOwnerData(rid, data);
  }

  /* ---------- Tables ---------- */
  const overlaps = (a, b) => Math.abs(a - b) < TURN_MINUTES;
  function isBlocked(rid, dateIso, tableId) {
    const blocked = ownerData(rid).blocked || {};
    return (blocked[dateIso] || []).includes(tableId);
  }
  // Who holds a table around a time (null if free). Ignores one booking (the one being edited).
  function tableHolder(rid, dateIso, mins, tableId, ignoreRef) {
    return reservationsFor(rid).find((x) => x.ref !== ignoreRef && x.table === tableId && x.date === dateIso
      && ACTIVE.includes(x.status) && overlaps(x.minutes, mins)) || null;
  }
  function isTableFree(rid, dateIso, mins, tableId, ignoreRef) {
    return !isBlocked(rid, dateIso, tableId) && !tableHolder(rid, dateIso, mins, tableId, ignoreRef);
  }

  window.TableForStore = {
    TURN_MINUTES, ACTIVE,
    ownerData, saveOwnerData, applyOverrides, ensureSeeded,
    reservationsFor, findReservation, updateReservation, addReservation,
    isBlocked, tableHolder, isTableFree,
    getBookings, saveBookings,
    iso, fromIso, todayIso, addDaysIso, startMs,
    resetRestaurant(rid) { const all = readAll(); delete all[rid]; writeAll(all); applyOverrides(); },
  };
})();
