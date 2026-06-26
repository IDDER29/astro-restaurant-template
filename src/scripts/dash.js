// Owner dashboard interactivity (demo): sidebar switching, toggles, order pills,
// live preview, and button feedback. All state persisted to localStorage.
import { buildStagesObject } from './order-stages.js';
import { generateQrSvg, generateQrPng } from './qr-encode.js';

const SECTIONS = ['dashboard','orders','menu','catering','website-content','hours','business-info','qr-codes'];
const LABELS = {
  dashboard: 'Dashboard', orders: 'Orders', menu: 'Menu', catering: 'Catering',
  'website-content': 'Website content', hours: 'Hours', 'business-info': 'Business info', 'qr-codes': 'QR codes',
};

const STATUS_CYCLE  = ['New', 'Preparing', 'Ready', 'Picked up'];
// Index-based color lookup (used by applyPillStatus and wireOrderStages so colors stay
// correct even after stages are renamed).
const STAGE_INDEX_COLORS = [
  { bg: 'rgb(255, 231, 226)', color: 'rgb(210, 69, 30)' },
  { bg: 'rgb(255, 241, 214)', color: 'rgb(154, 106, 18)' },
  { bg: 'rgb(226, 242, 230)', color: 'rgb(46, 125, 70)' },
  { bg: 'rgb(236, 233, 226)', color: 'rgb(122, 113, 101)' },
];
const _DEFAULT_STAGES = ['New', 'Preparing', 'Ready', 'Picked up'];
const TOGGLE_ON_BG  = 'rgb(46, 158, 91)';
const TOGGLE_OFF_BG = 'rgb(203, 213, 225)';

// ── Toast ──────────────────────────────────────────────────────────────────────
function showToast(msg) {
  let el = document.getElementById('marmara-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'marmara-toast';
    Object.assign(el.style, {
      position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
      background: 'rgb(24, 20, 16)', color: 'rgb(255, 251, 244)',
      padding: '10px 20px', borderRadius: '11px', fontSize: '14px', fontWeight: '700',
      zIndex: '9999', pointerEvents: 'none', transition: 'opacity 0.3s', opacity: '0',
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._tid);
  el._tid = setTimeout(() => { el.style.opacity = '0'; }, 2200);
}

// ── Section switching ──────────────────────────────────────────────────────────
function panels() {
  const map = {};
  document.querySelectorAll('[data-dash-section]').forEach(el => {
    map[el.getAttribute('data-dash-section')] = el;
  });
  return map;
}

function navRows() {
  const rows = {};
  const candidates = Array.from(document.querySelectorAll('div')).filter(d => {
    const s = d.getAttribute('style') || '';
    return s.includes('padding: 11px 12px') && s.includes('cursor: pointer') && s.includes('font-size: 15px');
  });
  for (const slug of SECTIONS) {
    const label = LABELS[slug];
    const row = candidates.find(d => d.textContent.replace(/\s+/g, ' ').includes(label));
    if (row) rows[slug] = row;
  }
  return rows;
}

function show(slug, P, rows) {
  SECTIONS.forEach(s => { if (P[s]) P[s].style.display = s === slug ? '' : 'none'; });
  Object.entries(rows).forEach(([s, row]) => {
    const active = s === slug;
    row.style.background = active ? 'rgb(255, 138, 30)' : 'transparent';
    row.style.color      = active ? 'rgb(255,255,255)' : '';
    row.style.cursor     = 'pointer';
  });
  try { localStorage.setItem('marmara_dash_section', slug); } catch(e) {}
}

// ── Generic field persistence ──────────────────────────────────────────────────
function persist(root) {
  const fields = root.querySelectorAll('input, textarea, select');
  fields.forEach((el, i) => {
    if (el.closest('[data-dash-section="menu"]')) return;             // menu manages its own fields
    if (el.closest('[data-dash-section="catering"]')) return;         // catering manages its own fields
    if (el.closest('[data-dash-section="website-content"]')) return;  // website-content manages its own fields
    if (el.getAttribute('data-dc-tpl') === '85') return;             // order stages managed separately
    const key = 'marmara_dash_field_' + i;
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        if (el.type === 'checkbox') el.checked = saved === '1';
        else el.value = saved;
      }
    } catch(e) {}
    const save = () => {
      try { localStorage.setItem(key, el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value); } catch(e) {}
    };
    el.addEventListener('input', save);
    el.addEventListener('change', save);
  });
}

// ── Toggle helpers ─────────────────────────────────────────────────────────────
function isToggleTrack(el) {
  if (el.tagName !== 'DIV') return false;
  const s = el.getAttribute('style') || '';
  return s.includes('border-radius: 999px') && s.includes('cursor: pointer') &&
    (s.includes('width: 46px') || s.includes('width: 42px'));
}

function getKnob(track) { return track.querySelector(':scope > div'); }

/** True when the track's inline background is not a grey off-state */
function isOn(track) {
  const bg = track.style.background || '';
  return !bg.includes('217, 210, 196') && !bg.includes('203, 213, 225');
}

/** The Open/Closed header toggle has a sibling <span> with text Open|Closed */
function isOpenToggle(track) {
  const prev = track.previousElementSibling;
  return prev && prev.tagName === 'SPAN' && /^(Open|Closed)$/i.test(prev.textContent.trim());
}

/** Hours day-row toggles live in rows with padding: 14px 0px */
function isHoursToggle(track) {
  const row = track.parentElement;
  return row && (row.getAttribute('style') || '').includes('padding: 14px 0px');
}

function applyToggle(track, on) {
  track.style.background = on ? TOGGLE_ON_BG : TOGGLE_OFF_BG;
  const knob = getKnob(track);
  if (knob) knob.style.left = on ? (track.dataset.marmaraOnLeft || '22px') : '2px';
}

// ── Open / Closed global state ────────────────────────────────────────────────
function getOpenState() {
  try { return localStorage.getItem('marmara_dash_open') !== '0'; } catch(e) { return true; }
}

function applyOpenState(on) {
  const label      = on ? 'Open' : 'Closed';
  const labelColor = on ? 'rgb(46, 158, 91)' : 'rgb(154, 143, 126)';
  document.querySelectorAll('[data-dash-section] div').forEach(el => {
    if (!isToggleTrack(el) || !isOpenToggle(el)) return;
    applyToggle(el, on);
    const span = el.previousElementSibling;
    if (span) { span.textContent = label; span.style.color = labelColor; }
  });
  updateStoreCard(on);
  try { localStorage.setItem('marmara_dash_open', on ? '1' : '0'); } catch(e) {}
}

