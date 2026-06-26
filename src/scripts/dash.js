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
    .filter(isToggleTrack);

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

// ── Menu section ───────────────────────────────────────────────────────────────
function wireMenuSection() {
  const root = document.querySelector('[data-dash-section="menu"]');
  if (!root) return;
  // Edit buttons
  root.querySelectorAll('div').forEach(el => {
    if (el.textContent.trim() !== 'Edit') return;
    if (!(el.getAttribute('style') || '').includes('cursor: pointer')) return;
    el.addEventListener('click', () => {
      const row = el.closest('[style*="border-top"]');
      if (row) {
        row.style.outline      = '2.5px solid rgb(255, 138, 30)';
        row.style.borderRadius = '12px';
        setTimeout(() => { row.style.outline = ''; row.style.borderRadius = ''; }, 2000);
      }
      showToast('Edit mode — update plate details above');
    });
  });
  // Image slots
  root.querySelectorAll('image-slot').forEach(slot => {
    slot.style.cursor = 'pointer';
    slot.addEventListener('click', () => showToast('Image upload is part of go-live'));
  });
  // Add new plate
  root.querySelectorAll('div').forEach(el => {
    if (!el.textContent.trim().includes('Add new plate')) return;
    if (!(el.getAttribute('style') || '').includes('cursor: pointer')) return;
    el.addEventListener('click', () => showToast('New plate form — coming at go-live'));
  });
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
