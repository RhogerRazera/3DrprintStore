import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/products.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const productsModule = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const { calculateKitStock, calculateKitValue, defaultProductColors, normalizeProduct } = productsModule;

const component = (productId, quantity, variantId) => ({ productId, productTitle: productId, quantity, ...(variantId ? { variantId } : {}) });

test("normalizes existing color names into usable product variations", () => {
  const product = normalizeProduct("legacy", { title: "Peça antiga", colors: ["Preto", "Dourado"] });
  assert.deepEqual(product.variants.map(({ colorId, hex }) => ({ colorId, hex })), [
    { colorId: "preto", hex: "#000000" },
    { colorId: "dourado", hex: "#808080" },
  ]);
  assert.equal(defaultProductColors.length, 10);
});

test("calculates available kits from the limiting component and variation", () => {
  const products = [
    { id: "a", published: true, stock: 7 },
    { id: "b", published: true, variants: [{ colorId: "azul", available: true, stock: 5 }] },
  ];
  assert.equal(calculateKitStock([component("a", 2), component("b", 2, "azul")], products), 2);
  assert.equal(calculateKitStock([component("a", 2), component("missing", 1)], products), 0);
});

test("keeps made-to-order kits untracked and totals variant price adjustments", () => {
  const components = [component("a", 2), component("b", 1, "gold")];
  const products = [
    { id: "a", published: true, price: 10 },
    { id: "b", published: true, price: 20, variants: [{ colorId: "gold", available: true, priceAdjustment: 3 }] },
  ];
  assert.equal(calculateKitStock(components, products), null);
  assert.equal(calculateKitValue(components, products), 43);
});

