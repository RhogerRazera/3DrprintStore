export const MAX_CART_QUANTITY = 99;
export const MAX_CART_LINES = 50;

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

export function normalizeCartItems(value) {
  if (!Array.isArray(value)) return [];
  const normalized = [];
  const byId = new Map();

  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const { id, title, slug, category } = raw;
    if (![id, title, slug, category].every((field) => typeof field === "string" && field.trim().length > 0)) continue;
    if ([id, title, slug, category].some((field) => field.length > 300)) continue;

    const rawQuantity = Number(raw.quantity);
    if (!Number.isFinite(rawQuantity) || rawQuantity < 1) continue;
    const quantity = Math.min(MAX_CART_QUANTITY, Math.floor(rawQuantity));
    const item = {
      id: id.trim(),
      title: title.trim(),
      slug: slug.trim(),
      category: category.trim(),
      image: typeof raw.image === "string" ? raw.image.slice(0, 2048) : "",
      quantity,
      ...(typeof raw.price === "number" && Number.isFinite(raw.price) && raw.price >= 0 && raw.price <= 1000000000 ? { price: raw.price } : {}),
    };

    const existingIndex = byId.get(item.id);
    if (existingIndex !== undefined) {
      const existing = normalized[existingIndex];
      existing.quantity = Math.min(MAX_CART_QUANTITY, existing.quantity + quantity);
    } else if (normalized.length < MAX_CART_LINES) {
      byId.set(item.id, normalized.length);
      normalized.push(item);
    }
  }
  return normalized;
}

export function addCartItem(items, product) {
  if (!isRecord(product)) return normalizeCartItems(items);
  const current = normalizeCartItems(items);
  const incoming = normalizeCartItems([{ ...product, quantity: 1 }])[0];
  if (!incoming) return current;

  const index = current.findIndex((item) => item.id === incoming.id);
  if (index < 0) return current.length < MAX_CART_LINES ? [...current, incoming] : current;
  return current.map((item, itemIndex) =>
    itemIndex === index ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, item.quantity + 1) } : item
  );
}

export function updateCartItem(items, id, delta) {
  const current = normalizeCartItems(items);
  if (typeof id !== "string" || !Number.isInteger(delta) || delta === 0) return current;
  return current
    .map((item) => item.id === id
      ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, item.quantity + delta) }
      : item)
    .filter((item) => item.quantity > 0);
}

export function cartTotal(items) {
  return normalizeCartItems(items).reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
}

export function createWhatsAppMessage(items) {
  const safeItems = normalizeCartItems(items);
  const formatPrice = (value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const lines = safeItems.map((item) =>
    "- " + item.title + " (" + item.category + ") — " + item.quantity + "x" +
    (item.price ? " " + formatPrice(item.price) : " (preço a combinar)")
  );
  return ["Olá! Quero fazer este pedido:", ...lines, "", "Total informado: " + formatPrice(cartTotal(safeItems)), "Poderia confirmar disponibilidade e frete?"].join("\n");
}
