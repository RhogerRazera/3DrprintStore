"use client";
/* eslint-disable @next/next/no-img-element -- Product photos come from administrator-entered URLs, so their hosts are not fixed. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { normalizeProduct, Product } from "@/lib/products";
import { db } from "@/lib/firebase";
import { categoryLabel, defaultSiteContent, mergeSiteContent, resolveCategory, SiteContent } from "@/lib/site-content";
import ShoppingCart from "@/components/shopping-cart";

type LoadStatus = "loading" | "ready" | "error";

export default function CatalogPage() {
  const [category, setCategory] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("categoria") || "";
    setCategory(selected);
    if (!db) {
      setProducts([]);
      setStatus("error");
      return;
    }

    async function loadCatalog() {
      try {
        const site = await getDoc(doc(db!, "siteContent", "home"));
        const loadedContent = site.exists() ? mergeSiteContent(site.data()) : defaultSiteContent;
        setContent(loadedContent);

        const categoryInfo = resolveCategory(loadedContent, selected);
        if (selected && !categoryInfo) {
          setProducts([]);
          setStatus("ready");
          return;
        }

        const constraints = [where("published", "==", true)];
        if (categoryInfo) constraints.push(where("category", "==", categoryInfo.id));
        const snapshot = await getDocs(query(collection(db!, "products"), ...constraints));
        let loadedProducts = snapshot.docs.map((item) => normalizeProduct(item.id, item.data()));

        // Keep legacy products whose category field stores the display name.
        if (categoryInfo && categoryInfo.name !== categoryInfo.id && loadedProducts.length === 0) {
          const legacy = await getDocs(query(
            collection(db!, "products"),
            where("published", "==", true),
            where("category", "==", categoryInfo.name),
          ));
          loadedProducts = legacy.docs.map((item) => normalizeProduct(item.id, item.data()));
        }

        setProducts(loadedProducts);
        setStatus("ready");
      } catch {
        setProducts([]);
        setStatus("error");
      }
    }

    void loadCatalog();
  }, []);

  const selectedCategory = resolveCategory(content, category);
  const title = selectedCategory?.name ?? "Catálogo";
  const description = selectedCategory?.description || "Explore os produtos personalizados disponíveis.";

  return <main className="catalog-page">
    <nav className="project-nav">
      <Link href="/" className="brand"><span className="brand-mark">{content.siteInitial}</span> {content.siteName}<span className="brand-dot">.</span></Link>
      <Link href="/" className="back-link"><ArrowLeft size={16}/> Voltar ao site</Link>
    </nav>
    <header className="catalog-heading"><span className="eyebrow">CATÁLOGO KRIATTO3D</span><h1>{title}<span className="brand-dot">.</span></h1><p>{description}</p></header>
    {status === "loading" ? <p className="project-loading" role="status">Carregando produtos…</p>
      : status === "error" ? <section className="catalog-empty" role="status"><h2>Não foi possível carregar os produtos.</h2><p>Tente novamente mais tarde ou consulte a Kriatto3D pelo WhatsApp.</p><a className="button button-dark" href="https://wa.me/5521995144189" target="_blank" rel="noopener noreferrer">Consultar pelo WhatsApp ↗</a></section>
      : products.length ? <section className="catalog-grid">{products.map((product) => <article className="product-card" key={product.id}>
          <Link href={`/projeto/?slug=${encodeURIComponent(product.slug)}`}><div className="product-image-wrap"><img src={product.images?.[0] || product.image} alt={product.title} loading="lazy"/><span className="product-tag">{product.tag}</span></div></Link>
          <div className="product-info"><div><span className="product-category">{categoryLabel(content, product.category)}</span><h3><Link href={`/projeto/?slug=${encodeURIComponent(product.slug)}`}>{product.title}</Link></h3><strong className="product-price">{product.price && product.price > 0 ? product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Preço sob consulta"}</strong></div><button className="round-arrow" aria-label={`Adicionar ${product.title} ao carrinho`} onClick={() => window.dispatchEvent(new CustomEvent("3dr-cart-add", { detail: product }))}><ShoppingBag size={17}/></button></div>
          <p className="catalog-product-description">{product.description}</p>
        </article>)}</section>
        : <section className="catalog-empty"><h2>Catálogo em atualização.</h2><p>Os produtos desta categoria serão publicados em breve.</p><Link className="button button-dark" href="/">Voltar ao site ↗</Link></section>}
    <footer className="footer"><Link href="/">{content.siteName}</Link><Link href="/admin/">Painel administrativo ↗</Link></footer>
    <ShoppingCart/>
  </main>;
}
