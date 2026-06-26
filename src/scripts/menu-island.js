import { addItem, removeItem, cartTotal, cartCount } from './cart.js';
import { buildOrderUrl } from './whatsapp.js';

let cart = [];
const bar = document.getElementById('cart-bar');
const countEl = document.getElementById('cart-count');
const totalEl = document.getElementById('cart-total');

function render() {
  const n = cartCount(cart);
  bar.hidden = n === 0;
  countEl.textContent = `${n} item${n === 1 ? '' : 's'}`;
  totalEl.textContent = `${cartTotal(cart)} MAD`;
}
document.querySelectorAll('.add').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.card');
    cart = addItem(cart, { id: card.dataset.id, name: card.dataset.name, price: Number(card.dataset.price) });
    render();
  });
});
document.getElementById('cart-clear').addEventListener('click', () => { cart = []; render(); });
document.getElementById('cart-send').addEventListener('click', () => {
  if (!cart.length) return;
  window.open(buildOrderUrl(cart, { phone: bar.dataset.whatsapp }), '_blank');
});
render();