function updateStoreCard(on) {
  const section = document.querySelector('[data-dash-section="dashboard"]');
  if (!section) return;
  const card = Array.from(section.querySelectorAll('div')).find(d =>
    (d.getAttribute('style') || '').includes('background: rgb(21, 17, 13)') &&
    d.textContent.includes('Store status')
  );
  if (!card) return;
  const spans = Array.from(card.querySelectorAll('.sc-interp'));
  const bigEl = spans.find(s => /You're/.test(s.textContent));
  const subEl = spans.find(s => /Customers|paused|Ordering/.test(s.textContent));
  const btn   = Array.from(card.querySelectorAll('div')).find(d =>
    /Pause ordering|Resume ordering/.test(d.textContent) &&
    (d.getAttribute('style') || '').includes('cursor')
  );
  if (bigEl) bigEl.textContent = on ? "You're open 🟢" : "You're closed 🔴";
  if (subEl) subEl.textContent = on ? 'Customers can order right now.' : 'Ordering is paused.';
  if (btn) {
    const sc = btn.querySelector('.sc-interp') || btn;
    if (sc) sc.textContent = on ? 'Pause ordering' : 'Resume ordering';
  }
}

// ── Hours: show/hide time inputs when day toggled ─────────────────────────────
function applyHoursToggle(track, on) {
  const timeContainer = track.nextElementSibling;
  if (!timeContainer) return;
  timeContainer.style.display = on ? '' : 'none';
  // Remove or add "Closed" label
  const existing = Array.from(track.parentElement.children)
    .find(c => c.dataset && c.dataset.marmaraClosed);
  if (on) {
    if (existing) existing.remove();
  } else {
    if (!existing) {
      const lbl = document.createElement('span');
      lbl.dataset.marmaraClosed = '1';
      lbl.textContent = 'Closed';
      lbl.style.cssText = 'font-size:13.5px;color:rgb(154,143,126);font-weight:600;';
      track.parentElement.appendChild(lbl);
    }
  }
}

// ── Wire all toggles ───────────────────────────────────────────────────────────
function wireToggles() {
  const allTracks = Array.from(document.querySelectorAll('[data-dash-section] div'))
    .filter(isToggleTrack)
    .filter(el => !el.closest('[data-dash-section="menu"]'))     // menu manages its own toggles
    .filter(el => !el.closest('[data-dash-section="catering"]')); // catering manages its own toggles

  // Capture initial ON knob position per track (before any state change)
  allTracks.forEach(track => {
    const knob = getKnob(track);
    const left = knob && knob.style.left;
    if (left && left !== '2px' && isOn(track)) {
      track.dataset.marmaraOnLeft = left;
    } else {
      const tw = parseInt(track.style.width) || 46;
      const kw = parseInt((knob && knob.style.width) || '22');
      track.dataset.marmaraOnLeft = (tw - kw - 2) + 'px';
    }
  });

  // Restore and wire Open toggles
  applyOpenState(getOpenState());
  allTracks.filter(isOpenToggle).forEach(track => {
    track.addEventListener('click', () => applyOpenState(!getOpenState()));
  });

  // Restore and wire generic toggles
  let gIdx = 0;
  allTracks.filter(t => !isOpenToggle(t)).forEach(track => {
    const idx = gIdx++;
    const key = 'marmara_dash_toggle_' + idx;
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const on = saved === '1';
        applyToggle(track, on);
        if (isHoursToggle(track)) applyHoursToggle(track, on);
      }
    } catch(e) {}
    track.addEventListener('click', () => {
      const newOn = !isOn(track);
      applyToggle(track, newOn);
      if (isHoursToggle(track)) applyHoursToggle(track, newOn);
      try { localStorage.setItem(key, newOn ? '1' : '0'); } catch(e) {}
    });
  });
}

// ── Order stages (rename) ──────────────────────────────────────────────────────

/** Update the text label on all visible pills that are currently showing stageIdx's color. */
function updatePillsForStageIndex(stageIdx, newName) {
  const c = STAGE_INDEX_COLORS[stageIdx];
  if (!c) return;
  document.querySelectorAll('[data-dash-section] div').forEach(el => {
    const s = el.getAttribute('style') || '';
    if (!s.includes('border-radius: 999px') || !s.includes('cursor: pointer')) return;
    if (el.style.background === c.bg) {
      const sc = el.querySelector('.sc-interp');
      if (sc) sc.textContent = newName; else el.textContent = newName;
    }
  });
}

function wireOrderStages() {
  const root = document.querySelector('[data-dash-section="orders"]');
  if (!root) return;
  const inputs = Array.from(root.querySelectorAll('input[data-dc-tpl="85"]'));
  if (inputs.length === 0) return;

  // Restore saved names into STATUS_CYCLE
  try {
    const saved = localStorage.getItem('marmara_order_stages');
    if (saved) {
      const obj = JSON.parse(saved);
      inputs.forEach((inp, i) => {
        if (obj[i] != null) {
          inp.value = obj[i];
          STATUS_CYCLE[i] = obj[i];
        }
      });
    }
  } catch(e) {}

  // Wire input events: update STATUS_CYCLE, persist, and refresh visible pills
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      const name = inp.value || _DEFAULT_STAGES[i];
      STATUS_CYCLE[i] = name;
      const obj = buildStagesObject(inputs.map((x, j) => x.value || _DEFAULT_STAGES[j]));
      try { localStorage.setItem('marmara_order_stages', JSON.stringify(obj)); } catch(e) {}
      updatePillsForStageIndex(i, name);
    });
  });
}

