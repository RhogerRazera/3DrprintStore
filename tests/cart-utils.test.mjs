import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_CART_QUANTITY,
  addCartItem,
  cartTotal,
  createWhatsAppMessage,
  normalizeCartItems,
  updateCartItem,
} from "../lib/cart-utils.mjs";

const product = { id: "item-1", title: "Chaveiro", slug: "chaveiro", category: "Brindes", image: "https://example.com/item.jpg", price: 12.5 };

test("normalizes persisted cart data and drops invalid entries", () => {
  const result = normalizeCartItems([
    { ...product, quantity: 2 },
    { ...product, id: "bad", quantity: "NaN" },
    null,
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].quantity, 2);
  assert.equal(normalizeCartItems("broken").length, 0);
});

test("combines duplicate products and caps quantities", () => {
  const result = normalizeCartItems([
    { ...product, quantity: 80 },
    { ...product, quantity: 50 },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].quantity, MAX_CART_QUANTITY);
});

test("adds and adjusts items without going below zero or over the cap", () => {
  const added = addCartItem([], product);
  assert.equal(added[0].quantity, 1);
  assert.equal(addCartItem(added, product)[0].quantity, 2);
  assert.equal(updateCartItem(added, "item-1", -1).length, 0);
  assert.equal(updateCartItem([{ ...product, quantity: 99 }], "item-1", 1)[0].quantity, 99);
});

test("limits the cart to a manageable number of distinct products", () => {
  const entries = Array.from({ length: 60 }, (_, index) => ({ ...product, id: "item-" + index, quantity: 1 }));
  const normalized = normalizeCartItems(entries);
  assert.equal(normalized.length, 50);
  assert.equal(addCartItem(normalized, { ...product, id: "overflow" }).length, 50);
});

test("calculates totals and builds a WhatsApp order message", () => {
  const items = [{ ...product, quantity: 2 }];
  assert.equal(cartTotal(items), 25);
  const message = createWhatsAppMessage(items);
  assert.match(message, /Chaveiro/);
  assert.match(message, /Total informado/);
});

test("keeps product variation identity, caps stock and includes order reference", () => {
  const variant = { ...product, id: "item-1::azul", productId: "item-1", variantId: "azul", variantName: "Azul", variantHex: "#0000FF", stock: 2, quantity: 5 };
  const items = normalizeCartItems([variant]);
  assert.equal(items[0].productId, "item-1");
  assert.equal(items[0].variantId, "azul");
  assert.equal(items[0].quantity, 2);
  assert.equal(updateCartItem(items, variant.id, 1)[0].quantity, 2);
  assert.match(createWhatsAppMessage(items, "order-123"), /Referência do pedido: order-123/);
  assert.match(createWhatsAppMessage(items, "order-123"), /Azul/);
});

test("does not combine duplicate persisted lines above the stock limit", () => {
  const items = normalizeCartItems([
    { ...product, id: "item-1::azul", productId: "item-1", variantId: "azul", stock: 3, quantity: 2 },
    { ...product, id: "item-1::azul", productId: "item-1", variantId: "azul", stock: 3, quantity: 2 },
  ]);
  assert.equal(items[0].quantity, 3);
});

