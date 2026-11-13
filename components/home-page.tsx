"use client";

import { useMemo, useState, useEffect, CSSProperties } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Menu, Search, X, Sparkles, Package, Shapes, Send, ShoppingBag, MessageCircle } from "lucide-react";
import { demoProducts, normalizeProduct, Product } from "@/lib/products";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { categoryLabel, defaultSiteContent, getSiteCategories, mergeSiteContent, SiteContent } from "@/lib/site-content";
import ShoppingCart from "@/components/shopping-cart";

function categoryIcon(icon: string) {
  if (icon === "package") return <Package/>;
  if (icon === "sparkles") return <Sparkles/>;
  return <Shapes/>;
}

export default function HomePage({ initialProducts }: { initialProducts: Product[] }) {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);

  useEffect(() => {
    if (db) {
      getDoc(doc(db, "siteContent", "home")).then((snapshot) => {
        if (snapshot.exists()) setContent(mergeSiteContent(snapshot.data()));
      }).catch(() => { /* Mantém o conteúdo padrão até o banco ficar disponível. */ });
      getDocs(query(collection(db, "products"), where("published", "==", true)))
        .then((snapshot) => setProducts(snapshot.docs.map((item) => normalizeProduct(item.id, item.data()))))
        .catch(() => { /* Mantém os projetos demonstrativos enquanto a base não estiver disponível. */ });
    }
  }, []);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -35px 0px" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [products]);

  useEffect(() => {
    document.title = content.siteTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", content.siteDescription);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", content.siteTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", content.siteDescription);
  }, [content.siteTitle, content.siteDescription]);

  const filtered = useMemo(() => products.filter((p) => {
    const categoryMatch = activeCategory === "Todos" || p.category === activeCategory || categoryLabel(content, p.category) === activeCategory;
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return categoryMatch && (!query || `${p.title} ${p.category} ${p.description}`.toLocaleLowerCase("pt-BR").includes(query));
  }), [activeCategory, search, products, content]);


  return (
    <main style={{ "--paper": content.colorPaper, "--ink": content.colorInk, "--lime": content.colorLime, color: content.colorInk, backgroundColor: content.colorPaper } as CSSProperties}>
      <header className="site-header">
        <Link href="/" className="brand" aria-label={`${content.siteName} página inicial`}><span className="brand-mark">{content.siteInitial}</span> {content.siteName}<span className="brand-dot">.</span></Link>
        <nav className={`main-nav ${mobileMenu ? "nav-open" : ""}`}>
          <a href="#portfolio" onClick={() => setMobileMenu(false)}>{content.navPortfolio}</a><a href="#categorias" onClick={() => setMobileMenu(false)}>{content.navCategories}</a><a href="#processo" onClick={() => setMobileMenu(false)}>{content.navProcess}</a>
          <a className="nav-contact" href="#contato" onClick={() => setMobileMenu(false)}>{content.navContact} <ArrowUpRight size={15}/></a>
        </nav>
        <button className="mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label={mobileMenu ? "Fechar menu" : "Abrir menu"}>{mobileMenu ? <X/> : <Menu/>}</button>
      </header>

      <section className="hero">
        <div className="hero-grain"/>
        <div className="hero-content hero-intro">
          <p className="eyebrow light"><span className="status-dot"/> {content.heroEyebrow}</p>
          <h1>{content.heroTitleLine1}<br/>{content.heroTitleLine2} <em>{content.heroTitleEm}</em></h1>
          <p className="hero-lead">{content.heroLead}</p>
          <div className="hero-actions"><a href={content.heroPrimaryHref} className="button button-lime">{content.heroPrimaryLabel} <ArrowDownRight size={18}/></a><a href={content.heroSecondaryHref} className="text-link light-link">{content.heroSecondaryLabel} <ArrowRight size={16}/></a></div>
          <div className="hero-foot"><span>{content.heroFootLeft}</span><span>{content.heroFootRight}</span></div>
        </div>
        <div className="hero-visual hero-art" aria-label={content.heroCompositionAlt}>
          <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
          <div className="hero-sticker sticker-top" style={{ whiteSpace: "pre-line" }}>{content.heroStickerTop}</div>
          <div className="hero-product hero-product-main"><img src={content.heroMainImageUrl} alt={content.heroMainImageAlt}/><span>{content.heroMainImageLabel}</span></div>
          <div className="hero-product hero-product-small"><img src={content.heroSmallImageUrl} alt={content.heroSmallImageAlt}/><span>{content.heroSmallImageLabel}</span></div>
          <div className="hero-sticker sticker-bottom" style={{ whiteSpace: "pre-line" }}><Sparkles size={18}/> {content.heroStickerBottom}</div>
          <span className="hero-index">{content.heroIndex}</span>
        </div>
        <div className="hero-scroll">{content.heroScroll} <span>↓</span></div>
      </section>

      <section className="intro section-pad" id="categorias">
        <div className="section-kicker" data-reveal="up"><span>01</span><span>{content.introKicker}</span></div>
        <div className="intro-grid" data-reveal="up"><h2>{content.introTitleLine1}<br/>{content.introTitleLine2} <em>{content.introTitleEm}</em></h2><p>{content.introBody}</p></div>
        <div className="category-grid">
          {getSiteCategories(content).map((category, index) => <Link key={category.id} href={`/catalogo/?categoria=${encodeURIComponent(category.id)}`} className="category-card" data-reveal="up" style={{ backgroundColor: category.color, "--reveal-delay": `${index * 75}ms` } as CSSProperties}>
            <span className="category-number">{String(index + 1).padStart(2,"0")}</span><span className="category-icon">{categoryIcon(category.icon)}</span><span className="category-bottom"><strong>{category.name}</strong><small>{category.description}</small></span><ArrowUpRight className="category-arrow" size={20}/>
          </Link>)}
        </div>
        <p className="category-hint">{content.categoriesHint} <button onClick={() => {setActiveCategory("Todos"); document.getElementById("portfolio")?.scrollIntoView({behavior:"smooth"});}}>{content.categoriesSeeAll} ↗</button></p>
      </section>

      <section className="portfolio-section section-pad" id="portfolio">
        <div className="section-kicker" data-reveal="up"><span>02</span><span>{content.portfolioKicker}</span></div>
        <div className="portfolio-heading" data-reveal="up"><h2>{content.portfolioTitleLine1}<br/><em>{content.portfolioTitleEm}</em></h2><p>{content.portfolioBody}</p></div>
        <div className="portfolio-tools" data-reveal="up"><div className="filter-list">{["Todos", ...getSiteCategories(content).map((category) => category.id)].map((id) => { const category = getSiteCategories(content).find((item) => item.id === id); const label = id === "Todos" ? content.categoryAll : category?.name ?? id; return <button key={id} className={activeCategory === id ? "filter active" : "filter"} onClick={() => setActiveCategory(id)}>{label}</button>; })}</div><label className="search-box"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={content.searchPlaceholder} aria-label={content.searchPlaceholder}/></label></div>
        <div className="product-grid">
          {filtered.map((p, i) => <article className={`product-card card-${i % 3}`} key={p.id} data-reveal="up" style={{ "--reveal-delay": `${(i % 6) * 65}ms` } as CSSProperties}>
            <Link href={`/projeto/?slug=${encodeURIComponent(p.slug)}`} className="product-image-link"><div className="product-image-wrap"><img src={p.images?.[0] || p.image} alt={p.title} loading="lazy"/><span className="product-tag">{p.tag}</span><span className="product-view">{content.productViewLabel} <ArrowUpRight size={16}/></span></div></Link>
            <div className="product-info"><div><span className="product-category">{categoryLabel(content, p.category)}</span><h3><Link href={`/projeto/?slug=${encodeURIComponent(p.slug)}`}>{p.title}</Link></h3><strong className="product-price">{p.price && p.price > 0 ? p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Preço sob consulta"}</strong></div><div className="product-card-actions"><button className="round-arrow" aria-label={`Adicionar ${p.title} ao carrinho`} onClick={() => window.dispatchEvent(new CustomEvent("3dr-cart-add", { detail: p }))}><ShoppingBag size={17}/></button><Link href={`/projeto/?slug=${encodeURIComponent(p.slug)}`} className="round-arrow" aria-label={`Ver ${p.title}`}><ArrowUpRight size={18}/></Link></div></div>
          </article>)}
        </div>
        {filtered.length === 0 && <div className="empty-state"><Search size={26}/><h3>{content.emptyTitle}</h3><p>{content.emptyBody}</p><button className="button button-dark" onClick={() => {setSearch("");setActiveCategory("Todos");}}>{content.emptyButton}</button></div>}
        <div className="portfolio-bottom"><span>{content.portfolioCountPrefix} {filtered.length.toString().padStart(2,"0")} {content.portfolioCountWord}</span><span>{content.portfolioCountSuffix}</span></div>
      </section>

      <section className="manifesto">
        <div className="manifesto-shape shape-a"/><div className="manifesto-shape shape-b"/>
        <div className="manifesto-inner" data-reveal="up"><p className="eyebrow light">{content.manifestoEyebrow}</p><h2>{content.manifestoTitleLine1}<br/>{content.manifestoTitleLine2} <em>{content.manifestoTitleEm}</em></h2><p>{content.manifestoBody}</p><a href={content.manifestoButtonHref} className="button button-lime">{content.manifestoButton} <ArrowUpRight size={18}/></a></div>
        <div className="manifesto-side">{content.manifestoSide}</div>
      </section>

      <section className="process-section section-pad" id="processo">
        <div className="section-kicker" data-reveal="up"><span>03</span><span>{content.processKicker}</span></div>
        <div className="process-heading" data-reveal="up"><h2>{content.processTitleLine1}<br/><em>{content.processTitleLine2}</em></h2></div>
        <div className="process-grid">
          {[1, 2, 3, 4].map((step) => <div className="process-step" key={step} data-reveal="up" style={{ "--reveal-delay": `${(step - 1) * 90}ms` } as CSSProperties}><span>{String(step).padStart(2, "0")}</span><div className="step-line"/><h3>{content[`process${step}Title`]}</h3><p>{content[`process${step}Body`]}</p></div>)}
        </div>
      </section>

      <section className="contact-section section-pad" id="contato">
        <div className="section-kicker" data-reveal="up"><span>04</span><span>{content.contactKicker}</span></div>
        <div className="contact-grid" data-reveal="up"><div className="contact-copy"><h2>{content.contactTitleLine1}<br/>{content.contactTitleLine2} <em>{content.contactTitleEm}</em></h2><p>{content.contactBody}</p><div className="contact-note"><Send size={18}/><span>{content.contactNote}</span></div></div>
          <div className="contact-whatsapp" data-reveal="up">
            <a className="button button-dark quote-whatsapp-button" href={`https://wa.me/5521995144189?text=${encodeURIComponent("Olá! Gostaria de solicitar um orçamento para um produto personalizado.")}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={20}/> Solicitar orçamento pelo WhatsApp <ArrowUpRight size={18}/>
            </a>
          </div>
        </div>
      </section>

      <ShoppingCart/><footer className="footer"><Link href="/" className="brand"><span className="brand-mark">{content.siteInitial}</span> {content.siteName}<span className="brand-dot">.</span></Link><span>{content.footerTagline}</span><a href="#top" onClick={(e) => {e.preventDefault();window.scrollTo({top:0,behavior:"smooth"});}}>{content.footerTop} ↑</a><span className="copyright">{content.footerCopyright}</span></footer>
    </main>
  );
}
