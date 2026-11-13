"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { demoProducts, normalizeProduct, Product } from "@/lib/products";
import { db } from "@/lib/firebase";
import { categoryLabel, defaultSiteContent, mergeSiteContent, resolveCategory, SiteContent } from "@/lib/site-content";
import ShoppingCart from "@/components/shopping-cart";
export default function CatalogPage() {
 const [category, setCategory] = useState(""); const [products, setProducts] = useState<Product[]>([]); const [content, setContent] = useState<SiteContent>(defaultSiteContent); const [loading, setLoading] = useState(true);
 useEffect(() => { const selected = new URLSearchParams(window.location.search).get("categoria") || ""; setCategory(selected); const fallback = demoProducts.filter(p => p.category === selected); if (!db) { setProducts(fallback); setLoading(false); return; }
  Promise.all([getDoc(doc(db, "siteContent", "home")), getDocs(query(collection(db, "products"), where("published", "==", true)))]).then(([site, snapshot]) => { const loadedContent = site.exists() ? mergeSiteContent(site.data()) : defaultSiteContent; setContent(loadedContent); const chosen = resolveCategory(loadedContent, selected); setProducts(snapshot.docs.map(item => normalizeProduct(item.id, item.data())).filter(item => item.category === selected || item.category === chosen?.id || item.category === chosen?.name)); }).catch(() => setProducts(fallback)).finally(() => setLoading(false)); }, []);
 const selectedCategory = resolveCategory(content, category);
 const title = selectedCategory?.name ?? "Catálogo";
 const description = selectedCategory?.description || "Explore os produtos personalizados disponíveis.";
 return <main className="catalog-page"><nav className="project-nav"><Link href="/" className="brand"><span className="brand-mark">{content.siteInitial}</span> {content.siteName}<span className="brand-dot">.</span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> Voltar ao site</Link></nav><header className="catalog-heading"><span className="eyebrow">CATÁLOGO 3DR PRINT</span><h1>{title}<span className="brand-dot">.</span></h1><p>{description}</p></header>
  {loading ? <p className="project-loading">Carregando produtos…</p> : products.length ? <section className="catalog-grid">{products.map(p => <article className="product-card" key={p.id}><Link href={`/projeto/?slug=${encodeURIComponent(p.slug)}`}><div className="product-image-wrap"><img src={p.images?.[0] || p.image} alt={p.title} loading="lazy"/><span className="product-tag">{p.tag}</span></div></Link><div className="product-info"><div><span className="product-category">{categoryLabel(content, p.category)}</span><h3><Link href={`/projeto/?slug=${encodeURIComponent(p.slug)}`}>{p.title}</Link></h3><strong className="product-price">{p.price && p.price > 0 ? p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Preço sob consulta"}</strong></div><button className="round-arrow" aria-label={`Adicionar ${p.title} ao carrinho`} onClick={() => window.dispatchEvent(new CustomEvent("3dr-cart-add", { detail: p }))}><ShoppingBag size={17}/></button></div><p className="catalog-product-description">{p.description}</p></article>)}</section> : <section className="catalog-empty"><h2>Estamos preparando este catálogo.</h2><p>Novos produtos serão publicados em breve.</p><Link className="button button-dark" href="/admin/">Adicionar produtos ↗</Link></section>}
  <footer className="footer"><Link href="/">{content.siteName}</Link><Link href="/admin/">Painel administrativo ↗</Link></footer><ShoppingCart/>
 </main>;
}
