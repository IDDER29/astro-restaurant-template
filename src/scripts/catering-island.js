import { buildContactUrl } from './whatsapp.js';
const form = document.getElementById('quote-form');
const phone = form.dataset.whatsapp;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(form);
  const msg = `Catering request — Marmara\nName: ${d.get('name')}\nEvent: ${d.get('type')}\nPeople: ${d.get('people')}\nDate: ${d.get('date')} ${d.get('time')}\nNotes: ${d.get('notes') || '—'}`;
  window.open(buildContactUrl(phone, msg), '_blank');
});
const people = form.querySelector('[name=people]');
const est = document.getElementById('estimate');
const PERHEAD = 45;
const update = () => { est.textContent = `Rough estimate: ${(Number(people.value) || 0) * PERHEAD} MAD`; };
people.addEventListener('input', update); update();