// ── Order status pills ─────────────────────────────────────────────────────────
function getPillText(pill) {
  return (pill.querySelector('.sc-interp') || pill).textContent.trim();
}
function applyPillStatus(pill, status) {
  const idx = STATUS_CYCLE.indexOf(status);
  const c = idx >= 0 ? STAGE_INDEX_COLORS[idx] : null;
  if (!c) return;
  pill.style.background = c.bg;
  pill.style.color = c.color;
  const sc = pill.querySelector('.sc-interp');
  if (sc) sc.textContent = status; else pill.textContent = status;
}
function wireOrderPills() {
  // When stages have been renamed, HTML pills still show the old default names.
  // We detect pills using both the current STATUS_CYCLE and the original defaults.
  const allKnownStages = new Set([..._DEFAULT_STAGES, ...STATUS_CYCLE]);

  // Map a possibly-stale name to the current STATUS_CYCLE equivalent.
  function normaliseStatus(name) {
    if (STATUS_CYCLE.includes(name)) return name;
    const di = _DEFAULT_STAGES.indexOf(name);
    return di >= 0 ? STATUS_CYCLE[di] : null;
  }

  const pills = Array.from(document.querySelectorAll('[data-dash-section] div')).filter(el => {
    const s = el.getAttribute('style') || '';
    return s.includes('border-radius: 999px') && s.includes('cursor: pointer') &&
      allKnownStages.has(getPillText(el));
  });
  pills.forEach((pill, i) => {
    const key = 'marmara_dash_pill_' + i;
    let restored = false;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const norm = normaliseStatus(saved);
        if (norm) { applyPillStatus(pill, norm); restored = true; }
      }
    } catch(e) {}
    // If nothing was restored from localStorage, but the HTML pill text is an old default
    // that has since been renamed, display the current name.
    if (!restored) {
      const htmlText = getPillText(pill);
      const htmlNorm = normaliseStatus(htmlText);
      if (htmlNorm && htmlNorm !== htmlText) applyPillStatus(pill, htmlNorm);
    }
    pill.addEventListener('click', () => {
      const cur = getPillText(pill);
      let idx = STATUS_CYCLE.indexOf(cur);
      if (idx < 0) {
        const di = _DEFAULT_STAGES.indexOf(cur);
        idx = di >= 0 ? di : 0;
      }
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      applyPillStatus(pill, next);
      try { localStorage.setItem(key, next); } catch(e) {}
    });
  });
}

// ── Website content live preview ───────────────────────────────────────────────
function flashSaved(root) {
  const ind = root.querySelector('[data-dc-tpl="283"]');
  if (!ind) return;
  ind.style.transition = 'opacity 0.15s, transform 0.15s';
  ind.style.opacity    = '1';
  ind.style.transform  = 'scale(1.08)';
  clearTimeout(ind._ftid);
  ind._ftid = setTimeout(() => { ind.style.transform = 'scale(1)'; ind.style.opacity = '0.65'; }, 1200);
}
const SITE_CONTENT_KEY = 'marmara_site_content';

// All 7 website-content fields: [inputTpl, storageKey, previewTpl|null]
const SITE_CONTENT_FIELDS = [
  ['250', 'heroBadge',      '260'],
  ['253', 'heroHeadline',   '262'],
  ['256', 'heroSub',        '263'],
  ['270', 'promoText',      null],
  ['276', 'aboutStory',     null],
  ['279', 'beliefHeading',  null],
  ['282', 'beliefBody',     null],
];

function saveSiteContent(root) {
  const obj = {};
  SITE_CONTENT_FIELDS.forEach(([inTpl, key]) => {
    const inp = root.querySelector('[data-dc-tpl="' + inTpl + '"]');
    if (inp) obj[key] = inp.value;
  });
  try { localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(obj)); } catch(e) {}
}

function wireWebsiteContentPreview() {
  const root = document.querySelector('[data-dash-section="website-content"]');
  if (!root) return;

  // Wire up preview updates + localStorage persistence for all 7 fields
  SITE_CONTENT_FIELDS.forEach(([inTpl, , prvTpl]) => {
    const inp = root.querySelector('[data-dc-tpl="' + inTpl + '"]');
    if (!inp) return;

    // For the 3 fields that have a live preview panel
    if (prvTpl) {
      const prv = root.querySelector('[data-dc-tpl="' + prvTpl + '"]');
      if (prv) {
        const target = prv.querySelector('.sc-interp') || prv;
        inp.addEventListener('input', () => { target.textContent = inp.value; });
      }
    }

    inp.addEventListener('input', () => {
      flashSaved(root);
      saveSiteContent(root);
    });
  });

  // After persist() has restored values, restore from marmara_site_content and re-sync previews
  setTimeout(() => {
    try {
      const raw = localStorage.getItem(SITE_CONTENT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          SITE_CONTENT_FIELDS.forEach(([inTpl, key]) => {
            const inp = root.querySelector('[data-dc-tpl="' + inTpl + '"]');
            if (inp && saved[key] !== undefined) inp.value = saved[key];
          });
        }
      }
    } catch(e) {}
    // Re-sync the 3 preview fields
    SITE_CONTENT_FIELDS.forEach(([inTpl, , prvTpl]) => {
      if (!prvTpl) return;
      const inp = root.querySelector('[data-dc-tpl="' + inTpl + '"]');
      if (inp) inp.dispatchEvent(new Event('input'));
    });
  }, 60);
}

// ── Business info live preview ─────────────────────────────────────────────────
function wireBusinessInfoPreview() {
  const root = document.querySelector('[data-dash-section="business-info"]');
  if (!root) return;
  const links = [['208','214'], ['211','215']];
  links.forEach(([inTpl, prvTpl]) => {
    const inp = root.querySelector('[data-dc-tpl="' + inTpl + '"]');
    const prv = root.querySelector('[data-dc-tpl="' + prvTpl + '"]');
    if (!inp || !prv) return;
    const target = prv.querySelector('.sc-interp') || prv;
    inp.addEventListener('input', () => { target.textContent = inp.value; });
  });
  setTimeout(() => {
    links.forEach(([inTpl]) => {
      const inp = root.querySelector('[data-dc-tpl="' + inTpl + '"]');
      if (inp) inp.dispatchEvent(new Event('input'));
    });
  }, 60);
}

// ── Menu CRUD ─────────────────────────────────────────────────────────────────
const MENU_KEY = 'marmara_menu_plates';
const POPULAR_ON_BG  = 'rgb(255, 138, 30)';
const POPULAR_OFF_BG = 'rgb(203, 213, 225)';
const MENU_CATEGORIES = [
  { key: 'breakfast',  label: 'Breakfast' },
  { key: 'sandwiches', label: 'Sandwiches & Paninis' },
  { key: 'tacos',      label: 'Moroccan Tacos' },
  { key: 'burgers',    label: 'Burgers' },
  { key: 'pizza',      label: 'Pizza' },
  { key: 'pasta',      label: 'Pasta' },
  { key: 'salads',     label: 'Salads' },
  { key: 'crepes',     label: 'Crepes' },
  { key: 'drinks',     label: 'Juices & Drinks' },
];

