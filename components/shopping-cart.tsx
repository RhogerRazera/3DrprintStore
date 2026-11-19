"use client";
/* eslint-disable @next/next/no-img-element -- Product photos come from administrator-entered URLs, so their hosts are not fixed. */

import { useCallback, useEffect, useRef, useState } from "react";
import { ShoppingBag, X, Minus, Plus, Trash2 } from "lucide-react";
import { normalizeProduct, type Product } from "@/lib/products";
import type { CartItem as StoredCartItem } from "@/lib/cart-utils.mjs";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  addCartItem,
  MAX_CART_LINES,
  cartTotal,
  createWhatsAppMessage,
  isCartPriceCurrent,
  normalizeCartItems,
  updateCartItem,
} from "@/lib/cart-utils.mjs";

type CartItem = StoredCartItem;
const KEY = "3drprint-cart-v1";
const formatPrice = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ShoppingCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [cartBumped, setCartBumped] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "checking" | "sent">("idle");
  const checkoutLock = useRef(false);
  const itemsRef = useRef<CartItem[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const noticeTimer = useRef<number | null>(null);

  const commitItems = useCallback((nextItems: CartItem[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
    try {
      localStorage.setItem(KEY, JSON.stringify(nextItems));
      return true;
    } catch {
      setCartNotice("O carrinho ficará disponível somente enquanto esta página estiver aberta.");
      return false;
    }
  }, []);

  useEffect(() => {
    try {
      const stored = normalizeCartItems(JSON.parse(localStorage.getItem(KEY) || "[]"));
      itemsRef.current = stored;
      setItems(stored);
    } catch {
      itemsRef.current = [];
      setItems([]);
    }

    const reload = (event: StorageEvent) => {
      if (event.key !== KEY && event.key !== null) return;
      try {
        const parsed = event.newValue ? JSON.parse(event.newValue) : [];
        const next = normalizeCartItems(parsed);
        itemsRef.current = next;
        setItems(next);
        checkoutLock.current = false;
        setCheckoutStatus("idle");
      } catch {
        itemsRef.current = [];
        setItems([]);
      }
    };
    const add = (event: Event) => {
      if (checkoutLock.current) return;
      const product = (event as CustomEvent<Product & { productId?: string; variantId?: string; variantName?: string; variantHex?: string; stock?: number }>).detail;
      if (!product) return;
      const current = itemsRef.current.find((item) => item.id === product.id);
      if (product.stock === 0 || (current && product.stock !== undefined && current.quantity >= product.stock)) {
        setCartNotice(product.stock === 0 ? `${product.title} está sem estoque.` : `Você já atingiu o estoque disponível de ${product.title}.`);
        return;
      }
      const isNewLine = !itemsRef.current.some((item) => item.id === product.id);
      const limitReached = isNewLine && itemsRef.current.length >= MAX_CART_LINES;
      const next = addCartItem(itemsRef.current, product);
      const persisted = commitItems(next);
      setCheckoutStatus("idle");
      setOpen(true);
      setCartBumped(true);
      setCartNotice(limitReached
        ? "O carrinho atingiu o limite de produtos."
        : persisted ? product.title + " adicionado ao carrinho" : product.title + " adicionado, mas não foi salvo neste navegador");
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => { setCartBumped(false); setCartNotice(""); }, 1900);
    };

    window.addEventListener("storage", reload);
    window.addEventListener("3dr-cart-add", add);
    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener("3dr-cart-add", add);
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, [commitItems]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  const update = (id: string, delta: number) => {
    if (checkoutLock.current) return;
    setCheckoutStatus("idle");
    commitItems(updateCartItem(itemsRef.current, id, delta));
  };
  const total = cartTotal(items);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const checkout = () => {
    if (items.length === 0 || checkoutLock.current) return;
    void checkoutByWhatsApp();
  };

  async function checkoutByWhatsApp() {
    if (checkoutLock.current || items.length === 0) return;
    checkoutLock.current = true;
    setCheckoutStatus("checking");
    const popup = window.open("about:blank", "_blank");
    setCartNotice("Conferindo disponibilidade e registrando o pedido…");
    try {
      if (db) {
        const productIds = new Set(items.map((item) => item.productId));
        const roots = await Promise.all([...productIds].map(async (id) => {
          const snapshot = await getDoc(doc(db!, "products", id));
          return [id, snapshot.exists() ? snapshot.data() : null] as const;
        }));
        const dataById = new Map(roots);
        const componentIds = new Set<string>();
        for (const item of items) {
          const product = dataById.get(item.productId);
          if (!product || product.published !== true) throw new Error(`${item.title} não está mais publicado.`);
          if ((product.kind === "kit") !== (item.kind === "kit")) throw new Error(`O cadastro de ${item.title} mudou; remova e adicione novamente ao carrinho.`);
          const liveProduct = normalizeProduct(item.productId, product);
          const liveVariant = item.variantId ? liveProduct.variants?.find((variant) => variant.colorId === item.variantId) : undefined;
          const livePrice = liveProduct.price === undefined ? undefined : liveProduct.price + (liveVariant?.priceAdjustment ?? 0);
          if (!isCartPriceCurrent(item, livePrice)) throw new Error(`O preço de ${item.title} mudou. Atualize a página e adicione o produto novamente para conferir o valor atual.`);
          if (product.kind === "kit") {
            const components = Array.isArray(product.kitComponents) ? product.kitComponents as { productId: string; quantity: number; variantId?: string; productTitle?: string }[] : [];
            if (components.length < 2) throw new Error(`Os itens do kit ${item.title} não estão disponíveis.`);
            components.forEach((component) => componentIds.add(component.productId));
          }
        }
        const missing = [...componentIds].filter((id) => !dataById.has(id));
        const componentData = await Promise.all(missing.map(async (id) => {
          const snapshot = await getDoc(doc(db!, "products", id));
          return [id, snapshot.exists() ? snapshot.data() : null] as const;
        }));
        componentData.forEach(([id, data]) => dataById.set(id, data));

        const demand = new Map<string, { productId: string; variantId?: string; quantity: number; title: string }>();
        for (const item of items) {
          const product = dataById.get(item.productId)!;
          const requirements = product.kind === "kit"
            ? (product.kitComponents as { productId: string; quantity: number; variantId?: string; productTitle?: string }[]).map((component) => ({ productId: component.productId, variantId: component.variantId, quantity: component.quantity * item.quantity, title: component.productTitle ?? item.title }))
            : [{ productId: item.productId, variantId: item.variantId, quantity: item.quantity, title: item.title }];
          for (const requirement of requirements) {
            const key = `${requirement.productId}::${requirement.variantId ?? ""}`;
            const previous = demand.get(key);
            demand.set(key, { ...requirement, quantity: requirement.quantity + (previous?.quantity ?? 0) });
          }
        }
        const sharedStockDemand = new Map<string, { quantity: number; stock: number; title: string }>();
        for (const requirement of demand.values()) {
          const data = dataById.get(requirement.productId);
          if (!data || data.published !== true) throw new Error(`${requirement.title} não está mais disponível.`);
          const variants = Array.isArray(data.variants) ? data.variants as { colorId: string; available?: boolean; stock?: number }[] : normalizeProduct(requirement.productId, data).variants ?? [];
          if (data.kind === "kit") throw new Error("Kits dentro de kits não são permitidos.");
          if (requirement.variantId) {
            const variant = variants.find((candidate) => candidate.colorId === requirement.variantId);
            if (!variant || variant.available === false) throw new Error(`A variação selecionada de ${requirement.title} está indisponível.`);
            if (typeof variant.stock === "number") {
              if (variant.stock < requirement.quantity) throw new Error(`Estoque insuficiente para ${requirement.title}; disponível: ${variant.stock}.`);
            } else if (typeof data.stock === "number") {
              const current = sharedStockDemand.get(requirement.productId) ?? { quantity: 0, stock: data.stock, title: requirement.title };
              current.quantity += requirement.quantity;
              sharedStockDemand.set(requirement.productId, current);
            }
          } else {
            if (variants.length) throw new Error(`Selecione uma cor para ${requirement.title}.`);
            if (typeof data.stock === "number") {
              const current = sharedStockDemand.get(requirement.productId) ?? { quantity: 0, stock: data.stock, title: requirement.title };
              current.quantity += requirement.quantity;
              sharedStockDemand.set(requirement.productId, current);
            }
          }
        }
        for (const entry of sharedStockDemand.values()) if (entry.quantity > entry.stock) throw new Error(`Estoque insuficiente para ${entry.title}; disponível: ${entry.stock}.`);
      }
      if (!db) throw new Error("O sistema de pedidos está indisponível. Tente novamente mais tarde.");
      const orderRef = await addDoc(collection(db, "orders"), {
        items: items.map((item) => ({ productId: item.productId, ...(item.variantId ? { variantId: item.variantId } : {}), quantity: item.quantity })),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setCheckoutStatus("sent");
      const message = createWhatsAppMessage(items, orderRef.id);
      const url = "https://wa.me/5521995144189?text=" + encodeURIComponent(message);
      setCartNotice(`Pedido ${orderRef.id} registrado para confirmação.`);
      if (popup) { popup.opener = null; popup.location.href = url; }
      else window.location.href = url;
    } catch (reason) {
      popup?.close();
      checkoutLock.current = false;
      setCheckoutStatus("idle");
      setCartNotice(reason instanceof Error ? reason.message : "Não foi possível registrar o pedido.");
    }
  }

  return <>
    {cartNotice && <div className="cart-toast" role="status" aria-live="polite">{cartNotice}</div>}
    <button
      className={`cart-fab ${cartBumped ? "cart-fab-bumped" : ""}`}
      onClick={() => setOpen(true)}
      aria-label={`Abrir carrinho, ${itemCount} itens`}
      aria-controls="cart-dialog"
      aria-expanded={open}
    ><ShoppingBag size={19}/><span>Carrinho</span>{items.length > 0 && <b>{itemCount}</b>}</button>
    {open && <div className="cart-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside
        id="cart-dialog"
        ref={dialogRef}
        className="cart-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        tabIndex={-1}
      >
        <header><div><small>SEU PEDIDO</small><h2 id="cart-title">Carrinho ({itemCount})</h2></div><button ref={closeButtonRef} aria-label="Fechar carrinho" onClick={() => setOpen(false)}><X/></button></header>
        {items.length === 0
          ? <p className="cart-empty">Seu carrinho está vazio. Escolha produtos no catálogo para começar.</p>
          : <>
            <div className="cart-items">{items.map((item) => <article key={item.id}>
              <img src={item.image} alt=""/>
              <div className="cart-item-copy"><strong>{item.title}</strong>{item.kind === "kit" && <small>KIT PROMOCIONAL</small>}{item.variantName && <small><span className="cart-color-dot" style={{ backgroundColor: item.variantHex ?? "#777" }}/> {item.variantName}</small>}<small>{item.price ? formatPrice(item.price) : "Preço sob consulta"}</small>
                <div className="cart-qty">
                  <button aria-label={`Diminuir quantidade de ${item.title}`} disabled={checkoutStatus === "checking"} onClick={() => update(item.id, -1)}><Minus size={14}/></button>
                  <span>{item.quantity}</span>
                  <button aria-label={`Aumentar quantidade de ${item.title}`} disabled={checkoutStatus === "checking" || item.stock !== undefined && item.quantity >= item.stock} onClick={() => update(item.id, 1)}><Plus size={14}/></button>
                  <button aria-label={`Remover ${item.title}`} disabled={checkoutStatus === "checking"} onClick={() => update(item.id, -item.quantity)}><Trash2 size={14}/></button>
                </div>
              </div>
              <b>{item.price ? formatPrice(item.price * item.quantity) : "—"}</b>
            </article>)}</div>
            <div className="cart-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
            <p className="cart-disclaimer">Produtos sem preço cadastrado serão confirmados pelo WhatsApp.</p>
            <p className="cart-checkout-note">O pedido aguarda confirmação pelo WhatsApp. O estoque não fica reservado até a confirmação; valores e disponibilidade podem mudar nesse intervalo.</p>
            <button className="button button-dark cart-checkout" disabled={checkoutStatus !== "idle"} onClick={checkout}>{checkoutStatus === "checking" ? "Conferindo pedido…" : checkoutStatus === "sent" ? "Pedido registrado" : "Continuar pelo WhatsApp ↗"}</button>
          </>}
      </aside>
    </div>}
  </>;
}

