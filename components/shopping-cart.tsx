"use client";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag, X, Minus, Plus, Trash2 } from "lucide-react";
import { Product } from "@/lib/products";
type CartItem = Pick<Product, "id" | "title" | "slug" | "category" | "price" | "image"> & { quantity: number };
const KEY = "3drprint-cart-v1";
const formatPrice = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export default function ShoppingCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [cartBumped, setCartBumped] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const noticeTimer = useRef<number | null>(null);
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setItems([]); }
    const reload = () => { try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setItems([]); } };
    const add = (event: Event) => {
      const product = (event as CustomEvent<Product>).detail;
      if (!product) return;
      setItems((current) => {
        const found = current.find((item) => item.id === product.id);
        const next = found ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { id: product.id, title: product.title, slug: product.slug, category: product.category, price: product.price, image: product.image, quantity: 1 }];
        localStorage.setItem(KEY, JSON.stringify(next)); return next;
      }); setOpen(true); setCartBumped(true); setCartNotice(`${product.title} adicionado ao carrinho`);
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => { setCartBumped(false); setCartNotice(""); }, 1900);
    };
    window.addEventListener("storage", reload); window.addEventListener("3dr-cart-add", add);
    return () => { window.removeEventListener("storage", reload); window.removeEventListener("3dr-cart-add", add); if (noticeTimer.current) window.clearTimeout(noticeTimer.current); };
  }, []);
  const update = (id: string, delta: number) => setItems((current) => { const next = current.map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0); localStorage.setItem(KEY, JSON.stringify(next)); return next; });
  const total = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const checkout = () => {
    const lines = items.map((item) => `• ${item.title} (${item.category}) — ${item.quantity}x${item.price ? ` ${formatPrice(item.price)}` : " (preço a combinar)"}`);
    const message = ["Olá! Quero fazer este pedido:", ...lines, "", `Total informado: ${formatPrice(total)}`, "Poderia confirmar disponibilidade e frete?"].join("\n");
    window.open(`https://wa.me/5521995144189?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  return <>
    {cartNotice && <div className="cart-toast" role="status" aria-live="polite">{cartNotice}</div>}
    <button className={`cart-fab ${cartBumped ? "cart-fab-bumped" : ""}`} onClick={() => setOpen(true)} aria-label={`Abrir carrinho, ${items.reduce((n, i) => n + i.quantity, 0)} itens`}><ShoppingBag size={19}/><span>Carrinho</span>{items.length > 0 && <b>{items.reduce((n, i) => n + i.quantity, 0)}</b>}</button>
    {open && <div className="cart-backdrop" onClick={() => setOpen(false)}><aside className="cart-panel" onClick={(e) => e.stopPropagation()} aria-label="Carrinho de compras"><header><div><small>SEU PEDIDO</small><h2>Carrinho ({items.reduce((n, i) => n + i.quantity, 0)})</h2></div><button aria-label="Fechar carrinho" onClick={() => setOpen(false)}><X/></button></header>
      {items.length === 0 ? <p className="cart-empty">Seu carrinho está vazio. Escolha produtos no catálogo para começar.</p> : <><div className="cart-items">{items.map((item) => <article key={item.id}><img src={item.image} alt=""/><div className="cart-item-copy"><strong>{item.title}</strong><small>{item.price ? formatPrice(item.price) : "Preço sob consulta"}</small><div className="cart-qty"><button aria-label="Diminuir quantidade" onClick={() => update(item.id, -1)}><Minus size={14}/></button><span>{item.quantity}</span><button aria-label="Aumentar quantidade" onClick={() => update(item.id, 1)}><Plus size={14}/></button><button aria-label={`Remover ${item.title}`} onClick={() => update(item.id, -item.quantity)}><Trash2 size={14}/></button></div></div><b>{item.price ? formatPrice(item.price * item.quantity) : "—"}</b></article>)}</div><div className="cart-total"><span>Total</span><strong>{formatPrice(total)}</strong></div><p className="cart-disclaimer">Produtos sem preço cadastrado serão confirmados pelo WhatsApp.</p><button className="button button-dark cart-checkout" onClick={checkout}>Continuar pelo WhatsApp ↗</button></>}
    </aside></div>}
  </>;
}