function savePlates(plates) {
  try { localStorage.setItem(MENU_KEY, JSON.stringify(plates)); } catch(e) {}
}

function loadPlates() {
  try {
    const s = localStorage.getItem(MENU_KEY);
    if (s) return JSON.parse(s);
  } catch(e) {}
  return null;
}

function seedFromMarkup(menuRoot) {
  const rows = menuRoot.querySelectorAll('[data-dc-tpl="119"]');
  return Array.from(rows).map(row => {
    const name      = row.querySelector('[data-dc-tpl="122"] .sc-interp')?.textContent.trim() || '';
    const desc      = row.querySelector('[data-dc-tpl="125"] .sc-interp')?.textContent.trim() || '';
    const catLabel  = row.querySelector('[data-dc-tpl="126"] .sc-interp')?.textContent.trim() || '';
    const priceText = row.querySelector('[data-dc-tpl="127"] .sc-interp')?.textContent.trim() || '0';
    const price     = parseInt(priceText) || 0;
    const availTrack = row.querySelector('[data-dc-tpl="129"]');
    const available  = availTrack ? (availTrack.style.background || '').includes('46, 158, 91') : true;
    const popular    = !!row.querySelector('[data-dc-tpl="124"]');
    const cl = catLabel.toLowerCase();
    const cat = MENU_CATEGORIES.find(c => {
      const l = c.label.toLowerCase();
      return l === cl || l.includes(cl) || cl.includes(c.key);
    });
    const category      = cat ? cat.key : 'sandwiches';
    const categoryLabel = cat ? cat.label : catLabel;
    return {
      id: 'plate_' + name.replace(/\s+/g, '_').toLowerCase(),
      name, desc, category, categoryLabel, price, popular, available,
    };
  });
}

function applyRowAvailToggle(track, knob, on) {
  track.style.background = on ? TOGGLE_ON_BG : TOGGLE_OFF_BG;
  if (knob) knob.style.left = on ? '22px' : '2px';
}

function createPlateRow(plate, plates, openEditorFn) {
  const row = document.createElement('div');
  row.setAttribute('data-dc-tpl', '119');
  row.dataset.plateId = plate.id;
  row.style.cssText = 'display: flex; align-items: center; gap: 14px; padding: 12px 20px; border-top: 1px solid rgb(242, 236, 224);';

  // Photo slot
  const imgSlot = document.createElement('image-slot');
  imgSlot.setAttribute('data-dc-tpl', '120');
  imgSlot.setAttribute('shape', 'rounded');
  imgSlot.setAttribute('radius', '11');
  imgSlot.setAttribute('placeholder', '');
  imgSlot.style.cssText = 'width: 52px; height: 52px; flex: 0 0 auto; border: 1px solid rgb(231, 223, 208); border-radius: 11px;';
  row.appendChild(imgSlot);

  // Name + desc block
  const nameBlock = document.createElement('div');
  nameBlock.setAttribute('data-dc-tpl', '121');
  nameBlock.style.cssText = 'flex: 1 1 0%; min-width: 0px; cursor: pointer;';

  const nameDiv = document.createElement('div');
  nameDiv.setAttribute('data-dc-tpl', '122');
  nameDiv.style.cssText = 'font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px;';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'sc-interp';
  nameSpan.textContent = plate.name;
  nameDiv.appendChild(nameSpan);
  if (plate.popular) {
    const star = document.createElement('span');
    star.setAttribute('data-dc-tpl', '124');
    star.style.cssText = 'font-size: 11px; font-weight: 700; color: rgb(255, 138, 30);';
    star.textContent = '★';
    nameDiv.appendChild(star);
  }
  nameBlock.appendChild(nameDiv);

  const descDiv = document.createElement('div');
  descDiv.setAttribute('data-dc-tpl', '125');
  descDiv.style.cssText = 'font-size: 12.5px; color: rgb(154, 143, 126); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
  const descSpan = document.createElement('span');
  descSpan.className = 'sc-interp';
  descSpan.textContent = plate.desc;
  descDiv.appendChild(descSpan);
  nameBlock.appendChild(descDiv);
  row.appendChild(nameBlock);

  // Category
  const catDiv = document.createElement('div');
  catDiv.setAttribute('data-dc-tpl', '126');
  catDiv.style.cssText = 'width: 120px; font-size: 13.5px; color: rgb(107, 99, 88);';
  const catSpan = document.createElement('span');
  catSpan.className = 'sc-interp';
  catSpan.textContent = plate.categoryLabel;
  catDiv.appendChild(catSpan);
  row.appendChild(catDiv);

  // Price
  const priceDiv = document.createElement('div');
  priceDiv.setAttribute('data-dc-tpl', '127');
  priceDiv.style.cssText = 'width: 84px; text-align: right; font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 15px;';
  const priceSpan = document.createElement('span');
  priceSpan.className = 'sc-interp';
  priceSpan.textContent = plate.price + ' MAD';
  priceDiv.appendChild(priceSpan);
  row.appendChild(priceDiv);

  // Available toggle
  const availOuter = document.createElement('div');
  availOuter.setAttribute('data-dc-tpl', '128');
  availOuter.style.cssText = 'width: 84px; display: flex; justify-content: center;';
  const availTrack = document.createElement('div');
  availTrack.setAttribute('data-dc-tpl', '129');
  availTrack.style.cssText = 'width: 42px; height: 24px; border-radius: 999px; position: relative; cursor: pointer;';
  const availKnob = document.createElement('div');
  availKnob.setAttribute('data-dc-tpl', '130');
  availKnob.style.cssText = 'position: absolute; top: 2px; width: 20px; height: 20px; border-radius: 50%; background: rgb(255, 255, 255); box-shadow: rgba(0, 0, 0, 0.25) 0px 1px 2px;';
  applyRowAvailToggle(availTrack, availKnob, plate.available);
  availTrack.appendChild(availKnob);
  availOuter.appendChild(availTrack);
  row.appendChild(availOuter);

  // Edit button
  const actDiv = document.createElement('div');
  actDiv.setAttribute('data-dc-tpl', '131');
  actDiv.style.cssText = 'width: 64px; display: flex; justify-content: flex-end; gap: 8px;';
  const editBtn = document.createElement('div');
  editBtn.setAttribute('data-dc-tpl', '132');
  editBtn.style.cssText = 'height: 32px; padding: 0px 12px; border-radius: 9px; background: rgb(241, 237, 230); color: rgb(24, 20, 16); display: flex; align-items: center; font-size: 13px; font-weight: 700; cursor: pointer;';
  editBtn.textContent = 'Edit';
  actDiv.appendChild(editBtn);
  row.appendChild(actDiv);

  // Wire available toggle (closure over plate ref in array)
  availTrack.addEventListener('click', () => {
    const p = plates.find(x => x.id === plate.id);
    if (!p) return;
    p.available = !p.available;
    applyRowAvailToggle(availTrack, availKnob, p.available);
    savePlates(plates);
  });

  // Wire edit button + name click
  const openEdit = () => openEditorFn(plate.id);
  editBtn.addEventListener('click', openEdit);
  nameBlock.addEventListener('click', openEdit);

  return row;
}

