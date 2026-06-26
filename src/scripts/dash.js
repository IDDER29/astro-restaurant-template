// Owner dashboard interactivity (demo): sidebar section switching + local persistence.
// Operates on the exact captured markup; no original handlers survived the static capture.

const SECTIONS = ['dashboard','orders','menu','catering','website-content','hours','business-info','qr-codes'];
const LABELS = {
  'dashboard': 'Dashboard', 'orders': 'Orders', 'menu': 'Menu', 'catering': 'Catering',
  'website-content': 'Website content', 'hours': 'Hours', 'business-info': 'Business info', 'qr-codes': 'QR codes',
};

function panels() {
  const map = {};
  document.querySelectorAll('[data-dash-section]').forEach((el) => { map[el.getAttribute('data-dash-section')] = el; });
  return map;
}

// Find sidebar nav rows by matching their text to a section label.
function navRows() {
  const rows = {};
  const candidates = Array.from(document.querySelectorAll('div')).filter((d) => {
    const s = d.getAttribute('style') || '';
    return s.includes('padding: 11px 12px') && s.includes('cursor: pointer') && s.includes('font-size: 15px');
  });
  for (const slug of SECTIONS) {
    const label = LABELS[slug];
    // Match by label substring (not endsWith): some rows have a trailing badge,
    // e.g. "Orders" carries a "4" count, so its text is "Orders4". The 8 labels
    // are mutually distinct, and the sidebar appears first in the DOM, so the
    // first match is always the correct sidebar nav row.
    const row = candidates.find((d) => d.textContent.replace(/\s+/g, ' ').includes(label));
    if (row) rows[slug] = row;
  }
  return rows;
}

function show(slug, P, rows) {
  SECTIONS.forEach((s) => { if (P[s]) P[s].style.display = s === slug ? '' : 'none'; });
  Object.entries(rows).forEach(([s, row]) => {
    const active = s === slug;
    row.style.background = active ? 'rgb(255, 138, 30)' : 'transparent';
    row.style.color = active ? 'rgb(255,255,255)' : '';
    row.style.cursor = 'pointer';
  });
  try { localStorage.setItem('marmara_dash_section', slug); } catch (e) {}
}

// Generic persistence: every input/textarea/select + checkbox in the dashboard
// remembers its value across reloads, demonstrating "editing saves".
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
    } catch (e) {}
    const save = () => {
      try { localStorage.setItem(key, el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value); } catch (e) {}
    };
    el.addEventListener('input', save);
    el.addEventListener('change', save);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const P = panels();
  const rows = navRows();
  Object.entries(rows).forEach(([slug, row]) => {
    row.addEventListener('click', () => show(slug, P, rows));
  });
  let initial = 'dashboard';
  try { initial = localStorage.getItem('marmara_dash_section') || 'dashboard'; } catch (e) {}
  if (!P[initial]) initial = 'dashboard';
  show(initial, P, rows);
  persist(document.querySelector('[data-dash-root]') || document.body);
});
