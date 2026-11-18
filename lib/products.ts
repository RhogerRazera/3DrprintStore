export type Product = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  material: string;
  colors: string[];
  image: string;
  images?: string[];
  tag: string;
  featured: boolean;
  price?: number;
  published?: boolean;
  kind?: "product" | "kit";
  stock?: number;
  variants?: ProductVariant[];
  kitComponents?: KitComponent[];
  compareAtPrice?: number;
};

export type ProductVariant = {
  colorId: string;
  name: string;
  hex: string;
  stock?: number;
  priceAdjustment?: number;
  image?: string;
  available: boolean;
};

export type KitComponent = {
  productId: string;
  productTitle: string;
  quantity: number;
  variantId?: string;
  variantName?: string;
  variantHex?: string;
  image?: string;
};

export type ProductColorOption = { id: string; name: string; hex: string; active: boolean; custom?: boolean };

export const defaultProductColors: ProductColorOption[] = [
  { id: "preto", name: "Preto", hex: "#000000", active: true },
  { id: "branco", name: "Branco", hex: "#FFFFFF", active: true },
  { id: "cinza", name: "Cinza", hex: "#808080", active: true },
  { id: "vermelho", name: "Vermelho", hex: "#FF0000", active: true },
  { id: "azul", name: "Azul", hex: "#0000FF", active: true },
  { id: "verde", name: "Verde", hex: "#008000", active: true },
  { id: "amarelo", name: "Amarelo", hex: "#FFFF00", active: true },
  { id: "rosa", name: "Rosa", hex: "#FFC0CB", active: true },
  { id: "roxo", name: "Roxo", hex: "#800080", active: true },
  { id: "laranja", name: "Laranja", hex: "#FFA500", active: true },
];

export function normalizeProduct(id: string, data: Record<string, unknown>): Product {
  const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
  const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
  const imageList = Array.isArray(data.images) ? data.images.filter((value): value is string => typeof value === "string" && value.trim().length > 0).slice(0, 3) : [];
  const image = text(data.image, imageList[0] ?? "");
  const colors = Array.isArray(data.colors) ? data.colors.filter((value): value is string => typeof value === "string") : [];
  let variants = Array.isArray(data.variants) ? data.variants.filter((item): item is ProductVariant =>
    Boolean(item && typeof item === "object" && typeof (item as ProductVariant).colorId === "string" && typeof (item as ProductVariant).name === "string" && /^#[0-9a-f]{6}$/i.test((item as ProductVariant).hex))
  ).map((item) => ({
    colorId: item.colorId,
    name: item.name,
    hex: item.hex,
    ...(number(item.stock) !== undefined ? { stock: number(item.stock) } : {}),
    ...(number(item.priceAdjustment) !== undefined ? { priceAdjustment: number(item.priceAdjustment) } : {}),
    ...(typeof item.image === "string" && item.image ? { image: item.image } : {}),
    available: item.available !== false,
  })) : [];
  if (!variants.length && colors.length) {
    variants = colors.map((name) => {
      const standard = defaultProductColors.find((color) => color.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"));
      const colorId = standard?.id ?? name.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      return { colorId, name, hex: standard?.hex ?? "#808080", available: true };
    });
  }
  const kitComponents = Array.isArray(data.kitComponents) ? data.kitComponents.filter((item): item is KitComponent =>
    Boolean(item && typeof item === "object" && typeof (item as KitComponent).productId === "string" && typeof (item as KitComponent).productTitle === "string" && Number.isInteger((item as KitComponent).quantity) && (item as KitComponent).quantity > 0)
  ) : [];
  return {
    id,
    slug: text(data.slug, id),
    title: text(data.title, "Produto"),
    category: text(data.category, "Outros"),
    description: text(data.description),
    material: text(data.material, "Consulte disponibilidade"),
    colors,
    image: imageList[0] ?? image,
    images: imageList.length ? imageList : image ? [image] : [],
    tag: text(data.tag, "Personalizável"),
    featured: data.featured === true,
    published: data.published === true,
    ...(typeof data.price === "number" && Number.isFinite(data.price) ? { price: data.price } : {}),
    kind: data.kind === "kit" ? "kit" : "product",
    ...(number(data.stock) !== undefined ? { stock: number(data.stock) } : {}),
    ...(variants.length ? { variants } : {}),
    ...(kitComponents.length ? { kitComponents } : {}),
    ...(number(data.compareAtPrice) !== undefined ? { compareAtPrice: number(data.compareAtPrice) } : {}),
  };
}

export type ProductCategory = { id: string; name: string; description: string; color: string; icon: string };

export const defaultProductCategories: ProductCategory[] = [
  { id: "Mascotes", name: "Mascotes", description: "Personagens com personalidade.", color: "#d8fa49", icon: "shape" },
  { id: "Chaveiros", name: "Chaveiros", description: "Pequenos objetos, grandes ideias.", color: "#f1b9b8", icon: "package" },
  { id: "Sensoriais", name: "Sensoriais", description: "Experiências que despertam sentidos.", color: "#f3a75f", icon: "sparkles" },
  { id: "Vestuário", name: "Vestuário", description: "Peças que vestem uma identidade.", color: "#9ec5e5", icon: "shape" },
  { id: "Brindes", name: "Brindes", description: "Presentes que ficam na memória.", color: "#c8b8e9", icon: "package" },
  { id: "Embalagens", name: "Embalagens", description: "A primeira impressão do produto.", color: "#f1dd77", icon: "package" },
];

export function calculateKitStock(components: KitComponent[], products: Product[]): number | null {
  if (components.length < 2) return 0;
  let tracked = false;
  let availableKits = Number.POSITIVE_INFINITY;
  for (const component of components) {
    const product = products.find((item) => item.id === component.productId);
    if (!product || !product.published) return 0;
    const variant = component.variantId ? product.variants?.find((item) => item.colorId === component.variantId) : undefined;
    if (component.variantId && (!variant || !variant.available)) return 0;
    const stock = variant?.stock ?? product.stock;
    if (stock !== undefined) {
      tracked = true;
      availableKits = Math.min(availableKits, Math.floor(stock / component.quantity));
    }
  }
  return tracked ? availableKits : null;
}

export function calculateKitValue(components: KitComponent[], products: Product[]): number {
  return components.reduce((total, component) => {
    const product = products.find((item) => item.id === component.productId);
    const variant = component.variantId ? product?.variants?.find((item) => item.colorId === component.variantId) : undefined;
    return total + ((product?.price ?? 0) + (variant?.priceAdjustment ?? 0)) * component.quantity;
  }, 0);
}