function updateMenuCounter(menuRoot, count) {
  const el = menuRoot.querySelector('[data-dc-tpl="107"] .sc-interp');
  if (el) el.textContent = count + ' items';
}

function renderPlates(menuRoot, plates, openEditorFn) {
  const container = menuRoot.querySelector('[data-dc-tpl="110"]');
  if (!container) return;
  container.querySelectorAll('[data-dc-tpl="119"]').forEach(r => r.remove());
  plates.forEach(plate => container.appendChild(createPlateRow(plate, plates, openEditorFn)));
  updateMenuCounter(menuRoot, plates.length);
}

// ── Menu section ───────────────────────────────────────────────────────────────
function wireMenuSection() {
  const menuRoot   = document.querySelector('[data-dash-section="menu"]');
  if (!menuRoot) return;
  const listView   = menuRoot.querySelector('[data-menu-view="list"]');
  const editorView = menuRoot.querySelector('[data-menu-view="editor"]');
  if (!listView || !editorView) return;

  // Editor field references
  const nameInput    = editorView.querySelector('[data-dc-tpl="145"]');
  const descInput    = editorView.querySelector('[data-dc-tpl="148"]');
  const catSelect    = editorView.querySelector('[data-dc-tpl="152"]');
  const priceInput   = editorView.querySelector('[data-dc-tpl="164"]');
  const popularWrap  = editorView.querySelector('[data-dc-tpl="166"]');
  const popularTrack = editorView.querySelector('[data-dc-tpl="167"]');
  const popularKnob  = popularTrack ? popularTrack.querySelector('div') : null;
  const availWrap    = editorView.querySelector('[data-dc-tpl="170"]');
  const availTrack   = editorView.querySelector('[data-dc-tpl="171"]');
  const availKnob    = availTrack ? availTrack.querySelector('div') : null;
  const saveBtn      = editorView.querySelector('[data-dc-tpl="175"]');
  const cancelBtn    = editorView.querySelector('[data-dc-tpl="176"]');
  const deleteBtn    = editorView.querySelector('[data-dc-tpl="178"]');
  const backLink     = editorView.querySelector('[data-dc-tpl="136"]');
  const titleEl      = editorView.querySelector('[data-dc-tpl="29"] .sc-interp');

  let plates = [];
  let currentMode    = 'edit';
  let currentPlateId = null;
  let editorPopular  = false;
  let editorAvail    = true;

  function showMenuList()   { listView.style.display = ''; editorView.style.display = 'none'; }
  function showMenuEditor() { listView.style.display = 'none'; editorView.style.display = ''; }

  function setPopularUI(on) {
    editorPopular = on;
    if (popularTrack) popularTrack.style.background = on ? POPULAR_ON_BG : POPULAR_OFF_BG;
    if (popularKnob)  popularKnob.style.left        = on ? '20px' : '2px';
  }

  function setAvailEditorUI(on) {
    editorAvail = on;
    if (availTrack) availTrack.style.background = on ? TOGGLE_ON_BG : TOGGLE_OFF_BG;
    if (availKnob)  availKnob.style.left        = on ? '22px' : '2px';
  }

  function openEditor(plateId) {
    currentMode    = 'edit';
    currentPlateId = plateId;
    const plate = plates.find(p => p.id === plateId);
    if (!plate) return;
    if (nameInput)  nameInput.value  = plate.name;
    if (descInput)  descInput.value  = plate.desc;
    if (catSelect)  catSelect.value  = plate.category;
    if (priceInput) priceInput.value = plate.price;
    setPopularUI(plate.popular);
    setAvailEditorUI(plate.available);
    if (titleEl)   titleEl.textContent    = 'Edit plate';
    if (deleteBtn) deleteBtn.style.display = '';
    showMenuEditor();
  }

  function openAddEditor() {
    currentMode    = 'add';
    currentPlateId = null;
    if (nameInput)  nameInput.value      = '';
    if (descInput)  descInput.value      = '';
    if (catSelect)  catSelect.selectedIndex = 0;
    if (priceInput) priceInput.value     = '0';
    setPopularUI(false);
    setAvailEditorUI(true);
    if (titleEl)   titleEl.textContent    = 'Add plate';
    if (deleteBtn) deleteBtn.style.display = 'none';
    showMenuEditor();
  }

  function saveEditor() {
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      if (nameInput) {
        nameInput.style.borderColor = 'rgb(226, 59, 59)';
        setTimeout(() => { nameInput.style.borderColor = ''; }, 1500);
      }
      return;
    }
    const catKey   = catSelect ? catSelect.value : 'sandwiches';
    const catEntry = MENU_CATEGORIES.find(c => c.key === catKey) || MENU_CATEGORIES[1];
    const price    = parseInt(priceInput ? priceInput.value : '0') || 0;
    const desc     = descInput ? descInput.value.trim() : '';

    if (currentMode === 'edit') {
      const idx = plates.findIndex(p => p.id === currentPlateId);
      if (idx === -1) return;
      plates[idx] = { ...plates[idx], name, desc, category: catKey, categoryLabel: catEntry.label, price, popular: editorPopular, available: editorAvail };
    } else {
      plates.push({
        id: 'plate_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        name, desc, category: catKey, categoryLabel: catEntry.label, price, popular: editorPopular, available: editorAvail,
      });
    }
    savePlates(plates);
    renderPlates(menuRoot, plates, openEditor);
    if (deleteBtn) deleteBtn.style.display = '';
    showMenuList();
    showToast('Saved');
  }

  function deletePlate() {
    const idx = plates.findIndex(p => p.id === currentPlateId);
    if (idx === -1) return;
    plates.splice(idx, 1);
    savePlates(plates);
    renderPlates(menuRoot, plates, openEditor);
    showMenuList();
    showToast('Deleted');
  }

  // Seed or restore plates
  const saved = loadPlates();
  if (saved && saved.length > 0) {
    plates = saved;
    renderPlates(menuRoot, plates, openEditor);
  } else {
    plates = seedFromMarkup(menuRoot);
    savePlates(plates);
    renderPlates(menuRoot, plates, openEditor);
  }

  // Wire editor toggle wrappers
  if (popularWrap) popularWrap.addEventListener('click', () => setPopularUI(!editorPopular));
  if (availWrap)   availWrap.addEventListener('click', () => setAvailEditorUI(!editorAvail));

  // Wire editor action buttons
  if (saveBtn)   saveBtn.addEventListener('click', saveEditor);
  if (cancelBtn) cancelBtn.addEventListener('click', showMenuList);
  if (deleteBtn) deleteBtn.addEventListener('click', deletePlate);
  if (backLink)  backLink.addEventListener('click', showMenuList);

  // Wire "Add new plate" button
  const addBtn = menuRoot.querySelector('[data-dc-tpl="109"]');
  if (addBtn) addBtn.addEventListener('click', openAddEditor);
}

