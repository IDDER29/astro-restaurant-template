const digits = (phone) => String(phone).replace(/[^0-9]/g, '');

export function buildOrderUrl(cart, { phone, intro = 'Hi Marmara! I\'d like to order:' } = {}) {
  const lines = cart.map((i) => `${i.qty}x ${i.name}`);
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const text = `${intro}\n${lines.join('\n')}\n\nTotal: ${total} MAD`;
  return `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`;
}

export function buildContactUrl(phone, message) {
  return `https://wa.me/${digits(phone)}?text=${encodeURIComponent(message)}`;
}
