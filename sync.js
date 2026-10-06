// ============================================================
// TableFor — keep sign-in, bookings and vouchers the same on every page
//
// On a web server (GitHub Pages, a local server) every page already shares
// one localStorage, so this file does nothing there.
//
// When the pages are opened straight from a folder (file://), some browsers
// (Firefox and Firefox-based ones) give every file its own storage. Signing in
// on one page then wouldn't show on the next, and a different account could be
// signed in on each page. To stop that, the site's saved data travels with you:
// it's added to the link you click, and the next page takes it if it's newer.
// ============================================================
// Blog photos: the saved copy in images/blog first, then the photo published with the
// article itself, then a plain TableFor Journal cover naming the source (never a restaurant photo)
window.tfBlogImage = function (img) {
  if (img.dataset.web && !img.dataset.triedWeb) {
    img.dataset.triedWeb = '1';
    img.src = img.dataset.web;
    return;
  }
  img.onerror = null;
  const cover = document.createElement('div');
  cover.className = 'journal-cover journal-cover--source';
  cover.setAttribute('aria-hidden', 'true');
  const tag = document.createElement('span');
  tag.className = 'journal-cover-tag';
  tag.textContent = 'From around Pampanga';
  const word = document.createElement('span');
  word.className = 'journal-cover-word';
  word.textContent = img.dataset.source || 'Read the article';
  cover.append(tag, word);
  img.replaceWith(cover);
};

(function () {
  'use strict';

  const PREFIX = 'tablefor_';
  const STAMP = 'tablefor_sync_at';
  const PARAM = 'tfstate';
  const NAME_TAG = 'tablefor-state:';

  let store;
  try { store = window.localStorage; store.getItem(STAMP); } catch { return; }

  const rawSet = Storage.prototype.setItem;
  const rawRemove = Storage.prototype.removeItem;

  const isOurs = (k) => typeof k === 'string' && k.startsWith(PREFIX) && k !== STAMP;
  const stampNow = () => rawSet.call(store, STAMP, String(Date.now()));
  const localStamp = () => Number(store.getItem(STAMP)) || 0;

  // Any change to the site's data records when it happened
  Storage.prototype.setItem = function (k, v) {
    const changed = this === store && isOurs(k) && this.getItem(k) !== String(v);
    rawSet.call(this, k, v);
    if (changed) stampNow();
  };
  Storage.prototype.removeItem = function (k) {
    const changed = this === store && isOurs(k) && this.getItem(k) !== null;
    rawRemove.call(this, k);
    if (changed) stampNow();
  };

  function snapshot() {
    const data = {};
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (isOurs(k)) data[k] = store.getItem(k);
    }
    return { at: localStamp(), data };
  }
  // Take a snapshot only if it's newer than what this page already has
  function adopt(snap) {
    if (!snap || typeof snap !== 'object' || !snap.data || !(Number(snap.at) > localStamp())) return false;
    const old = [];
    for (let i = 0; i < store.length; i++) { const k = store.key(i); if (isOurs(k)) old.push(k); }
    old.forEach((k) => rawRemove.call(store, k));
    Object.keys(snap.data).forEach((k) => { if (isOurs(k)) rawSet.call(store, k, String(snap.data[k])); });
    rawSet.call(store, STAMP, String(snap.at));
    return true;
  }

  const fromFile = window.location.protocol === 'file:';
  if (!fromFile) {
    window.TableForGo = (url) => { window.location.href = url; };
    return;
  }

  // 1. State carried in the link that opened this page
  const url = new URL(window.location.href);
  const carried = url.searchParams.get(PARAM);
  if (carried) {
    try { adopt(JSON.parse(carried)); } catch { /* ignore a damaged link */ }
    url.searchParams.delete(PARAM);
    history.replaceState(history.state, '', url.toString());
  }
  // 2. State left in this tab by the previous page (covers the Back button)
  try {
    if (window.name.startsWith(NAME_TAG)) adopt(JSON.parse(window.name.slice(NAME_TAG.length)));
  } catch { /* ignore */ }

  const remember = () => { try { window.name = NAME_TAG + JSON.stringify(snapshot()); } catch { /* ignore */ } };
  window.addEventListener('pagehide', remember);
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    try {
      if (window.name.startsWith(NAME_TAG) && adopt(JSON.parse(window.name.slice(NAME_TAG.length)))) window.location.reload();
    } catch { /* ignore */ }
  });

  function withState(href) {
    try {
      const next = new URL(href, window.location.href);
      if (next.protocol !== 'file:' || !/\.html?$/i.test(next.pathname)) return href;
      if (next.pathname === window.location.pathname) return href; // same page (e.g. #vouchers): just scroll
      next.searchParams.set(PARAM, JSON.stringify(snapshot()));
      return next.toString();
    } catch { return href; }
  }
  window.TableForGo = (target) => { remember(); window.location.href = withState(target); };

  // Add the state to site links at the moment they're used
  const tag = (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^(mailto|tel|https?|javascript):/i.test(href)) return;
    a.href = withState(href.replace(/([?&])tfstate=[^&#]*&?/, '$1'));
    remember();
  };
  document.addEventListener('click', tag, true);
  document.addEventListener('auxclick', tag, true);
  document.addEventListener('contextmenu', tag, true);
}());
