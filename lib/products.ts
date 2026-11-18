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
};

export function normalizeProduct(id: string, data: Record<string, unknown>): Product {
  const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
  const imageList = Array.isArray(data.images) ? data.images.filter((value): value is string => typeof value === "string" && value.trim().length > 0).slice(0, 3) : [];
  const image = text(data.image, imageList[0] ?? "");
  return {
    id,
    slug: text(data.slug, id),
    title: text(data.title, "Produto"),
    category: text(data.category, "Outros"),
    description: text(data.description),
    material: text(data.material, "Consulte disponibilidade"),
    colors: Array.isArray(data.colors) ? data.colors.filter((value): value is string => typeof value === "string") : [],
    image: imageList[0] ?? image,
    images: imageList.length ? imageList : image ? [image] : [],
    tag: text(data.tag, "Personalizável"),
    featured: data.featured === true,
    published: data.published === true,
    ...(typeof data.price === "number" && Number.isFinite(data.price) ? { price: data.price } : {}),
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
