export function addItem(cart, item) {
  const found = cart.find((i) => i.id === item.id);
  if (found) return cart.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
  return [...cart, { id: item.id, name: item.name, price: item.price, qty: 1 }];
}

export function removeItem(cart, id) {
  return cart
    .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
    .filter((i) => i.qty > 0);
}

export const cartTotal = (cart) => cart.reduce((s, i) => s + i.qty * i.price, 0);
export const cartCount = (cart) => cart.reduce((s, i) => s + i.qty, 0);
