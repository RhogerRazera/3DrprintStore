"use client";

/* eslint-disable @next/next/no-img-element -- Product photos come from administrator-entered URLs, so their hosts are not fixed. */
import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { User, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { ArrowLeft, Copy, LogOut, PackagePlus, Palette, Plus, Save, Trash2 } from "lucide-react";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { calculateKitStock, calculateKitValue, defaultProductColors, normalizeProduct, Product, ProductCategory, ProductColorOption, ProductVariant } from "@/lib/products";
import { categoryLabel, contentFields, defaultSiteContent, getSiteCategories, mergeSiteContent, SiteContent } from "@/lib/site-content";

type Inquiry = { id: string; name: string; email: string; category: string; details: string; status: string; createdAt?: { toDate: () => Date } };
type StoreOrder = { id: string; status: "pending" | "confirmed" | "cancelled"; items: { productId: string; variantId?: string; quantity: number }[]; stockDeductions?: { productId: string; variantId?: string; quantity: number }[]; createdAt?: { toDate: () => Date } };
const materialOptions = ["PETG", "PLA", "PETG ou PLA"] as const;
const normalizeMaterial = (material: string) => {
  if (materialOptions.includes(material as typeof materialOptions[number])) return material;
  const value = material.toLocaleUpperCase("pt-BR");
  const hasPetg = value.includes("PETG"); const hasPla = value.includes("PLA");
  return hasPetg && hasPla ? "PETG ou PLA" : hasPetg ? "PETG" : hasPla ? "PLA" : "";
};
const blankProduct: Omit<Product, "id"> = { slug: "", title: "", category: "Mascotes", description: "", material: "", colors: [], variants: [], stock: undefined, image: "", images: ["", "", ""], tag: "Personalizável", featured: false, published: true, price: undefined, kind: "product" };
const blankKit: Omit<Product, "id"> = { ...blankProduct, kind: "kit", tag: "KIT PROMOCIONAL", kitComponents: [], compareAtPrice: 0 };
const describeError = (error: unknown, fallback: string) => error instanceof Error ? `${fallback} (${error.message})` : fallback;

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"content" | "products" | "categories" | "inquiries" | "orders">("content");
  const [products, setProducts] = useState<Product[]>([]);
  const [productColors, setProductColors] = useState<ProductColorOption[]>(defaultProductColors);
  const [productCategory, setProductCategory] = useState("Todos");
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<Product, "id">>(blankProduct);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [categoryDraft, setCategoryDraft] = useState<ProductCategory>({ id: "", name: "", description: "", color: "#d8fa49", icon: "shape" });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [kitEditorOpen, setKitEditorOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<Product | null>(null);
  const [kitDraft, setKitDraft] = useState<Omit<Product, "id">>(blankKit);
  const [kitSearch, setKitSearch] = useState("");
  const [colorManagerOpen, setColorManagerOpen] = useState(false);
  const [colorDraft, setColorDraft] = useState<ProductColorOption>({ id: "", name: "", hex: "#000000", active: true, custom: true });
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const productEditorRef = useRef<HTMLFormElement>(null);
  const categoryEditorRef = useRef<HTMLFormElement>(null);
  const kitEditorRef = useRef<HTMLFormElement>(null);
  const categoryList = getSiteCategories(content);

  useEffect(() => {
    const editor = editorOpen ? productEditorRef.current : categoryEditorOpen ? categoryEditorRef.current : kitEditorOpen ? kitEditorRef.current : null;
    if (editor) requestAnimationFrame(() => editor.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [editorOpen, categoryEditorOpen, kitEditorOpen]);

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
    const [snapshot, colorSnapshot] = await Promise.all([
      getDocs(query(collection(db, "products"), orderBy("title"))),
      getDocs(collection(db, "productColors")),
    ]);
    const nextProducts = snapshot.docs.map((item) => normalizeProduct(item.id, item.data()));
    setProducts(nextProducts);
    const savedColors = colorSnapshot.docs.map((item) => ({ id: item.id, ...item.data(), custom: !defaultProductColors.some((base) => base.id === item.id) } as ProductColorOption));
    const savedById = new Map(savedColors.map((color) => [color.id, color]));
    setProductColors([
      ...defaultProductColors.map((color) => ({ ...color, ...(savedById.get(color.id) ?? {}) })),
      ...savedColors.filter((color) => !defaultProductColors.some((base) => base.id === color.id)),
    ]);
  }
  async function refreshInquiries() {
    if (!db) return;
    const snapshot = await getDocs(query(collection(db, "inquiries"), orderBy("createdAt", "desc")));
    setInquiries(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as Inquiry)));
  }
  async function refreshOrders() {
    if (!db) return;
    const snapshot = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
    setOrders(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as StoreOrder)));
  }
  async function refreshContent() {
    if (!db) return;
    const snapshot = await getDoc(doc(db, "siteContent", "home"));
    if (snapshot.exists()) setContent(mergeSiteContent(snapshot.data()));
  }

  useEffect(() => {
    if (!isAdmin) return;
    (tab === "content" || tab === "categories" ? refreshContent() : tab === "products" ? refreshProducts() : tab === "orders" ? refreshOrders() : refreshInquiries()).catch((reason: unknown) => setError(describeError(reason, "Falha ao carregar os dados")));
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
  function startNew() { setEditing(null); setDraft(blankProduct); setEditorOpen(true); setKitEditorOpen(false); setNotice(""); }
  function startEdit(product: Product) {
    const { id, ...fields } = product;
    const images = (product.images?.length ? product.images : [product.image]).slice(0, 3);
    while (images.length < 3) images.push("");
    const variants = product.variants?.length ? product.variants : product.colors.map((name) => {
      const option = productColors.find((color) => color.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"));
      return { colorId: option?.id ?? name.toLocaleLowerCase("pt-BR"), name, hex: option?.hex ?? "#808080", available: true };
    });
    setEditing({ id, ...fields });
    setDraft({ ...fields, kind: "product", variants, colors: variants.map((variant) => variant.name), material: normalizeMaterial(product.material), image: product.image, images });
    setEditorOpen(true); setKitEditorOpen(false); setNotice("");
  }

  function toggleProductVariant(color: ProductColorOption) {
    const current = draft.variants ?? [];
    const exists = current.some((variant) => variant.colorId === color.id);
    const variants = exists
      ? current.filter((variant) => variant.colorId !== color.id)
      : [...current, { colorId: color.id, name: color.name, hex: color.hex, available: true }];
    setDraft({ ...draft, variants, colors: variants.map((variant) => variant.name) });
  }

  function updateProductVariant(colorId: string, changes: Partial<ProductVariant>) {
    const variants = (draft.variants ?? []).map((variant) => variant.colorId === colorId ? { ...variant, ...changes } : variant);
    setDraft({ ...draft, variants, colors: variants.map((variant) => variant.name) });
  }

  function editColor(color: ProductColorOption) {
    setColorDraft({ ...color }); setEditingColorId(color.id); setColorManagerOpen(true); setError("");
  }

  async function toggleColorActive(color: ProductColorOption) {
    if (!db) return;
    const nextActive = !color.active;
    try {
      if (color.custom || defaultProductColors.some((item) => item.id === color.id)) {
        await setDoc(doc(db, "productColors", color.id), { ...color, active: nextActive, custom: true, updatedAt: serverTimestamp() }, { merge: true });
      }
      setNotice(nextActive ? `Cor ${color.name} ativada.` : `Cor ${color.name} desativada.`);
      await refreshProducts();
    } catch (reason) { setError(describeError(reason, "Não foi possível alterar a disponibilidade da cor")); }
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault(); if (!db) return;
    setBusy(true); setError("");
    const slug = draft.slug || draft.title.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { price, stock, ...productFields } = draft;
    const images = (draft.images ?? [draft.image]).map((url) => url.trim()).filter(Boolean).slice(0, 3);
    const variants = (draft.variants ?? []).filter((variant) => variant.available || variant.stock !== undefined).map((variant) => ({
      colorId: variant.colorId, name: variant.name, hex: variant.hex, available: variant.available,
      ...(variant.stock !== undefined ? { stock: variant.stock } : {}),
      ...(variant.priceAdjustment !== undefined ? { priceAdjustment: variant.priceAdjustment } : {}),
      ...(variant.image ? { image: variant.image } : {}),
    }));
    const payload = { ...productFields, kind: "product" as const, colors: variants.map((variant) => variant.name), variants, ...(stock !== undefined ? { stock } : {}), image: images[0] ?? draft.image, images, ...(price == null || Number.isNaN(price) ? {} : { price }), slug, updatedAt: serverTimestamp() };
    try {
      if (editing) await updateDoc(doc(db, "products", editing.id), payload);
      else await addDoc(collection(db, "products"), { ...payload, createdAt: serverTimestamp() });
      setEditing(null); setEditorOpen(false); setNotice("Produto salvo."); await refreshProducts();
    } catch (reason) { setError(describeError(reason, "Não foi possível salvar o produto")); }
    finally { setBusy(false); }
  }

  function startNewKit() {
    setEditingKit(null); setKitDraft(blankKit); setKitSearch(""); setEditorOpen(false); setKitEditorOpen(true); setNotice(""); setError("");
  }
  function startEditKit(kit: Product) {
    setEditingKit(kit); setKitDraft({ ...blankKit, ...kit, kind: "kit" }); setKitSearch(""); setEditorOpen(false); setKitEditorOpen(true); setNotice(""); setError("");
  }
  function duplicateKit(kit: Product) {
    setEditingKit(null); setKitDraft({ ...blankKit, ...kit, title: `${kit.title} (cópia)`, slug: "", published: false, kind: "kit" }); setKitSearch(""); setEditorOpen(false); setKitEditorOpen(true); setNotice(""); setError("");
  }
  function addKitComponent() {
    setKitDraft((current) => ({ ...current, kitComponents: [...(current.kitComponents ?? []), { productId: "", productTitle: "", quantity: 1 }] }));
  }
  function updateKitComponent(index: number, changes: Partial<NonNullable<Product["kitComponents"]>[number]>) {
    setKitDraft((current) => ({ ...current, kitComponents: (current.kitComponents ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }));
  }
  async function saveKit(event: FormEvent) {
    event.preventDefault(); if (!db) return;
    const components = (kitDraft.kitComponents ?? []).filter((item) => item.productId && Number.isInteger(item.quantity) && item.quantity > 0);
    if (components.length < 2) { setError("Adicione pelo menos dois produtos ao kit."); return; }
    const unknown = components.find((component) => !products.some((product) => product.id === component.productId && product.published && product.kind !== "kit"));
    if (unknown) { setError("Todos os itens do kit precisam ser produtos publicados existentes."); return; }
    const missingVariant = components.find((component) => {
      const product = products.find((item) => item.id === component.productId);
      return Boolean(product?.variants?.some((variant) => variant.available) && !component.variantId);
    });
    if (missingVariant) { setError("Selecione uma cor para cada produto do kit que tenha variações disponíveis."); return; }
    const originalPrice = calculateKitValue(components, products);
    const promoPrice = Number(kitDraft.price ?? 0);
    if (!Number.isFinite(promoPrice) || promoPrice <= 0 || originalPrice <= 0 || promoPrice > originalPrice) { setError("O preço promocional deve ser maior que zero e não pode superar o valor individual dos itens."); return; }
    const materializedComponents = components.map((component) => {
      const product = products.find((item) => item.id === component.productId)!;
      const variant = component.variantId ? product.variants?.find((item) => item.colorId === component.variantId) : undefined;
      return { ...component, productTitle: product.title, image: variant?.image ?? product.image, ...(variant ? { variantName: variant.name, variantHex: variant.hex } : {}) };
    });
    const slug = kitDraft.slug || kitDraft.title.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const kitFields = { ...kitDraft };
    delete kitFields.stock;
    const payload = { ...kitFields, kind: "kit" as const, tag: "KIT PROMOCIONAL", colors: [], variants: [], kitComponents: materializedComponents, compareAtPrice: originalPrice, price: promoPrice, slug, updatedAt: serverTimestamp() };
    setBusy(true); setError(""); setNotice("");
    try {
      if (editingKit) await updateDoc(doc(db, "products", editingKit.id), payload);
      else await addDoc(collection(db, "products"), { ...payload, createdAt: serverTimestamp() });
      setKitEditorOpen(false); setEditingKit(null); setKitDraft(blankKit); setNotice("Kit salvo."); await refreshProducts();
    } catch (reason) { setError(describeError(reason, "Não foi possível salvar o kit")); }
    finally { setBusy(false); }
  }

  async function saveColor(event: FormEvent) {
    event.preventDefault(); if (!db) return;
    const name = colorDraft.name.trim(); const hex = colorDraft.hex.toUpperCase();
    if (!name || !/^#[0-9A-F]{6}$/.test(hex)) { setError("Informe o nome e um código HEX válido."); return; }
    const id = editingColorId ?? name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (productColors.some((color) => color.id === id && color.id !== editingColorId)) { setError("Já existe uma cor com esse nome."); return; }
    try {
      await setDoc(doc(db, "productColors", id), { name, hex, active: colorDraft.active, custom: !defaultProductColors.some((color) => color.id === id), updatedAt: serverTimestamp() }, { merge: true });
      setColorDraft({ id: "", name: "", hex: "#000000", active: true, custom: true }); setEditingColorId(null); setNotice("Cor salva."); await refreshProducts();
    } catch (reason) { setError(describeError(reason, "Não foi possível salvar a cor")); }
  }
  async function removeColor(color: ProductColorOption) {
    if (!db || !color.custom) return;
    const referenced = products.some((product) => product.variants?.some((variant) => variant.colorId === color.id));
    try {
      if (referenced) {
        await updateDoc(doc(db, "productColors", color.id), { active: false, updatedAt: serverTimestamp() });
        setNotice("A cor está em uso; ela foi desativada e continua vinculada aos produtos existentes.");
      } else {
        await deleteDoc(doc(db, "productColors", color.id)); setNotice("Cor excluída.");
      }
      await refreshProducts();
    } catch (reason) { setError(describeError(reason, "Não foi possível remover a cor")); }
  }

  async function updateOrderStatus(order: StoreOrder, nextStatus: "confirmed" | "cancelled") {
    if (!db) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db!, "orders", order.id);
        const orderSnapshot = await transaction.get(orderRef);
        if (!orderSnapshot.exists()) throw new Error("Pedido não encontrado.");
        const liveOrder = orderSnapshot.data() as StoreOrder;
        if (nextStatus === "confirmed") {
          if (liveOrder.status !== "pending") throw new Error("Somente pedidos pendentes podem ser confirmados.");
          const productIds = new Set<string>();
          for (const line of liveOrder.items ?? []) {
            if (!line.productId || !Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("Pedido contém um item inválido.");
            productIds.add(line.productId);
          }
          const initialSnapshots = await Promise.all([...productIds].map((id) => transaction.get(doc(db!, "products", id))));
          const productData = new Map(initialSnapshots.map((snapshot, index) => [ [...productIds][index], snapshot.exists() ? snapshot.data() : null ]));
          const demand = new Map<string, { productId: string; variantId?: string; quantity: number }>();
          for (const line of liveOrder.items) {
            const data = productData.get(line.productId);
            if (!data || data.published !== true) throw new Error("Um produto do pedido não está mais disponível.");
            if (data.kind === "kit") {
              const components = Array.isArray(data.kitComponents) ? data.kitComponents as Product["kitComponents"] : [];
              if (!components || components.length < 2) throw new Error("Um kit do pedido está sem componentes válidos.");
              for (const component of components) {
                if (!component?.productId || !Number.isInteger(component.quantity) || component.quantity < 1) throw new Error("Componente de kit inválido.");
                const key = `${component.productId}::${component.variantId ?? ""}`;
                const existing = demand.get(key) ?? { productId: component.productId, ...(component.variantId ? { variantId: component.variantId } : {}), quantity: 0 };
                existing.quantity += component.quantity * line.quantity; demand.set(key, existing);
                productIds.add(component.productId);
              }
            } else {
              const key = `${line.productId}::${line.variantId ?? ""}`;
              const existing = demand.get(key) ?? { productId: line.productId, ...(line.variantId ? { variantId: line.variantId } : {}), quantity: 0 };
              existing.quantity += line.quantity; demand.set(key, existing);
            }
          }
          const missingComponentIds = [...productIds].filter((id) => !productData.has(id));
          const componentSnapshots = await Promise.all(missingComponentIds.map((id) => transaction.get(doc(db!, "products", id))));
          componentSnapshots.forEach((snapshot, index) => productData.set(missingComponentIds[index], snapshot.exists() ? snapshot.data() : null));
          const deductions: { productId: string; variantId?: string; quantity: number }[] = [];
          const updatedDocs = new Map<string, Record<string, unknown>>();
          for (const entry of demand.values()) {
            const data = updatedDocs.get(entry.productId) ?? productData.get(entry.productId);
            if (!data || data.published !== true) throw new Error("Um componente do pedido não está mais publicado.");
            const variants = Array.isArray(data.variants) ? [...data.variants as ProductVariant[]] : [];
            let stock: number | undefined;
            const nextData: Record<string, unknown> = { ...data };
            if (entry.variantId) {
              const index = variants.findIndex((variant) => variant.colorId === entry.variantId);
              if (index < 0 || variants[index].available === false) throw new Error("Uma variação selecionada foi desativada.");
              stock = variants[index].stock ?? (typeof data.stock === "number" ? data.stock : undefined);
              if (typeof variants[index].stock === "number") variants[index] = { ...variants[index], stock: variants[index].stock! - entry.quantity };
              else if (typeof data.stock === "number") nextData.stock = data.stock - entry.quantity;
              if (typeof variants[index].stock === "number" || typeof data.stock === "number") nextData.variants = variants;
            } else {
              if (variants.length > 0) throw new Error(`Selecione uma cor para ${String(data.title ?? "o produto")} antes de confirmar.`);
              stock = typeof data.stock === "number" ? data.stock : undefined;
              if (stock !== undefined) nextData.stock = stock - entry.quantity;
            }
            if (stock !== undefined && stock < entry.quantity) throw new Error(`Estoque insuficiente para ${String(data.title ?? "um produto do pedido")} (disponível: ${stock}).`);
            if (stock !== undefined) deductions.push({ productId: entry.productId, ...(entry.variantId ? { variantId: entry.variantId } : {}), quantity: entry.quantity });
            updatedDocs.set(entry.productId, nextData);
          }
          for (const [productId, data] of updatedDocs) transaction.update(doc(db!, "products", productId), data);
          transaction.update(orderRef, { status: "confirmed", stockDeductions: deductions, updatedAt: serverTimestamp() });
        } else {
          if (liveOrder.status === "cancelled") throw new Error("Este pedido já foi cancelado.");
          if (liveOrder.status === "confirmed") {
            const deductions = liveOrder.stockDeductions ?? [];
            const refs = [...new Set(deductions.map((item) => item.productId))].map((id) => doc(db!, "products", id));
            const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
            const dataById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot.exists() ? snapshot.data() : null]));
            for (const deduction of deductions) {
              const data = dataById.get(deduction.productId);
              if (!data) throw new Error("Um produto do pedido foi excluído; o cancelamento precisa de revisão manual do estoque.");
              const variants = Array.isArray(data.variants) ? [...data.variants as ProductVariant[]] : [];
              if (deduction.variantId) {
                const index = variants.findIndex((variant) => variant.colorId === deduction.variantId);
                if (index >= 0 && typeof variants[index].stock === "number") variants[index] = { ...variants[index], stock: variants[index].stock! + deduction.quantity };
                else if (typeof data.stock === "number") data.stock += deduction.quantity;
                if (index >= 0) data.variants = variants;
              } else if (typeof data.stock === "number") data.stock += deduction.quantity;
            }
            for (const [productId, data] of dataById) if (data) transaction.update(doc(db!, "products", productId), data);
          } else if (liveOrder.status !== "pending") throw new Error("Estado do pedido inválido.");
          transaction.update(orderRef, { status: "cancelled", updatedAt: serverTimestamp() });
        }
      });
      setNotice(nextStatus === "confirmed" ? "Pedido confirmado; o estoque disponível foi atualizado uma única vez." : "Pedido cancelado; o estoque foi restaurado quando necessário.");
      await Promise.all([refreshOrders(), refreshProducts()]);
    } catch (reason) { setError(describeError(reason, "Não foi possível atualizar o pedido")); }
    finally { setBusy(false); }
  }
  async function removeProduct(product: Product) {
    if (!db) return;
    if (products.some((kit) => kit.kind === "kit" && kit.kitComponents?.some((component) => component.productId === product.id))) {
      setError(`“${product.title}” faz parte de um kit. Remova-o dos kits antes de excluir o produto.`); return;
    }
    if (!window.confirm(`Excluir “${product.title}”?`)) return;
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
      <div className="admin-tabs"><button className={tab === "content" ? "selected" : ""} onClick={() => { setTab("content"); setError(""); }}>Landing page</button><button className={tab === "products" ? "selected" : ""} onClick={() => { setTab("products"); setError(""); }}>Produtos ({products.filter((p) => p.kind !== "kit").length})</button><button className={tab === "categories" ? "selected" : ""} onClick={() => { setTab("categories"); setError(""); }}>Categorias ({categoryList.length})</button><button className={tab === "orders" ? "selected" : ""} onClick={() => { setTab("orders"); setError(""); }}>Pedidos ({orders.filter((order) => order.status === "pending").length})</button><button className={tab === "inquiries" ? "selected" : ""} onClick={() => { setTab("inquiries"); setError(""); }}>Solicitações ({inquiries.length})</button></div>
      {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
      {tab === "content" && <form className="admin-content-editor" onSubmit={saveContent}><p>Edite textos, cores, imagens e mensagens da landing page e das páginas de produto. As mudanças ficam visíveis depois de salvar.</p>{Array.from(new Set(contentFields.map((field) => field.group))).map((group) => <fieldset className="admin-content-group" key={group}><legend>{group}</legend><div className="admin-fields">{contentFields.filter((field) => field.group === group).map((field) => <label className={field.kind === "textarea" ? "wide" : ""} key={field.key}>{field.label}{field.options ? <select value={content[field.key] ?? field.options[0].value} onChange={(e) => setContent({ ...content, [field.key]: e.target.value })}>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.kind === "textarea" ? <textarea rows={3} value={content[field.key] ?? ""} onChange={(e) => setContent({ ...content, [field.key]: e.target.value })}/> : <input type={field.kind === "url" ? "url" : field.kind === "color" ? "color" : "text"} required value={content[field.key] ?? ""} onChange={(e) => setContent({ ...content, [field.key]: e.target.value })}/>}</label>)}</div>{group === "Capa" && <div className="admin-image-editor"><h3>Fotos da capa</h3><p>Cole o endereço HTTPS direto da imagem. O endereço deve abrir a própria foto no navegador; links de páginas do Google Drive, Instagram ou redes sociais geralmente não funcionam como URL de imagem.</p><div className="admin-image-previews"><div><strong>Foto principal</strong><img src={content.heroMainImageUrl} alt={content.heroMainImageAlt || "Prévia da foto principal"} onError={(event) => { event.currentTarget.style.opacity = "0.25"; }}/><small>{content.heroMainImageUrl}</small></div><div><strong>Foto secundária</strong><img src={content.heroSmallImageUrl} alt={content.heroSmallImageAlt || "Prévia da foto secundária"} onError={(event) => { event.currentTarget.style.opacity = "0.25"; }}/><small>{content.heroSmallImageUrl}</small></div></div><button type="button" disabled={busy} className="button button-dark" onClick={saveCoverImages}><Save size={16}/>{busy ? "Salvando…" : "Salvar fotos da capa"}</button></div>}</fieldset>)}<button disabled={busy} className="button button-dark" type="submit"><Save size={16}/>{busy ? "Salvando…" : "Salvar alterações da página"}</button></form>}
      {tab === "categories" && <section className="category-manager"><div className="admin-toolbar"><span>{categoryList.length} categorias cadastradas</span><button className="button button-dark" type="button" onClick={startNewCategory}><Plus size={17}/> Nova categoria</button></div>
        <p>Crie categorias ou altere nome, descrição, cor e ícone. Renomear uma categoria mantém os produtos existentes vinculados a ela.</p>
        {categoryEditorOpen ? <form ref={categoryEditorRef} className="admin-editor" onSubmit={saveCategory}><div className="admin-editor-title"><h2>{editingCategoryId ? "Editar categoria" : "Nova categoria"}</h2><button type="button" onClick={() => { setCategoryEditorOpen(false); setEditingCategoryId(null); setError(""); }}>Cancelar</button></div><div className="admin-fields"><label>Nome<input required value={categoryDraft.name} onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })} placeholder="Ex.: Miniaturas"/></label><label>Cor do cartão<input type="color" value={categoryDraft.color} onChange={(e) => setCategoryDraft({ ...categoryDraft, color: e.target.value })}/></label><label className="wide">Descrição<textarea rows={2} value={categoryDraft.description} onChange={(e) => setCategoryDraft({ ...categoryDraft, description: e.target.value })} placeholder="Uma frase para apresentar esta categoria"/></label><label>Ícone<select value={categoryDraft.icon} onChange={(e) => setCategoryDraft({ ...categoryDraft, icon: e.target.value })}><option value="shape">Formas</option><option value="package">Pacote</option><option value="sparkles">Brilhos</option></select></label></div><button disabled={busy} className="button button-dark" type="submit"><Save size={16}/>{busy ? "Salvando…" : "Salvar categoria"}</button></form> : null}
        <div className="category-admin-list">{categoryList.map((category) => <article className="category-admin-card" key={category.id}><span className="category-color-swatch" style={{ backgroundColor: category.color }}/><div><h3>{category.name}</h3><p>{category.description}</p><small>ID: {category.id}</small></div><button type="button" onClick={() => startEditCategory(category)}>Editar</button></article>)}</div>
      </section>}
      {tab === "products" && <><div className="admin-toolbar"><span>{products.filter((p) => p.kind !== "kit").length} produtos · {products.filter((p) => p.kind === "kit").length} kits</span><div><label className="admin-category-filter">Catálogo<select value={productCategory} onChange={(e) => setProductCategory(e.target.value)}><option value="Todos">Todos</option>{categoryList.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><button className="button button-dark" onClick={startNew}><Plus size={17}/> Novo produto</button><button className="button button-dark" onClick={startNewKit}><PackagePlus size={17}/> Criar Kit</button><button className="admin-secondary" onClick={() => { setColorManagerOpen((value) => !value); setError(""); }}><Palette size={16}/> Gerenciar cores</button></div></div>
        {colorManagerOpen && <section className="color-manager"><div className="admin-editor-title"><h2>Gerenciar cores</h2><button type="button" onClick={() => { setColorManagerOpen(false); setEditingColorId(null); }}>Fechar</button></div><form className="color-create-form" onSubmit={saveColor}><label>Nome<input required value={colorDraft.name} onChange={(e) => setColorDraft({ ...colorDraft, name: e.target.value })}/></label><label>Seletor<input type="color" value={colorDraft.hex} onChange={(e) => setColorDraft({ ...colorDraft, hex: e.target.value.toUpperCase() })}/></label><label>Código HEX<input required pattern="^#[0-9A-Fa-f]{6}$" value={colorDraft.hex} onChange={(e) => setColorDraft({ ...colorDraft, hex: e.target.value.toUpperCase() })}/></label><span className="color-preview"><i style={{ backgroundColor: colorDraft.hex }}/> {colorDraft.name || "Prévia"}</span><button className="button button-dark" disabled={busy} type="submit"><Save size={16}/>{editingColorId ? "Salvar cor" : "Adicionar nova cor"}</button>{editingColorId && <button type="button" className="admin-secondary" onClick={() => { setColorDraft({ id: "", name: "", hex: "#000000", active: true, custom: true }); setEditingColorId(null); }}>Cancelar edição</button>}</form><div className="color-admin-list">{productColors.map((color) => <article key={color.id}><i style={{ backgroundColor: color.hex }}/><span>{color.name} <small>{color.hex} · {color.active ? "ativa" : "inativa"}</small></span><div><button type="button" onClick={() => editColor(color)}>Editar</button><button type="button" onClick={() => toggleColorActive(color)}>{color.active ? "Desativar" : "Ativar"}</button>{color.custom && <button type="button" onClick={() => removeColor(color)}><Trash2 size={14}/> Excluir</button>}</div></article>)}</div></section>}
        {editorOpen && <form ref={productEditorRef} className="admin-editor" onSubmit={saveProduct}><div className="admin-editor-title"><h2>{editing ? "Editar produto" : "Novo produto"}</h2><button type="button" onClick={() => { setEditorOpen(false); setEditing(null); }}>Fechar</button></div><div className="admin-fields"><label>Título<input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}/></label><label>Slug URL<input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="gerado a partir do título"/></label><label>Categoria<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{categoryList.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Preço (R$)<input type="number" min="0" step="0.01" value={draft.price ?? ""} onChange={(e) => setDraft({ ...draft, price: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="Deixe vazio para preço sob consulta"/></label><label>Estoque geral (opcional)<input type="number" min="0" step="1" value={draft.stock ?? ""} onChange={(e) => setDraft({ ...draft, stock: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="Vazio = produção sob encomenda"/></label><label>Etiqueta<input value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })}/></label><label className="wide">Descrição<textarea required rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}/></label><fieldset className="admin-product-images wide"><legend>Fotos do produto (até 3 URLs)</legend><p>A primeira foto será usada nos cartões. As fotos preenchidas aparecem no carrossel da página do produto.</p><div className="admin-product-image-fields">{[0, 1, 2].map((imageIndex) => { const url = draft.images?.[imageIndex] ?? (imageIndex === 0 ? draft.image : ""); return <label key={imageIndex}>Imagem {imageIndex + 1} — URL<input required={imageIndex === 0} type="url" value={url} onChange={(e) => { const images = [...(draft.images ?? [draft.image, "", ""])]; images[imageIndex] = e.target.value; setDraft({ ...draft, image: images[0], images }); }}/>{url && <img className="admin-product-image-preview" src={url} alt={`Prévia da imagem ${imageIndex + 1}`}/>}</label>; })}</div></fieldset><label>Material<select required value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })}><option value="">Selecione o material</option>{materialOptions.map((material) => <option key={material} value={material}>{material}</option>)}</select></label><fieldset className="variant-admin-fieldset wide"><legend>Cores e variações</legend><p>Selecione as cores disponíveis. Cada variação pode ter estoque, adicional de preço, imagem e disponibilidade próprios.</p><div className="variant-admin-grid">{productColors.map((color) => { const variant = (draft.variants ?? []).find((item) => item.colorId === color.id); return <article key={color.id} className={variant ? "variant-admin-card selected" : "variant-admin-card"}><label className="variant-admin-select"><input type="checkbox" checked={Boolean(variant)} onChange={() => toggleProductVariant(color)}/><i style={{ backgroundColor: color.hex }}/><span>{color.name}{!color.active && <small> · inativa</small>}</span></label>{variant && <div className="variant-admin-options"><label>Estoque<input type="number" min="0" step="1" value={variant.stock ?? ""} placeholder="Sem limite" onChange={(e) => updateProductVariant(color.id, { stock: e.target.value === "" ? undefined : Number(e.target.value) })}/></label><label>Adicional R$<input type="number" step="0.01" value={variant.priceAdjustment ?? ""} placeholder="0,00" onChange={(e) => updateProductVariant(color.id, { priceAdjustment: e.target.value === "" ? undefined : Number(e.target.value) })}/></label><label className="variant-image-field">Imagem da variação — URL<input type="url" value={variant.image ?? ""} onChange={(e) => updateProductVariant(color.id, { image: e.target.value })}/></label><label className="admin-checkbox"><input type="checkbox" checked={variant.available} onChange={(e) => updateProductVariant(color.id, { available: e.target.checked })}/> Disponível para compra</label></div>}</article>; })}</div><button type="button" className="admin-secondary" onClick={() => { setColorManagerOpen(true); setColorDraft({ id: "", name: "", hex: "#000000", active: true, custom: true }); setEditingColorId(null); }}>+ Adicionar nova cor</button></fieldset><label className="admin-checkbox"><input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })}/> Publicado no catálogo</label></div><button disabled={busy} className="button button-dark" type="submit"><Save size={16}/>{busy ? "Salvando…" : "Salvar produto"}</button></form>}
        {kitEditorOpen && <form ref={kitEditorRef} className="admin-editor kit-editor" onSubmit={saveKit}><div className="admin-editor-title"><h2>{editingKit ? "Editar kit" : "Criar kit"}</h2><button type="button" onClick={() => { setKitEditorOpen(false); setEditingKit(null); }}>Fechar</button></div><div className="admin-fields"><label>Título do kit<input required value={kitDraft.title} onChange={(e) => setKitDraft({ ...kitDraft, title: e.target.value })}/></label><label>Slug<input value={kitDraft.slug} onChange={(e) => setKitDraft({ ...kitDraft, slug: e.target.value })} placeholder="gerado automaticamente"/></label><label>Categoria<select value={kitDraft.category} onChange={(e) => setKitDraft({ ...kitDraft, category: e.target.value })}>{categoryList.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Preço promocional R$<input required type="number" min="0.01" step="0.01" value={kitDraft.price ?? ""} onChange={(e) => setKitDraft({ ...kitDraft, price: e.target.value === "" ? undefined : Number(e.target.value) })}/></label><label className="wide">Descrição<textarea required rows={3} value={kitDraft.description} onChange={(e) => setKitDraft({ ...kitDraft, description: e.target.value })}/></label><label className="wide">Imagem principal — URL<input required type="url" value={kitDraft.image} onChange={(e) => setKitDraft({ ...kitDraft, image: e.target.value, images: [e.target.value] })}/>{kitDraft.image && <img className="admin-product-image-preview" src={kitDraft.image} alt="Prévia do kit"/>}</label><label className="admin-checkbox"><input type="checkbox" checked={kitDraft.published} onChange={(e) => setKitDraft({ ...kitDraft, published: e.target.checked })}/> Kit publicado na loja</label></div><fieldset className="kit-components-editor"><legend>Produtos incluídos</legend><label className="kit-search">Buscar por nome, categoria ou código<input type="search" value={kitSearch} onChange={(e) => setKitSearch(e.target.value)} placeholder="Nome, categoria, slug ou ID"/></label>{(kitDraft.kitComponents ?? []).map((component, index) => { const selected = products.find((product) => product.id === component.productId); const options = products.filter((product) => product.kind !== "kit" && (product.title + " " + product.category + " " + product.slug + " " + product.id).toLocaleLowerCase("pt-BR").includes(kitSearch.toLocaleLowerCase("pt-BR"))); const kitStock = selected ? (selected.variants?.length ? selected.variants.filter((variant) => variant.available).reduce((min, variant) => Math.min(min, variant.stock ?? selected.stock ?? Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY) : selected.stock) : undefined; return <article className="kit-component-row" key={index}><img src={selected?.image || component.image || ""} alt=""/><div className="kit-component-fields"><label>Produto<select required value={component.productId} onChange={(e) => { const product = products.find((item) => item.id === e.target.value); updateKitComponent(index, { productId: e.target.value, productTitle: product?.title ?? "", variantId: undefined, variantName: undefined, variantHex: undefined, image: product?.image }); }}><option value="">Selecione produto existente</option>{options.map((product) => <option key={product.id} value={product.id}>{product.title} · {categoryLabel(content, product.category)} · {product.price ? product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Sob consulta"} · estoque {product.stock ?? "sob encomenda"}</option>)}</select></label>{selected?.variants?.some((variant) => variant.available) && <label>Variação<select required value={component.variantId ?? ""} onChange={(e) => { const variant = selected.variants?.find((item) => item.colorId === e.target.value); updateKitComponent(index, { variantId: variant?.colorId, variantName: variant?.name, variantHex: variant?.hex, image: variant?.image ?? selected.image }); }}><option value="">Escolha uma cor fixa</option>{selected.variants.filter((variant) => variant.available).map((variant) => <option key={variant.colorId} value={variant.colorId}>{variant.name} · estoque {variant.stock ?? selected.stock ?? "sob encomenda"}</option>)}</select></label>}<label>Quantidade<input type="number" min="1" step="1" value={component.quantity} onChange={(e) => updateKitComponent(index, { quantity: Number(e.target.value) })}/></label><small>{selected?.price ? `Subtotal: ${((selected.price + (selected.variants?.find((variant) => variant.colorId === component.variantId)?.priceAdjustment ?? 0)) * component.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "Preço não definido"} · {kitStock === undefined ? "estoque sob encomenda" : `até ${Math.floor(kitStock / component.quantity)} kit(s)`}</small></div><button type="button" className="admin-secondary" aria-label="Remover produto do kit" onClick={() => setKitDraft((current) => ({ ...current, kitComponents: (current.kitComponents ?? []).filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={16}/></button></article>; })}<button type="button" className="admin-secondary" onClick={addKitComponent}><Plus size={16}/> Adicionar produto</button><div className="kit-preview"><strong>Valor individual: {calculateKitValue(kitDraft.kitComponents ?? [], products).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><span>Preço do kit: {(Number(kitDraft.price) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span><b>Economia: {Math.max(0, calculateKitValue(kitDraft.kitComponents ?? [], products) - (Number(kitDraft.price) || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ({calculateKitValue(kitDraft.kitComponents ?? [], products) ? Math.max(0, Math.round((calculateKitValue(kitDraft.kitComponents ?? [], products) - (Number(kitDraft.price) || 0)) / calculateKitValue(kitDraft.kitComponents ?? [], products) * 100)) : 0}%)</b></div></fieldset><button disabled={busy} className="button button-dark" type="submit"><Save size={16}/>{busy ? "Salvando…" : "Salvar kit"}</button></form>}
        <h2 className="admin-section-title">Produtos individuais</h2><div className="admin-product-list">{products.filter((p) => p.kind !== "kit" && (productCategory === "Todos" || p.category === productCategory)).map((p) => <article key={p.id} className="admin-product"><img src={p.image} alt=""/><div><span>{categoryLabel(content, p.category)} · {p.published ? "Publicado" : "Rascunho"}</span><h3>{p.title}</h3><small>/{p.slug} · {p.price && p.price > 0 ? p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Preço sob consulta"} · estoque {p.stock ?? "sob encomenda"}</small></div><div className="admin-actions"><button onClick={() => startEdit(p)}>Editar</button><button aria-label={`Excluir ${p.title}`} onClick={() => removeProduct(p)}><Trash2 size={16}/></button></div></article>)}</div>
        <h2 className="admin-section-title">Kits promocionais</h2><div className="admin-product-list">{products.filter((p) => p.kind === "kit" && (productCategory === "Todos" || p.category === productCategory)).map((p) => <article key={p.id} className="admin-product"><img src={p.image} alt=""/><div><span>KIT PROMOCIONAL · {p.published ? "Publicado" : "Desativado"} · estoque {calculateKitStock(p.kitComponents ?? [], products) ?? "sob encomenda"}</span><h3>{p.title}</h3><small>{p.compareAtPrice?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} → {p.price?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</small></div><div className="admin-actions"><button onClick={() => startEditKit(p)}>Editar</button><button aria-label={`Duplicar ${p.title}`} onClick={() => duplicateKit(p)}><Copy size={15}/></button><button aria-label={`Excluir ${p.title}`} onClick={() => removeProduct(p)}><Trash2 size={16}/></button></div></article>)}</div>
      </>}
      {tab === "orders" && <div className="inquiry-list">{orders.length === 0 ? <p className="admin-empty">Ainda não há pedidos iniciados pelo carrinho.</p> : orders.map((order) => <article className="inquiry-card order-card" key={order.id}><header><div><span>Pedido {order.id.slice(0, 8)} · {order.status === "pending" ? "Aguardando confirmação" : order.status === "confirmed" ? "Confirmado" : "Cancelado"}</span><h2>{order.items.length} {order.items.length === 1 ? "item" : "itens"}</h2></div><small>{order.createdAt?.toDate?.().toLocaleString("pt-BR") ?? "Data não disponível"}</small></header><ul>{order.items.map((line, index) => { const item = products.find((product) => product.id === line.productId); const variant = item?.variants?.find((entry) => entry.colorId === line.variantId); return <li key={line.productId + index}>{line.quantity} × {item?.title ?? "Produto removido"}{variant ? ` — ${variant.name}` : ""}</li>; })}</ul><div className="admin-actions">{order.status === "pending" && <button disabled={busy} onClick={() => updateOrderStatus(order, "confirmed")}>Confirmar e baixar estoque</button>}{order.status !== "cancelled" && <button disabled={busy} onClick={() => updateOrderStatus(order, "cancelled")}>Cancelar pedido{order.status === "confirmed" ? " e restaurar estoque" : ""}</button>}</div><p className="order-note">A confirmação baixa o estoque em uma operação protegida contra confirmação duplicada. O checkout continua sendo concluído pelo WhatsApp.</p></article>)}</div>}
      {tab === "inquiries" && <div className="inquiry-list">{inquiries.length === 0 ? <p className="admin-empty">Ainda não há solicitações recebidas.</p> : inquiries.map((item) => <article className="inquiry-card" key={item.id}><header><div><span>{item.category} · {item.status === "new" ? "Nova" : "Em atendimento"}</span><h2>{item.name}</h2><a href={`mailto:${encodeURIComponent(item.email)}`}>{item.email}</a></div><select aria-label={`Status de ${item.name}`} value={item.status} onChange={(e) => updateInquiryStatus(item, e.target.value)}><option value="new">Nova</option><option value="in-progress">Em atendimento</option><option value="done">Concluída</option></select></header><p>{item.details}</p><small>{item.createdAt?.toDate().toLocaleString("pt-BR") ?? "Data não disponível"}</small></article>)}</div>}
    </section>
  </main>;
}

