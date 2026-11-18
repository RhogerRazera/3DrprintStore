"use client";
/* eslint-disable @next/next/no-img-element -- Product photos come from administrator-entered URLs, so their hosts are not fixed. */

import { useState, useEffect, CSSProperties } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Menu, X, Sparkles, Package, Shapes, Send, MessageCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { defaultSiteContent, getSiteCategories, mergeSiteContent, SiteContent } from "@/lib/site-content";

function categoryIcon(icon: string) {
  if (icon === "package") return <Package/>;
  if (icon === "sparkles") return <Sparkles/>;
  return <Shapes/>;
}

export default function HomePage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);

  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, "siteContent", "home")).then((snapshot) => {
      if (snapshot.exists()) setContent(mergeSiteContent(snapshot.data()));
    }).catch(() => { /* Mantém o conteúdo padrão se o documento não puder ser lido. */ });
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
  }, []);

  useEffect(() => {
    document.title = content.siteTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", content.siteDescription);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", content.siteTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", content.siteDescription);
  }, [content.siteTitle, content.siteDescription]);



  return (
    <main style={{ "--paper": content.colorPaper, "--ink": content.colorInk, "--lime": content.colorLime, color: content.colorInk, backgroundColor: content.colorPaper } as CSSProperties}>
      <header className="site-header">
        <Link href="/" className="brand" aria-label={`${content.siteName} página inicial`}><span className="brand-mark">{content.siteInitial}</span> {content.siteName}<span className="brand-dot">.</span></Link>
        <nav className={`main-nav ${mobileMenu ? "nav-open" : ""}`}>
          <a href="#categorias" onClick={() => setMobileMenu(false)}>{content.navCategories}</a><a href="#processo" onClick={() => setMobileMenu(false)}>{content.navProcess}</a>
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
          <div className="hero-product hero-product-main">{content.heroMainImageUrl && <><img src={content.heroMainImageUrl} alt={content.heroMainImageAlt}/><span>{content.heroMainImageLabel}</span></>}</div>
          <div className="hero-product hero-product-small">{content.heroSmallImageUrl && <><img src={content.heroSmallImageUrl} alt={content.heroSmallImageAlt}/><span>{content.heroSmallImageLabel}</span></>}</div>
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
        <p className="category-hint">{content.categoriesHint} <Link href="/catalogo/">{content.categoriesSeeAll} ↗</Link></p>
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

      <footer className="footer"><Link href="/" className="brand"><span className="brand-mark">{content.siteInitial}</span> {content.siteName}<span className="brand-dot">.</span></Link><span>{content.footerTagline}</span><a href="#top" onClick={(e) => {e.preventDefault();window.scrollTo({top:0,behavior:"smooth"});}}>{content.footerTop} ↑</a><span className="copyright">{content.footerCopyright}</span></footer>
    </main>
  );
}
