"use client";
/* eslint-disable @next/next/no-img-element -- Product photos come from administrator-entered URLs, so their hosts are not fixed. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { calculateKitStock, defaultProductColors, normalizeProduct, Product, ProductColorOption } from "@/lib/products";
import { db } from "@/lib/firebase";
import { categoryLabel, defaultSiteContent, mergeSiteContent, SiteContent } from "@/lib/site-content";
import ShoppingCart from "@/components/shopping-cart";

export default function ProjectPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [productColors, setProductColors] = useState<ProductColorOption[]>(defaultProductColors);
  const [kitAvailable, setKitAvailable] = useState<number | null>(null);

  useEffect(() => {
    const productSlug = new URLSearchParams(window.location.search).get("slug") ?? "";
    if (!db) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    getDoc(doc(db, "siteContent", "home"))
      .then((snapshot) => { if (snapshot.exists()) setContent(mergeSiteContent(snapshot.data())); })
      .catch(() => undefined);
    getDocs(collection(db, "productColors")).then((snapshot) => {
      const saved = snapshot.docs.map((item) => ({ id: item.id, ...item.data(), custom: true } as ProductColorOption));
      const savedById = new Map(saved.map((color) => [color.id, color]));
      setProductColors([...defaultProductColors.map((color) => ({ ...color, ...(savedById.get(color.id) ?? {}) })), ...saved.filter((color) => !defaultProductColors.some((base) => base.id === color.id))]);
    }).catch(() => undefined);

    getDocs(query(
      collection(db, "products"),
      where("published", "==", true),
      where("slug", "==", productSlug),
      limit(1),
    ))
      .then(async (snapshot) => {
        const loaded = snapshot.empty ? null : normalizeProduct(snapshot.docs[0].id, snapshot.docs[0].data());
        setProduct(loaded);
        if (loaded?.kind === "kit" && loaded.kitComponents?.length) {
          const componentSnapshots = await Promise.all(loaded.kitComponents.map((item) => getDoc(doc(db!, "products", item.productId))));
          const componentProducts = componentSnapshots.filter((item) => item.exists()).map((item) => normalizeProduct(item.id, item.data()));
          setKitAvailable(calculateKitStock(loaded.kitComponents, componentProducts));
        }
      })
      .catch(() => {
        setProduct(null);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const productImages = (Array.isArray(product?.images) && product.images.length ? product.images : product?.image ? [product.image] : []).filter((url): url is string => typeof url === "string" && url.length > 0).slice(0, 3);
  const availableVariants = (product?.variants ?? []).filter((variant) => variant.available && productColors.find((color) => color.id === variant.colorId)?.active !== false);
  const selectedVariant = availableVariants.find((variant) => variant.colorId === selectedVariantId) ?? availableVariants[0] ?? null;
  const selectedImages = selectedVariant?.image ? [selectedVariant.image, ...productImages.filter((image) => image !== selectedVariant.image)] : productImages;
  const shownPrice = product?.price === undefined ? undefined : product.price + (selectedVariant?.priceAdjustment ?? 0);
  const productStock = selectedVariant?.stock ?? product?.stock;
  const availableForCart = product?.kind === "kit" ? kitAvailable !== 0 : product?.variants?.length ? Boolean(selectedVariant && (productStock === undefined || productStock > 0)) : product?.stock === undefined || product.stock > 0;

  useEffect(() => {
    setActiveImage(0);
    setSelectedVariantId(product?.variants?.find((variant) => variant.available)?.colorId ?? "");
  }, [product]);

  useEffect(() => {
    if (selectedImages.length < 2) return;
    const timer = window.setInterval(() => setActiveImage((index) => (index + 1) % selectedImages.length), 5000);
    return () => window.clearInterval(timer);
  }, [product?.id, selectedVariant?.colorId, selectedImages.length]);

  useEffect(() => {
    document.title = `${product?.title ?? content.siteTitle} · ${content.siteName}`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", product?.description ?? content.siteDescription);
  }, [product, content.siteName, content.siteTitle, content.siteDescription]);

  if (loading) return <main className="project-page"><p className="project-loading" role="status">{content.projectLoading}</p></main>;
  if (!product) return <main className="project-page">
    <nav className="project-nav"><Link href="/" className="brand"><span className="brand-mark">{content.siteInitial}</span> {content.siteName}<span className="brand-dot">.</span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> {content.projectBackLabel}</Link></nav>
    <section className="admin-login"><h1>{loadError ? "Produto indisponível no momento" : content.projectNotFoundTitle}</h1><p>{loadError ? "Não foi possível consultar o catálogo. Tente novamente mais tarde ou fale com a Kriatto3D pelo WhatsApp." : content.projectNotFoundBody}</p>{loadError ? <a className="button button-dark" href="https://wa.me/5521995144189" target="_blank" rel="noopener noreferrer">Consultar pelo WhatsApp ↗</a> : <Link href="/" className="button button-dark">{content.projectExploreLabel}</Link>}</section>
  </main>;

  return <main className="project-page">
    <nav className="project-nav"><Link href="/" className="brand"><span className="brand-mark">{content.siteInitial}</span> {content.siteName}<span className="brand-dot">.</span></Link><Link href="/" className="back-link"><ArrowLeft size={16}/> {content.projectBackLabel}</Link></nav>
    <section className="project-detail">
      <div className="project-gallery"><div className="project-image-wrap"><img src={selectedImages[activeImage] || product.image} alt={`${product.title} — imagem ${activeImage + 1}`} className="project-image"/><span className="image-label">{product.tag}</span>{selectedImages.length > 1 && <><button className="gallery-arrow gallery-prev" aria-label="Imagem anterior" onClick={() => setActiveImage((activeImage + selectedImages.length - 1) % selectedImages.length)}><ChevronLeft/></button><button className="gallery-arrow gallery-next" aria-label="Próxima imagem" onClick={() => setActiveImage((activeImage + 1) % selectedImages.length)}><ChevronRight/></button><div className="gallery-indicators">{selectedImages.map((url, index) => <button key={`${url}-${index}`} className={activeImage === index ? "active" : ""} aria-label={`Ver imagem ${index + 1}`} onClick={() => setActiveImage(index)} />)}</div></>}</div>{selectedImages.length > 1 && <div className="gallery-thumbnails">{selectedImages.map((url, index) => <button key={`${url}-thumb-${index}`} className={activeImage === index ? "active" : ""} aria-label={`Selecionar imagem ${index + 1}`} onClick={() => setActiveImage(index)}><img src={url} alt=""/></button>)}</div>}</div>
      <div className="project-copy">
        <p className="eyebrow">{categoryLabel(content, product.category)} / {product.kind === "kit" ? "KIT PROMOCIONAL" : content.projectStudyLabel}</p>
        <h1>{product.title}<span className="brand-dot">.</span></h1>
        <p className="project-description">{product.description}</p>
        {product.kind === "kit" && product.kitComponents?.length ? <section className="kit-detail-items"><h2>Itens incluídos</h2>{product.kitComponents.map((item, index) => <p key={item.productId + index}><span>{item.quantity} × {item.productTitle}</span>{item.variantName && <small><i style={{ backgroundColor: item.variantHex ?? "#777" }}/> {item.variantName}</small>}</p>)}</section> : null}
        {availableVariants.length > 0 && <fieldset className="product-variant-picker"><legend>Escolha uma cor: <strong>{selectedVariant?.name ?? "Selecione"}</strong></legend><div>{availableVariants.map((variant) => <button key={variant.colorId} type="button" className={selectedVariant?.colorId === variant.colorId ? "selected" : ""} style={{ backgroundColor: variant.hex }} aria-label={variant.name} aria-pressed={selectedVariant?.colorId === variant.colorId} onClick={() => { setSelectedVariantId(variant.colorId); setActiveImage(0); }}/>)}</div></fieldset>}
        {product.kind === "kit" && product.compareAtPrice !== undefined && product.price !== undefined
          ? <div className="kit-price-block"><del>{product.compareAtPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</del><div className="project-price">{product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div><span>Você economiza {(product.compareAtPrice - product.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ({Math.round((product.compareAtPrice - product.price) / product.compareAtPrice * 100)}%)</span></div>
          : <div className="project-price">{shownPrice && shownPrice > 0 ? shownPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Preço sob consulta"}</div>}
        {product.kind === "kit" && kitAvailable !== null ? <p className="availability-note">{kitAvailable > 0 ? "Disponível: " + kitAvailable + " kit(s)" : "Kit sem estoque no momento"}</p>
          : productStock !== undefined ? <p className="availability-note">{productStock > 0 ? "Estoque disponível: " + productStock : "Sem estoque no momento"}</p>
          : product.kind !== "kit" ? <p className="availability-note">Produção sob encomenda</p> : null}
        <div className="detail-rule"/>
        {product.kind !== "kit" && <><div className="detail-row"><span>{content.projectMaterialsLabel}</span><strong>{product.material || "Consulte disponibilidade"}</strong></div><div className="detail-row"><span>{content.projectPaletteLabel}</span><strong>{availableVariants.map((variant) => variant.name).join(" · ") || product.colors.join(" · ") || "A combinar"}</strong></div></>}
        <div className="detail-note"><Check size={18}/> {content.projectNote}</div>
        <div className="project-actions">
          <button className="button button-lime" disabled={!availableForCart} onClick={() => window.dispatchEvent(new CustomEvent("3dr-cart-add", { detail: { ...product, id: selectedVariant ? product.id + "::" + selectedVariant.colorId : product.id, productId: product.id, ...(selectedVariant ? { variantId: selectedVariant.colorId, variantName: selectedVariant.name, variantHex: selectedVariant.hex } : {}), price: shownPrice, stock: product.kind === "kit" ? kitAvailable ?? undefined : productStock, image: selectedVariant?.image ?? product.image } }))}><ShoppingBag size={17}/>{availableForCart ? "Adicionar ao carrinho" : "Indisponível"}</button>
          <Link className="button button-dark project-cta" href={"/?orcamento=" + encodeURIComponent(product.title) + "#contato"}>{content.projectQuoteLabel} <ArrowUpRight size={18}/></Link>
        </div>
        <ShoppingCart/>
      </div>
    
    </section>
    <footer className="footer project-footer"><span>{content.siteName}® — {content.footerTagline}</span><Link href="/">{content.projectFooterExploreLabel} ↗</Link></footer>
  </main>;
}

