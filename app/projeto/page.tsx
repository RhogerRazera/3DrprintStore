"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { demoProducts, normalizeProduct, Product } from "@/lib/products";
import { db } from "@/lib/firebase";
import { categoryLabel, defaultSiteContent, mergeSiteContent, SiteContent } from "@/lib/site-content";
import ShoppingCart from "@/components/shopping-cart";

export default function ProjectPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const projectSlug = new URLSearchParams(window.location.search).get("slug") ?? "";
    const example = demoProducts.find((item) => item.slug === projectSlug);
    if (!db) { setProduct(example ?? null); setLoading(false); return; }
    getDoc(doc(db, "siteContent", "home"))
      .then((snapshot) => { if (snapshot.exists()) setContent(mergeSiteContent(snapshot.data())); })
      .catch(() => undefined);
    getDocs(query(collection(db, "products"), where("published", "==", true)))
      .then((snapshot) => {
        const found = snapshot.docs.map((item) => normalizeProduct(item.id, item.data())).find((item) => item.slug === projectSlug);
        setProduct(found ?? null);
      })
      .catch(() => setProduct(example ?? null))
      .finally(() => setLoading(false));
  }, []);

  const productImages = (Array.isArray(product?.images) && product.images.length ? product.images : product?.image ? [product.image] : []).filter((url): url is string => typeof url === "string" && url.length > 0).slice(0, 3);

  useEffect(() => {
    setActiveImage(0);
  }, [product?.id]);

  useEffect(() => {
    if (productImages.length < 2) return;
    const timer = window.setInterval(() => setActiveImage((index) => (index + 1) % productImages.length), 5000);
    return () => window.clearInterval(timer);
  }, [product?.id, productImages.length]);

  useEffect(() => {
    document.title = `${product?.title ?? content.siteTitle} · ${content.siteName}`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", product?.description ?? content.siteDescription);
  }, [product, content.siteName, content.siteTitle, content.siteDescription]);

  if (loading) return <main className="project-page"><p className="project-loading">{content.projectLoading}</p></main>;
  if (!product) return <main className="project-page"><nav className="project-nav"><Link href="/" className="brand"><span className="brand-mark">{content.siteInitial}</span> {content.siteName}<span className="brand-dot">.</span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> {content.projectBackLabel}</Link></nav><section className="admin-login"><h1>{content.projectNotFoundTitle}</h1><p>{content.projectNotFoundBody}</p><Link href="/" className="button button-dark">{content.projectExploreLabel}</Link></section></main>;

  return <main className="project-page">
    <nav className="project-nav"><Link href="/" className="brand"><span className="brand-mark">{content.siteInitial}</span> {content.siteName}<span className="brand-dot">.</span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> {content.projectBackLabel}</Link></nav>
    <section className="project-detail">
      <div className="project-gallery"><div className="project-image-wrap"><img src={productImages[activeImage] || product.image} alt={`${product.title} — imagem ${activeImage + 1}`} className="project-image"/><span className="image-label">{product.tag}</span>{productImages.length > 1 && <><button className="gallery-arrow gallery-prev" aria-label="Imagem anterior" onClick={() => setActiveImage((activeImage + productImages.length - 1) % productImages.length)}><ChevronLeft/></button><button className="gallery-arrow gallery-next" aria-label="Próxima imagem" onClick={() => setActiveImage((activeImage + 1) % productImages.length)}><ChevronRight/></button><div className="gallery-indicators">{productImages.map((url, index) => <button key={`${url}-${index}`} className={activeImage === index ? "active" : ""} aria-label={`Ver imagem ${index + 1}`} onClick={() => setActiveImage(index)} />)}</div></>}</div>{productImages.length > 1 && <div className="gallery-thumbnails">{productImages.map((url, index) => <button key={`${url}-thumb-${index}`} className={activeImage === index ? "active" : ""} aria-label={`Selecionar imagem ${index + 1}`} onClick={() => setActiveImage(index)}><img src={url} alt=""/></button>)}</div>}</div>
      <div className="project-copy"><p className="eyebrow">{categoryLabel(content, product.category)} / {content.projectStudyLabel}</p><h1>{product.title}<span className="brand-dot">.</span></h1><p className="project-description">{product.description}</p><div className="project-price">{product.price && product.price > 0 ? product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Preço sob consulta"}</div><div className="detail-rule"/><div className="detail-row"><span>{content.projectMaterialsLabel}</span><strong>{product.material || "Consulte disponibilidade"}</strong></div><div className="detail-row"><span>{content.projectPaletteLabel}</span><strong>{(Array.isArray(product.colors) ? product.colors : []).join(" · ") || "A combinar"}</strong></div><div className="detail-note"><Check size={18}/> {content.projectNote}</div><div className="project-actions"><button className="button button-lime" onClick={() => window.dispatchEvent(new CustomEvent("3dr-cart-add", { detail: product }))}><ShoppingBag size={17}/> Adicionar ao carrinho</button><Link className="button button-dark project-cta" href={`/?orcamento=${encodeURIComponent(product.title)}#contato`}>{content.projectQuoteLabel} <ArrowUpRight size={18}/></Link></div><ShoppingCart/></div>
    </section>
    <footer className="footer project-footer"><span>{content.siteName}® — {content.footerTagline}</span><Link href="/">{content.projectFooterExploreLabel} ↗</Link></footer>
  </main>;
}
