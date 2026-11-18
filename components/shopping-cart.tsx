"use client";
/* eslint-disable @next/next/no-img-element -- Product photos come from administrator-entered URLs, so their hosts are not fixed. */

import { useCallback, useEffect, useRef, useState } from "react";
import { ShoppingBag, X, Minus, Plus, Trash2 } from "lucide-react";
import type { Product } from "@/lib/products";
import {
  addCartItem,
  MAX_CART_LINES,
  cartTotal,
  createWhatsAppMessage,
  normalizeCartItems,
  updateCartItem,
} from "@/lib/cart-utils.mjs";

type CartItem = Pick<Product, "id" | "title" | "slug" | "category" | "price" | "image"> & { quantity: number };
const KEY = "3drprint-cart-v1";
const formatPrice = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ShoppingCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [cartBumped, setCartBumped] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
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
      } catch {
        itemsRef.current = [];
        setItems([]);
      }
    };
    const add = (event: Event) => {
      const product = (event as CustomEvent<Product>).detail;
      if (!product) return;
      const isNewLine = !itemsRef.current.some((item) => item.id === product.id);
      const limitReached = isNewLine && itemsRef.current.length >= MAX_CART_LINES;
      const next = addCartItem(itemsRef.current, product);
      const persisted = commitItems(next);
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

  const update = (id: string, delta: number) => commitItems(updateCartItem(itemsRef.current, id, delta));
  const total = cartTotal(items);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const checkout = () => {
    if (items.length === 0) return;
    const message = createWhatsAppMessage(items);
    window.open("https://wa.me/5521995144189?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  };

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
              <div className="cart-item-copy"><strong>{item.title}</strong><small>{item.price ? formatPrice(item.price) : "Preço sob consulta"}</small>
                <div className="cart-qty">
                  <button aria-label={`Diminuir quantidade de ${item.title}`} onClick={() => update(item.id, -1)}><Minus size={14}/></button>
                  <span>{item.quantity}</span>
                  <button aria-label={`Aumentar quantidade de ${item.title}`} onClick={() => update(item.id, 1)}><Plus size={14}/></button>
                  <button aria-label={`Remover ${item.title}`} onClick={() => update(item.id, -item.quantity)}><Trash2 size={14}/></button>
                </div>
              </div>
              <b>{item.price ? formatPrice(item.price * item.quantity) : "—"}</b>
            </article>)}</div>
            <div className="cart-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
            <p className="cart-disclaimer">Produtos sem preço cadastrado serão confirmados pelo WhatsApp.</p>
            <button className="button button-dark cart-checkout" onClick={checkout}>Continuar pelo WhatsApp ↗</button>
          </>}
      </aside>
    </div>}
  </>;
}