// ── Catering section ─────────────────────────────────────────────────────────
const CATERING_KEY    = 'marmara_catering_packages';
const FEAT_ON_BG      = 'rgb(255, 138, 30)';
const FEAT_OFF_BG     = 'rgb(217, 210, 196)';
const FEAT_ON_BORDER  = 'rgb(255, 138, 30)';
const FEAT_OFF_BORDER = 'rgb(231, 223, 208)';

function saveCateringPackages(pkgs) {
  try { localStorage.setItem(CATERING_KEY, JSON.stringify(pkgs)); } catch(e) {}
}

function loadCateringPackages() {
  try {
    const s = localStorage.getItem(CATERING_KEY);
    if (s) return JSON.parse(s);
  } catch(e) {}
  return null;
}

function seedCateringFromMarkup(root) {
  const cards = root.querySelectorAll('[data-dc-tpl="293"]');
  return Array.from(cards).map((card, idx) => {
    const emojiInp  = card.querySelector('[data-dc-tpl="302"]');
    const nameInp   = card.querySelector('[data-dc-tpl="303"]');
    const servesInp = card.querySelector('[data-dc-tpl="307"]');
    const priceInp  = card.querySelector('[data-dc-tpl="310"]');
    const featTrack = card.querySelector('[data-dc-tpl="297"]');
    const lines = Array.from(card.querySelectorAll('[data-dc-tpl="316"]')).map(inp => inp.value || '');
    const name  = nameInp?.value?.trim() || ('Package ' + (idx + 1));
    const featured = featTrack ? (featTrack.style.background || '').includes('255, 138, 30') : false;
    return {
      id:       'pkg_' + Date.now() + '_' + idx,
      emoji:    emojiInp?.value  || '',
      name,
      serves:   servesInp?.value || '',
      price:    priceInp?.value  || '0',
      featured,
      lines,
    };
  });
}

