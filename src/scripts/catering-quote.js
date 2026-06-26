import { buildContactUrl } from './whatsapp.js';

const PHONE = '212600000000';
const PER_HEAD = 45; // MAD estimate per person

// ─── find the quote form container ───────────────────────────────────────────
// The "Send my request on WhatsApp" <a> is our anchor.
const sendLink = Array.from(document.querySelectorAll('a')).find((el) =>
  el.textContent.includes('Send my request on WhatsApp')
);

function init() {
// The form container is the nearest ancestor that holds the inputs.
// It's the white card with border-radius: 26px wrapping the form fields.
const formContainer =
  sendLink.closest('[style*="border-radius: 26px"]') ||
  sendLink.closest('[style*="border-radius:26px"]') ||
  sendLink.parentElement;

// ─── locate fields ────────────────────────────────────────────────────────────
const nameInput = formContainer.querySelector('input[placeholder]');           // "Your name"
const eventSelect = formContainer.querySelector('select');                      // "Event type"
const rangeInput = formContainer.querySelector('input[type="range"]');          // "How many people?"
const dateInput = formContainer.querySelector('input[type="date"]');
const timeInput = formContainer.querySelector('input[type="time"]');
const notesArea = formContainer.querySelector('textarea');

// People-count display: the div with font-size 24px next to the range
const peopleDisplay = rangeInput
  ? rangeInput.closest('[style*="display: flex"]')?.querySelector(
      '[style*="font-size: 24px"]'
    )
  : null;

// Estimate display: the <strong> showing "~800 MAD"
const estimateEl = formContainer.querySelector('strong [class="sc-interp"]')
  || formContainer.querySelector('strong span');

// ─── food-type chips ──────────────────────────────────────────────────────────
// Chips are cursor:pointer divs with font-size 14px inside the "What do you want?" section.
// Selected chips have orange background; unselected have white background.
const chipWrappers = Array.from(
  formContainer.querySelectorAll('[style*="cursor: pointer"][style*="font-size: 14px"][style*="border-radius: 999px"]')
);

// Track selected state in a Set (start from initial HTML state)
const selectedChips = new Set(
  chipWrappers.filter((el) => el.style.background.includes('244, 230'))
);

// Allow toggling chips
const CHIP_ON = {
  background: 'rgb(255, 244, 230)',
  border: '1.5px solid rgb(255, 138, 30)',
  color: 'rgb(24, 20, 16)',
};
const CHIP_OFF = {
  background: 'rgb(255, 255, 255)',
  border: '1.5px solid rgb(231, 223, 208)',
  color: 'rgb(107, 99, 88)',
};

function applyChipStyle(chip, on) {
  const s = on ? CHIP_ON : CHIP_OFF;
  Object.assign(chip.style, s);
}

for (const chip of chipWrappers) {
  chip.addEventListener('click', () => {
    if (selectedChips.has(chip)) {
      selectedChips.delete(chip);
      applyChipStyle(chip, false);
    } else {
      selectedChips.add(chip);
      applyChipStyle(chip, true);
    }
  });
}

// ─── live estimate update ─────────────────────────────────────────────────────
function updateEstimate() {
  if (!rangeInput) return;
  const people = Number(rangeInput.value) || 0;
  if (peopleDisplay) {
    const span = peopleDisplay.querySelector('.sc-interp') || peopleDisplay.querySelector('span');
    if (span) span.textContent = `~${people}`;
  }
  if (estimateEl) {
    estimateEl.textContent = `~${people * PER_HEAD} MAD`;
  }
}

if (rangeInput) {
  rangeInput.addEventListener('input', updateEstimate);
  updateEstimate(); // sync on load
}

// ─── intercept "Send my request on WhatsApp" click ───────────────────────────
sendLink.addEventListener('click', (e) => {
  e.preventDefault();

  const name = nameInput?.value.trim() || '—';
  const eventType = eventSelect?.value || '—';
  const people = rangeInput?.value || '20';
  const date = dateInput?.value || '—';
  const time = timeInput?.value || '—';
  const notes = notesArea?.value.trim() || '';

  const wants =
    chipWrappers
      .filter((c) => selectedChips.has(c))
      .map((c) => (c.querySelector('.sc-interp') || c.querySelector('span') || c).textContent.trim())
      .join(', ') || '—';

  const estimate = `~${(Number(people) || 0) * PER_HEAD} MAD`;

  const lines = [
    `Hi Marmara! 👋 I'd like a catering quote:`,
    `• Name: ${name}`,
    `• Event: ${eventType}`,
    `• People: ~${people}`,
    `• Wants: ${wants}`,
    `• Date: ${date}${time && time !== '—' ? ` at ${time}` : ''}`,
    notes ? `• Notes: ${notes}` : null,
    ``,
    `(Rough estimate ${estimate} — please confirm.)`,
  ]
    .filter((l) => l !== null)
    .join('\n');

  window.open(buildContactUrl(PHONE, lines), '_blank');
});
}

// Only run on the catering page (where the send link exists).
if (sendLink) init();
