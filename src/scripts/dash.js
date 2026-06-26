// Owner dashboard interactivity (demo): sidebar switching, toggles, order pills,
// live preview, and button feedback. All state persisted to localStorage.

const SECTIONS = ['dashboard','orders','menu','catering','website-content','hours','business-info','qr-codes'];
const LABELS = {
  dashboard: 'Dashboard', orders: 'Orders', menu: 'Menu', catering: 'Catering',
  'website-content': 'Website content', hours: 'Hours', 'business-info': 'Business info', 'qr-codes': 'QR codes',
};

const STATUS_CYCLE  = ['New', 'Preparing', 'Ready', 'Picked up'];
const STATUS_COLORS = {
  'New':        { bg: 'rgb(255, 231, 226)', color: 'rgb(210, 69, 30)' },
  'Preparing':  { bg: 'rgb(255, 241, 214)', color: 'rgb(154, 106, 18)' },
  'Ready':      { bg: 'rgb(226, 242, 230)', color: 'rgb(46, 125, 70)' },
  'Picked up':  { bg: 'rgb(236, 233, 226)', color: 'rgb(122, 113, 101)' },
};
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
    if (el.closest('[data-dash-section="menu"]')) return; // menu manages its own fields
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
    .filter(el => !el.closest('[data-dash-section="menu"]')); // menu manages its own toggles

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

// ── Order status pills ─────────────────────────────────────────────────────────
function getPillText(pill) {
  return (pill.querySelector('.sc-interp') || pill).textContent.trim();
}
function applyPillStatus(pill, status) {
  const c = STATUS_COLORS[status]; if (!c) return;
  pill.style.background = c.bg;
  pill.style.color = c.color;
  const sc = pill.querySelector('.sc-interp');
  if (sc) sc.textContent = status; else pill.textContent = status;
}
function wireOrderPills() {
  const pills = Array.from(document.querySelectorAll('[data-dash-section] div')).filter(el => {
    const s = el.getAttribute('style') || '';
    return s.includes('border-radius: 999px') && s.includes('cursor: pointer') &&
      STATUS_CYCLE.includes(getPillText(el));
  });
  pills.forEach((pill, i) => {
    const key = 'marmara_dash_pill_' + i;
    try {
      const saved = localStorage.getItem(key);
      if (saved && STATUS_CYCLE.includes(saved)) applyPillStatus(pill, saved);
    } catch(e) {}
    pill.addEventListener('click', () => {
      const cur  = getPillText(pill);
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
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
function wireWebsiteContentPreview() {
  const root = document.querySelector('[data-dash-section="website-content"]');
  if (!root) return;
  const links = [
    ['250','260'], ['253','262'], ['256','263'],
  ];
  links.forEach(([inTpl, prvTpl]) => {
    const inp = root.querySelector('[data-dc-tpl="' + inTpl + '"]');
    const prv = root.querySelector('[data-dc-tpl="' + prvTpl + '"]');
    if (!inp || !prv) return;
    const target = prv.querySelector('.sc-interp') || prv;
    inp.addEventListener('input', () => { target.textContent = inp.value; flashSaved(root); });
  });
  // Refresh previews after persist() has restored values (runs async after sync init)
  setTimeout(() => {
    links.forEach(([inTpl]) => {
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

// ── Catering section ───────────────────────────────────────────────────────────
function wireCateringSection() {
  const root = document.querySelector('[data-dash-section="catering"]');
  if (!root) return;
  root.querySelectorAll('div').forEach(el => {
    const txt = el.textContent.trim();
    const s   = el.getAttribute('style') || '';
    if (!s.includes('cursor: pointer')) return;
    if (txt.includes('Add package'))
      el.addEventListener('click', () => showToast('Package added — fill in the details'));
    else if (txt.includes('Add line'))
      el.addEventListener('click', () => showToast('Line added — type to fill it in'));
  });
  // × delete-line buttons
  root.querySelectorAll('[data-dc-tpl="317"]').forEach(btn => {
    btn.addEventListener('click', () => showToast('Line removed'));
  });
}

// ── QR codes section ───────────────────────────────────────────────────────────
function wireQrSection() {
  const root = document.querySelector('[data-dash-section="qr-codes"]');
  if (!root) return;
  root.querySelectorAll('div').forEach(el => {
    if (!el.textContent.includes('Download PNG')) return;
    if (!(el.getAttribute('style') || '').includes('cursor: pointer')) return;
    el.addEventListener('click', () => {
      showToast('Preparing download…');
      setTimeout(() => window.print(), 400);
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
  wireOrderPills();
  wireWebsiteContentPreview();
  wireBusinessInfoPreview();
  wireMenuSection();
  wireCateringSection();
  wireQrSection();
  wireDashboardSection(P, rows);

  persist(document.querySelector('#dc-root') || document.body);
});
