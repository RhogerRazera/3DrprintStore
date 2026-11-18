"use client";

/* eslint-disable @next/next/no-img-element -- Product photos come from administrator-entered URLs, so their hosts are not fixed. */
import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { User, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { ArrowLeft, LogOut, Plus, Save, Trash2 } from "lucide-react";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { normalizeProduct, Product, ProductCategory } from "@/lib/products";
import { categoryLabel, contentFields, defaultSiteContent, getSiteCategories, mergeSiteContent, SiteContent } from "@/lib/site-content";

type Inquiry = { id: string; name: string; email: string; category: string; details: string; status: string; createdAt?: { toDate: () => Date } };
const materialOptions = ["PETG", "PLA", "PETG ou PLA"] as const;
const normalizeMaterial = (material: string) => {
  if (materialOptions.includes(material as typeof materialOptions[number])) return material;
  const value = material.toLocaleUpperCase("pt-BR");
  const hasPetg = value.includes("PETG"); const hasPla = value.includes("PLA");
  return hasPetg && hasPla ? "PETG ou PLA" : hasPetg ? "PETG" : hasPla ? "PLA" : "";
};
const blankProduct: Omit<Product, "id"> = { slug: "", title: "", category: "Mascotes", description: "", material: "", colors: [], image: "", images: ["", "", ""], tag: "Personalizável", featured: false, published: true, price: undefined };
const describeError = (error: unknown, fallback: string) => error instanceof Error ? `${fallback} (${error.message})` : fallback;

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"content" | "products" | "categories" | "inquiries">("content");
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategory, setProductCategory] = useState("Todos");
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<Product, "id">>(blankProduct);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [categoryDraft, setCategoryDraft] = useState<ProductCategory>({ id: "", name: "", description: "", color: "#d8fa49", icon: "shape" });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const categoryList = getSiteCategories(content);

  useEffect(() => {
    if (!auth || !db) { setChecking(false); return; }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsAdmin(nextUser?.email?.toLowerCase() === "3drprintstore@gmail.com" && nextUser.emailVerified);
      setChecking(false);
    });
  }, []);

  async function refreshProducts() {
    if (!db) return;
    const snapshot = await getDocs(query(collection(db, "products"), orderBy("title")));
    setProducts(snapshot.docs.map((item) => normalizeProduct(item.id, item.data())));
  }
  async function refreshInquiries() {
    if (!db) return;
    const snapshot = await getDocs(query(collection(db, "inquiries"), orderBy("createdAt", "desc")));
    setInquiries(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Inquiry)));
  }
  async function refreshContent() {
    if (!db) return;
    const snapshot = await getDoc(doc(db, "siteContent", "home"));
    if (snapshot.exists()) setContent(mergeSiteContent(snapshot.data()));
  }

  useEffect(() => {
    if (!isAdmin) return;
    (tab === "content" || tab === "categories" ? refreshContent() : tab === "products" ? refreshProducts() : refreshInquiries()).catch((reason: unknown) => setError(describeError(reason, "Falha ao carregar os dados")));
  }, [isAdmin, tab]);

  async function login(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (reason) { setError(describeError(reason, "Não foi possível entrar com Google")); }
  }
  async function saveContent(event: FormEvent) {
    event.preventDefault(); if (!db) return;
    setBusy(true); setError("");
    try {
      await setDoc(doc(db, "siteContent", "home"), { ...content, updatedAt: serverTimestamp() }, { merge: true });
      setNotice("Conteúdo da landing page salvo.");
    } catch (reason) { setError(describeError(reason, "Não foi possível salvar o conteúdo")); }
    finally { setBusy(false); }
  }
  async function saveCoverImages() {
    if (!db) { setError("O Firebase não está conectado."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await setDoc(doc(db, "siteContent", "home"), {
        heroMainImageUrl: content.heroMainImageUrl,
        heroMainImageAlt: content.heroMainImageAlt,
        heroMainImageLabel: content.heroMainImageLabel,
        heroSmallImageUrl: content.heroSmallImageUrl,
        heroSmallImageAlt: content.heroSmallImageAlt,
        heroSmallImageLabel: content.heroSmallImageLabel,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setNotice("Fotos da capa salvas. Atualize a página inicial para conferir.");
    } catch (reason) { setError(describeError(reason, "Não foi possível salvar as fotos. Confira se você entrou com 3drprintstore@gmail.com.")); }
    finally { setBusy(false); }
  }
  function startNew() { setEditing(null); setDraft(blankProduct); setEditorOpen(true); setNotice(""); }
  function startEdit(product: Product) { const { id, ...fields } = product; const images = (product.images?.length ? product.images : [product.image]).slice(0, 3); while (images.length < 3) images.push(""); setEditing({ id, ...fields }); setDraft({ ...fields, material: normalizeMaterial(product.material), image: product.image, images }); setEditorOpen(true); setNotice(""); }

  async function saveProduct(event: FormEvent) {
    event.preventDefault(); if (!db) return;
    setBusy(true); setError("");
    const slug = draft.slug || draft.title.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { price, ...productFields } = draft;
    const images = (draft.images ?? [draft.image]).map((url) => url.trim()).filter(Boolean).slice(0, 3);
    const payload = { ...productFields, image: images[0] ?? draft.image, images, ...(price == null || Number.isNaN(price) ? {} : { price }), slug, updatedAt: serverTimestamp() };
    try {
      if (editing) await updateDoc(doc(db, "products", editing.id), payload);
      else await addDoc(collection(db, "products"), { ...payload, createdAt: serverTimestamp() });
      setEditing(null); setEditorOpen(false); setNotice("Produto salvo."); await refreshProducts();
    } catch (reason) { setError(describeError(reason, "Não foi possível salvar o produto")); }
    finally { setBusy(false); }
  }
  async function removeProduct(product: Product) {
    if (!db || !window.confirm(`Excluir “${product.title}”?`)) return;
    try { await deleteDoc(doc(db, "products", product.id)); await refreshProducts(); setNotice("Produto excluído."); }
    catch (reason) { setError(describeError(reason, "Não foi possível excluir o produto")); }
  }
  async function updateInquiryStatus(inquiry: Inquiry, status: string) {
    if (!db) return;
    try { await updateDoc(doc(db, "inquiries", inquiry.id), { status }); await refreshInquiries(); }
    catch (reason) { setError(describeError(reason, "Não foi possível atualizar a solicitação")); }
  }
  function startNewCategory() {
    setEditingCategoryId(null); setCategoryEditorOpen(true);
    setCategoryDraft({ id: "", name: "", description: "", color: "#d8fa49", icon: "shape" });
    setNotice(""); setError("");
  }
  function startEditCategory(category: ProductCategory) {
    setEditingCategoryId(category.id); setCategoryEditorOpen(true); setCategoryDraft({ ...category }); setNotice(""); setError("");
  }
  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!db) return;
    const cleanName = categoryDraft.name.trim();
    if (!cleanName) return;
    if (categoryList.some((item) => item.name.toLocaleLowerCase("pt-BR") === cleanName.toLocaleLowerCase("pt-BR") && item.id !== editingCategoryId)) {
      setError("Já existe uma categoria com esse nome."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      let id = editingCategoryId;
      if (!id) {
        const base = cleanName.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "categoria";
        id = base; let suffix = 2;
        while (categoryList.some((item) => item.id === id)) { id = `${base}-${suffix}`; suffix += 1; }
      }
      const next = editingCategoryId
        ? categoryList.map((item) => item.id === editingCategoryId ? { ...categoryDraft, id, name: cleanName } : item)
        : [...categoryList, { ...categoryDraft, id, name: cleanName }];
      const serialized = JSON.stringify(next);
      await setDoc(doc(db, "siteContent", "home"), { categoryItems: serialized, updatedAt: serverTimestamp() }, { merge: true });
      setContent((current) => ({ ...current, categoryItems: serialized }));
      setCategoryDraft({ id: "", name: "", description: "", color: "#d8fa49", icon: "shape" });
      setEditingCategoryId(null); setCategoryEditorOpen(false); setNotice(editingCategoryId ? "Categoria atualizada." : "Categoria adicionada.");
    } catch (reason) { setError(describeError(reason, "Não foi possível salvar a categoria")); }
    finally { setBusy(false); }
  }

  if (!firebaseConfigured) return <main className="admin-shell"><section className="admin-login"><Link href="/" className="back-link"><ArrowLeft size={16}/> Voltar ao site</Link><h1>Configure o Firebase</h1><p>Crie um projeto Firebase, registre um app Web e preencha as variáveis de <code>.env.local</code> com base no arquivo <code>.env.example</code>.</p></section></main>;
  if (checking) return <main className="admin-shell"><p>Verificando acesso…</p></main>;
  if (!user) return <main className="admin-shell"><section className="admin-login"><Link href="/" className="back-link"><ArrowLeft size={16}/> Voltar ao site</Link><span className="eyebrow">KRIATTO3D / ADMINISTRAÇÃO</span><h1>Painel administrativo</h1><p>Entre com a conta Google <strong>3drprintstore@gmail.com</strong> para editar o site.</p>{error && <p className="admin-error" role="alert">{error}</p>}<button className="button button-dark" type="button" onClick={login}>Continuar com Google ↗</button></section></main>;
  if (!isAdmin) return <main className="admin-shell"><section className="admin-login"><span className="eyebrow">ACESSO RESTRITO</span><h1>Conta sem permissão</h1><p>Esta conta ainda não foi cadastrada como administradora do projeto Firebase.</p><button className="button button-dark" onClick={() => auth && signOut(auth)}><LogOut size={16}/> Sair</button></section></main>;

  return <main className="admin-shell admin-dashboard"><header className="admin-top"><Link href="/" className="brand"><span className="brand-mark">K</span> Kriatto3D<span className="brand-dot">.</span></Link><span>{user.email}</span><button className="admin-logout" onClick={() => auth && signOut(auth)}><LogOut size={16}/> Sair</button></header>
    <section className="admin-content"><div className="admin-heading"><div><span className="eyebrow">ESPAÇO DE GESTÃO</span><h1>Painel administrativo</h1><p>Edite textos, imagens e cores da landing page; gerencie produtos, categorias e solicitações.</p></div></div>
      <div className="admin-tabs"><button className={tab === "content" ? "selected" : ""} onClick={() => { setTab("content"); setError(""); }}>Landing page</button><button className={tab === "products" ? "selected" : ""} onClick={() => { setTab("products"); setError(""); }}>Produtos ({products.length})</button><button className={tab === "categories" ? "selected" : ""} onClick={() => { setTab("categories"); setError(""); }}>Categorias ({categoryList.length})</button><button className={tab === "inquiries" ? "selected" : ""} onClick={() => { setTab("inquiries"); setError(""); }}>Solicitações ({inquiries.length})</button></div>
      {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
      {tab === "content" && <form className="admin-content-editor" onSubmit={saveContent}><p>Edite textos, cores, imagens e mensagens da landing page e das páginas de produto. As mudanças ficam visíveis depois de salvar.</p>{Array.from(new Set(contentFields.map((field) => field.group))).map((group) => <fieldset className="admin-content-group" key={group}><legend>{group}</legend><div className="admin-fields">{contentFields.filter((field) => field.group === group).map((field) => <label className={field.kind === "textarea" ? "wide" : ""} key={field.key}>{field.label}{field.options ? <select value={content[field.key] ?? field.options[0].value} onChange={(e) => setContent({ ...content, [field.key]: e.target.value })}>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.kind === "textarea" ? <textarea rows={3} value={content[field.key] ?? ""} onChange={(e) => setContent({ ...content, [field.key]: e.target.value })}/> : <input type={field.kind === "url" ? "url" : field.kind === "color" ? "color" : "text"} required value={content[field.key] ?? ""} onChange={(e) => setContent({ ...content, [field.key]: e.target.value })}/>}</label>)}</div>{group === "Capa" && <div className="admin-image-editor"><h3>Fotos da capa</h3><p>Cole o endereço HTTPS direto da imagem. O endereço deve abrir a própria foto no navegador; links de páginas do Google Drive, Instagram ou redes sociais geralmente não funcionam como URL de imagem.</p><div className="admin-image-previews"><div><strong>Foto principal</strong><img src={content.heroMainImageUrl} alt={content.heroMainImageAlt || "Prévia da foto principal"} onError={(event) => { event.currentTarget.style.opacity = "0.25"; }}/><small>{content.heroMainImageUrl}</small></div><div><strong>Foto secundária</strong><img src={content.heroSmallImageUrl} alt={content.heroSmallImageAlt || "Prévia da foto secundária"} onError={(event) => { event.currentTarget.style.opacity = "0.25"; }}/><small>{content.heroSmallImageUrl}</small></div></div><button type="button" disabled={busy} className="button button-dark" onClick={saveCoverImages}><Save size={16}/>{busy ? "Salvando…" : "Salvar fotos da capa"}</button></div>}</fieldset>)}<button disabled={busy} className="button button-dark" type="submit"><Save size={16}/>{busy ? "Salvando…" : "Salvar alterações da página"}</button></form>}
      {tab === "categories" && <section className="category-manager"><div className="admin-toolbar"><span>{categoryList.length} categorias cadastradas</span><button className="button button-dark" type="button" onClick={startNewCategory}><Plus size={17}/> Nova categoria</button></div>
        <p>Crie categorias ou altere nome, descrição, cor e ícone. Renomear uma categoria mantém os produtos existentes vinculados a ela.</p>
        {categoryEditorOpen ? <form className="admin-editor" onSubmit={saveCategory}><div className="admin-editor-title"><h2>{editingCategoryId ? "Editar categoria" : "Nova categoria"}</h2><button type="button" onClick={() => { setCategoryEditorOpen(false); setEditingCategoryId(null); setError(""); }}>Cancelar</button></div><div className="admin-fields"><label>Nome<input required value={categoryDraft.name} onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })} placeholder="Ex.: Miniaturas"/></label><label>Cor do cartão<input type="color" value={categoryDraft.color} onChange={(e) => setCategoryDraft({ ...categoryDraft, color: e.target.value })}/></label><label className="wide">Descrição<textarea rows={2} value={categoryDraft.description} onChange={(e) => setCategoryDraft({ ...categoryDraft, description: e.target.value })} placeholder="Uma frase para apresentar esta categoria"/></label><label>Ícone<select value={categoryDraft.icon} onChange={(e) => setCategoryDraft({ ...categoryDraft, icon: e.target.value })}><option value="shape">Formas</option><option value="package">Pacote</option><option value="sparkles">Brilhos</option></select></label></div><button disabled={busy} className="button button-dark" type="submit"><Save size={16}/>{busy ? "Salvando…" : "Salvar categoria"}</button></form> : null}
        <div className="category-admin-list">{categoryList.map((category) => <article className="category-admin-card" key={category.id}><span className="category-color-swatch" style={{ backgroundColor: category.color }}/><div><h3>{category.name}</h3><p>{category.description}</p><small>ID: {category.id}</small></div><button type="button" onClick={() => startEditCategory(category)}>Editar</button></article>)}</div>
      </section>}
      {tab === "products" && <><div className="admin-toolbar"><span>{products.length} produtos cadastrados</span><div><label className="admin-category-filter">Catálogo<select value={productCategory} onChange={(e) => setProductCategory(e.target.value)}><option value="Todos">Todos</option>{categoryList.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><button className="button button-dark" onClick={startNew}><Plus size={17}/> Novo produto</button></div></div>
        {editorOpen && <form className="admin-editor" onSubmit={saveProduct}><div className="admin-editor-title"><h2>{editing ? "Editar produto" : "Novo produto"}</h2><button type="button" onClick={() => { setEditorOpen(false); setEditing(null); }}>Fechar</button></div><div className="admin-fields"><label>Título<input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}/></label><label>Slug URL<input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="gerado a partir do título"/></label><label>Categoria<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{categoryList.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Preço (R$)<input type="number" min="0" step="0.01" value={draft.price ?? ""} onChange={(e) => setDraft({ ...draft, price: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="Deixe vazio para preço sob consulta"/></label><label>Etiqueta<input value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })}/></label><label className="wide">Descrição<textarea required rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}/></label><fieldset className="admin-product-images wide"><legend>Fotos do produto (até 3 URLs)</legend><p>A primeira foto será usada nos cartões. As fotos preenchidas aparecem no carrossel da página do produto.</p><div className="admin-product-image-fields">{[0, 1, 2].map((imageIndex) => { const url = draft.images?.[imageIndex] ?? (imageIndex === 0 ? draft.image : ""); return <label key={imageIndex}>Imagem {imageIndex + 1} — URL<input required={imageIndex === 0} type="url" value={url} onChange={(e) => { const images = [...(draft.images ?? [draft.image, "", ""])]; images[imageIndex] = e.target.value; setDraft({ ...draft, image: images[0], images }); }}/>{url && <img className="admin-product-image-preview" src={url} alt={`Prévia da imagem ${imageIndex + 1}`}/>}</label>; })}</div></fieldset><label>Material<select required value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })}><option value="">Selecione o material</option>{materialOptions.map((material) => <option key={material} value={material}>{material}</option>)}</select></label><label>Cores (separadas por vírgula)<input value={draft.colors.join(", ")} onChange={(e) => setDraft({ ...draft, colors: e.target.value.split(",").map((c) => c.trim()) })}/></label><label className="admin-checkbox"><input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })}/> Publicado no portfólio</label></div><button disabled={busy} className="button button-dark" type="submit"><Save size={16}/>{busy ? "Salvando…" : "Salvar produto"}</button></form>}
        <div className="admin-product-list">{products.filter((p) => productCategory === "Todos" || p.category === productCategory).map((p) => <article key={p.id} className="admin-product"><img src={p.image} alt=""/><div><span>{categoryLabel(content, p.category)} · {p.published ? "Publicado" : "Rascunho"}</span><h3>{p.title}</h3><small>/{p.slug} · {p.price && p.price > 0 ? p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Preço sob consulta"}</small></div><div className="admin-actions"><button onClick={() => startEdit(p)}>Editar</button><button aria-label={`Excluir ${p.title}`} onClick={() => removeProduct(p)}><Trash2 size={16}/></button></div></article>)}</div>
      </>}
      {tab === "inquiries" && <div className="inquiry-list">{inquiries.length === 0 ? <p className="admin-empty">Ainda não há solicitações recebidas.</p> : inquiries.map((item) => <article className="inquiry-card" key={item.id}><header><div><span>{item.category} · {item.status === "new" ? "Nova" : "Em atendimento"}</span><h2>{item.name}</h2><a href={`mailto:${encodeURIComponent(item.email)}`}>{item.email}</a></div><select aria-label={`Status de ${item.name}`} value={item.status} onChange={(e) => updateInquiryStatus(item, e.target.value)}><option value="new">Nova</option><option value="in-progress">Em atendimento</option><option value="done">Concluída</option></select></header><p>{item.details}</p><small>{item.createdAt?.toDate().toLocaleString("pt-BR") ?? "Data não disponível"}</small></article>)}</div>}
    </section>
  </main>;
}