function wireCateringSection() {
  const root = document.querySelector('[data-dash-section="catering"]');
  if (!root) return;

  const grid      = root.querySelector('[data-dc-tpl="291"]');
  const counterEl = root.querySelector('[data-dc-tpl="288"] .sc-interp');
  if (!grid) return;

  let pkgs = [];

  function updateCounter() {
    if (counterEl) {
      counterEl.textContent = pkgs.length + ' package' + (pkgs.length !== 1 ? 's' : '');
    }
  }

  /** Apply featured to exactly one package (radio single-select). */
  function applyFeatured(newFeaturedId) {
    pkgs.forEach(p => { p.featured = (p.id === newFeaturedId); });
    grid.querySelectorAll('[data-dc-tpl="293"]').forEach(card => {
      const isFeat = card.dataset.pkgId === newFeaturedId;
      card.style.borderColor = isFeat ? FEAT_ON_BORDER : FEAT_OFF_BORDER;
      const track = card.querySelector('[data-dc-tpl="297"]');
      const knob  = card.querySelector('[data-dc-tpl="298"]');
      if (track) track.style.background = isFeat ? FEAT_ON_BG : FEAT_OFF_BG;
      if (knob)  knob.style.left        = isFeat ? '20px' : '2px';
    });
    saveCateringPackages(pkgs);
  }

  /** Build one "What's included" line row and wire its delete/save. */
  function createLineRow(text, pkg) {
    const row = document.createElement('div');
    row.setAttribute('data-dc-tpl', '314');
    row.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const check = document.createElement('span');
    check.setAttribute('data-dc-tpl', '315');
    check.style.cssText = 'color: rgb(118, 192, 67); font-weight: 700; flex: 0 0 auto;';
    check.textContent = '✓';

    const inp = document.createElement('input');
    inp.setAttribute('data-dc-tpl', '316');
    inp.value       = text;
    inp.placeholder = 'Item description';
    inp.style.cssText = 'flex: 1 1 0%; min-width: 0px; border: 1px solid rgb(231, 223, 208); border-radius: 9px; padding: 8px 10px; font-size: 13.5px;';
    inp.addEventListener('input', () => {
      pkg.lines = Array.from(row.parentElement.querySelectorAll('[data-dc-tpl="316"]')).map(i => i.value);
      saveCateringPackages(pkgs);
    });

    const delBtn = document.createElement('div');
    delBtn.setAttribute('data-dc-tpl', '317');
    delBtn.style.cssText = 'width: 28px; height: 28px; flex: 0 0 auto; border-radius: 8px; background: rgb(246, 241, 234); color: rgb(154, 143, 126); display: flex; align-items: center; justify-content: center; font-size: 15px; cursor: pointer;';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => {
      const container = row.parentElement;
      row.remove();
      if (container) {
        pkg.lines = Array.from(container.querySelectorAll('[data-dc-tpl="316"]')).map(i => i.value);
      }
      saveCateringPackages(pkgs);
    });

    row.appendChild(check);
    row.appendChild(inp);
    row.appendChild(delBtn);
    return row;
  }

  /** Build a full package card element and wire all its controls. */
  function createCard(pkg) {
    const card = document.createElement('div');
    card.setAttribute('data-dc-tpl', '293');
    card.dataset.pkgId = pkg.id;
    card.style.cssText = 'background: rgb(255, 255, 255); border: 1.5px solid ' +
      (pkg.featured ? FEAT_ON_BORDER : FEAT_OFF_BORDER) +
      '; border-radius: 18px; padding: 22px; position: relative;';

    // ── Header: Featured toggle + Delete button ──────────────────────────────
    const header = document.createElement('div');
    header.setAttribute('data-dc-tpl', '294');
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px;';

    const featLeft = document.createElement('div');
    featLeft.setAttribute('data-dc-tpl', '295');
    featLeft.style.cssText = 'display: flex; align-items: center; gap: 10px;';

    const featLabel = document.createElement('span');
    featLabel.setAttribute('data-dc-tpl', '296');
    featLabel.style.cssText = 'font-weight: 700; font-size: 13px; color: rgb(154, 143, 126);';
    featLabel.textContent = 'Featured';

    const featTrack = document.createElement('div');
    featTrack.setAttribute('data-dc-tpl', '297');
    featTrack.style.cssText = 'width: 42px; height: 24px; border-radius: 999px; position: relative; cursor: pointer;';
    featTrack.style.background = pkg.featured ? FEAT_ON_BG : FEAT_OFF_BG;

    const featKnob = document.createElement('div');
    featKnob.setAttribute('data-dc-tpl', '298');
    featKnob.style.cssText = 'position: absolute; top: 2px; width: 20px; height: 20px; border-radius: 50%; background: rgb(255, 255, 255); box-shadow: rgba(0, 0, 0, 0.25) 0px 1px 2px;';
    featKnob.style.left = pkg.featured ? '20px' : '2px';
    featTrack.appendChild(featKnob);
    featTrack.addEventListener('click', () => applyFeatured(pkg.id));

    featLeft.appendChild(featLabel);
    featLeft.appendChild(featTrack);

    const delPkgBtn = document.createElement('div');
    delPkgBtn.setAttribute('data-dc-tpl', '299');
    delPkgBtn.style.cssText = 'width: 32px; height: 32px; flex: 0 0 auto; border-radius: 9px; background: rgb(250, 243, 243); color: rgb(226, 59, 59); display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer;';
    delPkgBtn.textContent = '×';
    delPkgBtn.addEventListener('click', () => {
      const idx = pkgs.findIndex(p => p.id === pkg.id);
      if (idx !== -1) pkgs.splice(idx, 1);
      card.remove();
      saveCateringPackages(pkgs);
      updateCounter();
    });

    header.appendChild(featLeft);
    header.appendChild(delPkgBtn);
    card.appendChild(header);

    // ── Emoji + Name row ─────────────────────────────────────────────────────
    const nameRow = document.createElement('div');
    nameRow.setAttribute('data-dc-tpl', '300');
    nameRow.style.cssText = 'display: flex; gap: 12px; margin-bottom: 12px;';

    const imgSlot = document.createElement('image-slot');
    imgSlot.setAttribute('data-dc-tpl', '301');
    imgSlot.setAttribute('shape', 'rounded');
    imgSlot.setAttribute('radius', '12');
    imgSlot.setAttribute('placeholder', 'Photo');
    imgSlot.style.cssText = 'width: 72px; height: 72px; flex: 0 0 auto; border: 1px solid rgb(231, 223, 208); border-radius: 12px;';

    const emojiInp = document.createElement('input');
    emojiInp.setAttribute('data-dc-tpl', '302');
    emojiInp.value     = pkg.emoji;
    emojiInp.style.cssText = 'width: 54px; text-align: center; border: 1px solid rgb(231, 223, 208); border-radius: 10px; padding: 10px 4px; font-size: 20px;';
    emojiInp.addEventListener('input', () => { pkg.emoji = emojiInp.value; saveCateringPackages(pkgs); });

    const nameInp = document.createElement('input');
    nameInp.setAttribute('data-dc-tpl', '303');
    nameInp.value       = pkg.name;
    nameInp.placeholder = 'Package name';
    nameInp.style.cssText = 'flex: 1 1 0%; min-width: 0px; border: 1px solid rgb(231, 223, 208); border-radius: 10px; padding: 10px 12px; font-size: 15.5px; font-weight: 700;';
    nameInp.addEventListener('input', () => { pkg.name = nameInp.value; saveCateringPackages(pkgs); });

    nameRow.appendChild(imgSlot);
    nameRow.appendChild(emojiInp);
    nameRow.appendChild(nameInp);
    card.appendChild(nameRow);

    // ── Serves + Price row ───────────────────────────────────────────────────
    const spRow = document.createElement('div');
    spRow.setAttribute('data-dc-tpl', '304');
    spRow.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';

    const servesCol = document.createElement('div');
    servesCol.setAttribute('data-dc-tpl', '305');
    servesCol.style.cssText = 'flex: 1 1 0%;';
    const servesLabel = document.createElement('div');
    servesLabel.setAttribute('data-dc-tpl', '306');
    servesLabel.style.cssText = 'font-size: 12px; font-weight: 700; color: rgb(154, 143, 126); margin-bottom: 5px;';
    servesLabel.textContent = 'Serves';
    const servesInp = document.createElement('input');
    servesInp.setAttribute('data-dc-tpl', '307');
    servesInp.value       = pkg.serves;
    servesInp.placeholder = 'Serves ~10';
    servesInp.style.cssText = 'width: 100%; border: 1px solid rgb(231, 223, 208); border-radius: 10px; padding: 9px 11px; font-size: 14px;';
    servesInp.addEventListener('input', () => { pkg.serves = servesInp.value; saveCateringPackages(pkgs); });
    servesCol.appendChild(servesLabel);
    servesCol.appendChild(servesInp);

    const priceCol = document.createElement('div');
    priceCol.setAttribute('data-dc-tpl', '308');
    priceCol.style.cssText = 'width: 120px;';
    const priceLabel = document.createElement('div');
    priceLabel.setAttribute('data-dc-tpl', '309');
    priceLabel.style.cssText = 'font-size: 12px; font-weight: 700; color: rgb(154, 143, 126); margin-bottom: 5px;';
    priceLabel.textContent = 'Price (MAD)';
    const priceInp = document.createElement('input');
    priceInp.setAttribute('data-dc-tpl', '310');
    priceInp.value = pkg.price;
    priceInp.setAttribute('inputmode', 'numeric');
    priceInp.style.cssText = 'width: 100%; border: 1px solid rgb(231, 223, 208); border-radius: 10px; padding: 9px 11px; font-size: 15px; font-weight: 700;';
    priceInp.addEventListener('input', () => { pkg.price = priceInp.value; saveCateringPackages(pkgs); });
    priceCol.appendChild(priceLabel);
    priceCol.appendChild(priceInp);

    spRow.appendChild(servesCol);
    spRow.appendChild(priceCol);
    card.appendChild(spRow);

    // ── What's included ──────────────────────────────────────────────────────
    const inclLabel = document.createElement('div');
    inclLabel.setAttribute('data-dc-tpl', '311');
    inclLabel.style.cssText = "font-size: 12px; font-weight: 700; color: rgb(154, 143, 126); margin: 14px 0px 7px;";
    inclLabel.textContent = "What's included";
    card.appendChild(inclLabel);

    const linesContainer = document.createElement('div');
    linesContainer.setAttribute('data-dc-tpl', '312');
    linesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 7px;';

    pkg.lines.forEach(line => linesContainer.appendChild(createLineRow(line, pkg)));

    const addLineBtn = document.createElement('div');
    addLineBtn.setAttribute('data-dc-tpl', '318');
    addLineBtn.style.cssText = 'cursor: pointer; align-self: flex-start; font-size: 13.5px; font-weight: 700; color: rgb(255, 138, 30); padding: 6px 2px;';
    addLineBtn.textContent = '+ Add line';
    addLineBtn.addEventListener('click', () => {
      const newRow = createLineRow('', pkg);
      linesContainer.insertBefore(newRow, addLineBtn);
      const newInp = newRow.querySelector('[data-dc-tpl="316"]');
      if (newInp) newInp.focus();
      pkg.lines = Array.from(linesContainer.querySelectorAll('[data-dc-tpl="316"]')).map(i => i.value);
      saveCateringPackages(pkgs);
    });
    linesContainer.appendChild(addLineBtn);
    card.appendChild(linesContainer);

    return card;
  }

  /** Clear the grid and re-render all packages from pkgs array. */
  function renderPackages() {
    grid.querySelectorAll('[data-dc-tpl="293"]').forEach(c => c.remove());
    pkgs.forEach(pkg => grid.appendChild(createCard(pkg)));
    updateCounter();
  }

  // Seed or restore packages
  const saved = loadCateringPackages();
  if (saved && saved.length > 0) {
    pkgs = saved;
  } else {
    pkgs = seedCateringFromMarkup(root);
    saveCateringPackages(pkgs);
  }
  renderPackages();

  // Wire "Add package" button
  const addPkgBtn = root.querySelector('[data-dc-tpl="290"]');
  if (addPkgBtn) {
    addPkgBtn.addEventListener('click', () => {
      const newPkg = {
        id:       'pkg_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        emoji:    '🍽️',
        name:     '',
        serves:   '',
        price:    '0',
        featured: false,
        lines:    [],
      };
      pkgs.push(newPkg);
      const card = createCard(newPkg);
      grid.appendChild(card);
      updateCounter();
      saveCateringPackages(pkgs);
      const nameInp = card.querySelector('[data-dc-tpl="303"]');
      if (nameInp) nameInp.focus();
    });
  }
}

