import { loadContent, saveContent, STORAGE_KEY } from './cms.js';

const defaults = {
  heroHeadline: document.getElementById('heroHeadline').value,
  aboutStory: document.getElementById('aboutStory').value,
  promoText: '',
  storeOpen: true,
};
const c = loadContent(STORAGE_KEY, defaults, localStorage);

const head = document.getElementById('heroHeadline');
const story = document.getElementById('aboutStory');
const promo = document.getElementById('promo-text');
const open = document.getElementById('store-open');
head.value = c.heroHeadline; story.value = c.aboutStory; promo.value = c.promoText; open.checked = c.storeOpen;

const pvHead = document.getElementById('pv-head');
const pvBody = document.getElementById('pv-body');
const sync = () => { pvHead.textContent = head.value; pvBody.textContent = story.value; };
head.addEventListener('input', sync); story.addEventListener('input', sync); sync();

document.getElementById('save').addEventListener('click', () => {
  saveContent(STORAGE_KEY, { heroHeadline: head.value, aboutStory: story.value, promoText: promo.value, storeOpen: open.checked }, localStorage);
  const s = document.getElementById('saved'); s.textContent = 'Saved ✓';
  setTimeout(() => (s.textContent = ''), 1500);
});
