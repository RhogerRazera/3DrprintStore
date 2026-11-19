"use client";
/* eslint-disable @next/next/no-img-element -- Product photos come from administrator-entered URLs, so their hosts are not fixed. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { calculateKitStock, calculateKitValue, normalizeProduct, Product } from "@/lib/products";
import { db } from "@/lib/firebase";
import { categoryLabel, defaultSiteContent, mergeSiteContent, resolveCategory, SiteContent } from "@/lib/site-content";
import ShoppingCart from "@/components/shopping-cart";

type LoadStatus = "loading" | "ready" | "error";

export default function CatalogPage() {
  const [category, setCategory] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [kitStocks, setKitStocks] = useState<Record<string, number | null>>({});
  const [searchText, setSearchText] = useState("");
  const [availability, setAvailability] = useState("all");
  const [sortBy, setSortBy] = useState("title");
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

        const productsRef = collection(db!, "products");
        const [byId, byLegacyName] = await Promise.all([
          getDocs(query(productsRef, where("published", "==", true), ...(categoryInfo ? [where("category", "==", categoryInfo.id)] : []))),
          categoryInfo && categoryInfo.name !== categoryInfo.id
            ? getDocs(query(productsRef, where("published", "==", true), where("category", "==", categoryInfo.name)))
            : Promise.resolve(null),
        ]);
        const uniqueProducts = new Map(byId.docs.map((item) => [item.id, normalizeProduct(item.id, item.data())]));
        byLegacyName?.docs.forEach((item) => uniqueProducts.set(item.id, normalizeProduct(item.id, item.data())));
        let loadedProducts = [...uniqueProducts.values()];

        const kits = loadedProducts.filter((item) => item.kind === "kit");
        setKitStocks(Object.fromEntries(kits.map((kit) => [kit.id, 0])));
        loadedProducts = loadedProducts.filter((item) => item.kind !== "kit" || (item.kitComponents?.length ?? 0) >= 2);
        const componentIds = [...new Set(kits.flatMap((kit) => kit.kitComponents?.map((component) => component.productId) ?? []))];
        if (componentIds.length) {
          const componentSnapshots = await Promise.all(componentIds.map((id) => getDoc(doc(db!, "products", id)).catch(() => null)));
          const components = componentSnapshots.flatMap((item) => item?.exists() ? [normalizeProduct(item.id, item.data() ?? {})] : []);
          const componentMap = new Map(components.map((item) => [item.id, item]));
          setKitStocks(Object.fromEntries(loadedProducts.filter((item) => item.kind === "kit").map((kit) => [kit.id, calculateKitStock(kit.kitComponents ?? [], components)])));
          loadedProducts = loadedProducts.filter((item) => item.kind !== "kit" || (item.kitComponents?.length ?? 0) >= 2 && item.kitComponents!.every((component) => componentMap.get(component.productId)?.published));
          loadedProducts = loadedProducts.map((item) => item.kind === "kit" ? { ...item, compareAtPrice: calculateKitValue(item.kitComponents ?? [], components) } : item);
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
  useEffect(() => {
    const pageTitle = `${title} · Kriatto3D`;
    document.title = pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", pageTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]') ?? document.head.appendChild(Object.assign(document.createElement("link"), { rel: "canonical" }));
    canonical.href = window.location.origin + window.location.pathname + (category ? `?categoria=${encodeURIComponent(category)}` : "");
  }, [title, description, category]);
  const visibleProducts = products.filter((product) => {
    const needle = searchText.trim().toLocaleLowerCase("pt-BR");
    const matchesText = !needle || `${product.title} ${product.description} ${categoryLabel(content, product.category)}`.toLocaleLowerCase("pt-BR").includes(needle);
    const hasAvailability = product.kind === "kit"
      ? kitStocks[product.id] !== 0
      : product.variants?.length
        ? product.variants.some((variant) => variant.available && (variant.stock ?? product.stock) !== 0)
        : product.stock !== 0;
    return matchesText && (availability !== "available" || hasAvailability);
  }).sort((a, b) => {
    if (sortBy === "price-asc") return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
    if (sortBy === "price-desc") return (b.price ?? Number.NEGATIVE_INFINITY) - (a.price ?? Number.NEGATIVE_INFINITY);
    return a.title.localeCompare(b.title, "pt-BR");
  });

  return <main className="catalog-page">
    <nav className="project-nav">
      <Link href="/" className="brand"><span className="brand-mark">{content.siteInitial}</span> {content.siteName}<span className="brand-dot">.</span></Link>
      <Link href="/" className="back-link"><ArrowLeft size={16}/> Voltar ao site</Link>
    </nav>
    <header className="catalog-heading"><span className="eyebrow">CATÁLOGO KRIATTO3D</span><h1>{title}<span className="brand-dot">.</span></h1><p>{description}</p></header>
    {status === "loading" ? <p className="project-loading" role="status">Carregando produtos…</p>
      : status === "error" ? <section className="catalog-empty" role="status"><h2>Não foi possível carregar os produtos.</h2><p>Tente novamente mais tarde ou consulte a Kriatto3D pelo WhatsApp.</p><a className="button button-dark" href="https://wa.me/5521995144189" target="_blank" rel="noopener noreferrer">Consultar pelo WhatsApp ↗</a></section>
        : products.length ? <><section className="catalog-tools" aria-label="Busca e filtros do catálogo"><input type="search" placeholder="Buscar produtos…" aria-label="Buscar produtos" value={searchText} onChange={(event) => setSearchText(event.target.value)}/><label>Disponibilidade<select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">Todos</option><option value="available">Disponíveis para compra</option></select></label><label>Ordenar por<select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="title">Nome</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select></label><span className="catalog-result-count">{visibleProducts.length} {visibleProducts.length === 1 ? "produto" : "produtos"}</span></section>{visibleProducts.length ? <section className="catalog-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id}>
          <Link href={`/projeto/?slug=${encodeURIComponent(product.slug)}`}><div className="product-image-wrap"><img src={product.images?.[0] || product.image} alt={product.title} loading="lazy"/><span className="product-tag">{product.tag}</span></div></Link>
          <div className="product-info"><div><span className="product-category">{product.kind === "kit" ? "KIT PROMOCIONAL · " : ""}{categoryLabel(content, product.category)}</span><h3><Link href={`/projeto/?slug=${encodeURIComponent(product.slug)}`}>{product.title}</Link></h3>{product.kind === "kit" && product.compareAtPrice !== undefined && product.price !== undefined && product.compareAtPrice > product.price ? <del className="catalog-original-price">{product.compareAtPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</del> : null}<strong className="product-price">{product.price && product.price > 0 ? product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Preço sob consulta"}</strong>{product.kind === "kit" && product.compareAtPrice !== undefined && product.price !== undefined && product.compareAtPrice > product.price ? <small className="catalog-savings">Economize {(product.compareAtPrice - product.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</small> : null}</div><Link className="round-arrow" aria-label={`Ver ${product.title}`} href={`/projeto/?slug=${encodeURIComponent(product.slug)}`}><ShoppingBag size={17}/></Link></div>
          <p className="catalog-product-description">{product.description}</p>
        </article>)}</section> : <section className="catalog-empty"><h2>Nenhum produto encontrado.</h2><p>Tente outro termo ou remova o filtro.</p></section>}</>
        : <section className="catalog-empty"><h2>Catálogo em atualização.</h2><p>Os produtos desta categoria serão publicados em breve.</p><Link className="button button-dark" href="/">Voltar ao site ↗</Link></section>}
    <footer className="footer"><Link href="/">{content.siteName}</Link><Link href="/admin/">Painel administrativo ↗</Link></footer>
    <ShoppingCart/>
  </main>;
}