// ── QR codes section ───────────────────────────────────────────────────────────
function wireQrSection() {
  const root = document.querySelector('[data-dash-section="qr-codes"]');
  if (!root) return;

  const menuUrl = window.location.origin + '/menu';

  // Replace each fake QR grid (data-dc-tpl="226") with real QR SVG
  root.querySelectorAll('[data-dc-tpl="226"]').forEach(gridEl => {
    try {
      const svg = generateQrSvg(menuUrl, { fg: '#000', bg: '#fff', quiet: 4 });
      gridEl.style.cssText = 'width: 100%; height: 100%; display: block;';
      gridEl.innerHTML = svg;
      const svgEl = gridEl.querySelector('svg');
      if (svgEl) {
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        svgEl.style.display = 'block';
      }
    } catch (e) {
      // leave fake grid as-is on error
    }
  });

  // Wire each Download PNG button (data-dc-tpl="239")
  root.querySelectorAll('[data-dc-tpl="239"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const dataUrl = await generateQrPng(menuUrl, 300);
        if (!dataUrl) return;
        const a = document.createElement('a');
        a.download = 'marmara-qr.png';
        a.href = dataUrl;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Saved');
      } catch (e) {
        showToast('Download failed');
      }
    });
  });
}

// ── Dashboard section extras ───────────────────────────────────────────────────
function wireDashboardSection(P, rows) {
  const root = document.querySelector('[data-dash-section="dashboard"]');
  if (!root) return;
  // "View all →" → switch to Orders
  root.querySelectorAll('div').forEach(el => {
    if (!el.textContent.trim().startsWith('View all')) return;
    if (!(el.getAttribute('style') || '').includes('cursor: pointer')) return;
    el.addEventListener('click', () => show('orders', P, rows));
  });
  // "Pause ordering" / "Resume ordering"
  root.querySelectorAll('div').forEach(el => {
    if (!/Pause ordering|Resume ordering/.test(el.textContent)) return;
    if (!(el.getAttribute('style') || '').includes('cursor: pointer')) return;
    el.addEventListener('click', () => applyOpenState(!getOpenState()));
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const P    = panels();
  const rows = navRows();
  Object.entries(rows).forEach(([slug, row]) => {
    row.addEventListener('click', () => show(slug, P, rows));
  });
  let initial = 'dashboard';
  try { initial = localStorage.getItem('marmara_dash_section') || 'dashboard'; } catch(e) {}
  if (!P[initial]) initial = 'dashboard';
  show(initial, P, rows);

  wireToggles();
  wireOrderStages();
  wireOrderPills();
  wireWebsiteContentPreview();
  wireBusinessInfoPreview();
  wireMenuSection();
  wireCateringSection();
  wireQrSection();
  wireDashboardSection(P, rows);

  persist(document.querySelector('#dc-root') || document.body);
});
