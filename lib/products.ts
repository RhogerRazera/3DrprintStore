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

export const categories = [
  "Todos", "Mascotes", "Chaveiros", "Sensoriais", "Vestuário", "Brindes", "Embalagens"
];

export const demoProducts: Product[] = [
  {
    id: "p1", slug: "mascote-lume", title: "Lume — personagem de marca", category: "Mascotes",
    description: "Um personagem com personalidade, pensado para ganhar vida em campanhas, eventos e produtos colecionáveis.",
    material: "Conceito 3D / vinil sob consulta", colors: ["Verde", "Creme", "Preto"],
    image: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=1200&q=85",
    tag: "Personagem", featured: true
  },
  {
    id: "p2", slug: "chaveiro-forma", title: "Chaveiro Forma", category: "Chaveiros",
    description: "Chaveiro compacto com acabamento marcante para brindes, lançamentos e identidade de marca.",
    material: "Acrílico / metal / PVC", colors: ["Transparente", "Preto", "Personalizado"],
    image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=85",
    tag: "Personalizável", featured: true
  },
  {
    id: "p3", slug: "kit-sensorial-calma", title: "Kit sensorial Calma", category: "Sensoriais",
    description: "Uma experiência de marca pensada para estimular sentidos por meio de texturas, aromas e apresentação cuidadosa.",
    material: "Materiais definidos por projeto", colors: ["Areia", "Oliva", "Lavanda"],
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1200&q=85",
    tag: "Experiência", featured: true
  },
  {
    id: "p4", slug: "camiseta-capsula", title: "Camiseta cápsula", category: "Vestuário",
    description: "Peça de vestuário para coleções especiais, equipes, eventos e marcas autorais.",
    material: "Algodão ou malha sob consulta", colors: ["Preto", "Off-white", "Cor personalizada"],
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85",
    tag: "Coleção", featured: false
  },
  {
    id: "p5", slug: "kit-boas-vindas", title: "Kit boas-vindas", category: "Brindes",
    description: "Um conjunto coordenado para onboarding, eventos corporativos, ativações e relacionamento com clientes.",
    material: "Papel, tecido e itens selecionados", colors: ["Paleta da marca"],
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=85",
    tag: "Corporativo", featured: false
  },
  {
    id: "p6", slug: "embalagem-origem", title: "Embalagem Origem", category: "Embalagens",
    description: "Embalagem com presença de prateleira e uma experiência de abertura alinhada à história do produto.",
    material: "Papel cartão / kraft / especiais", colors: ["Kraft", "Preto", "Impressão personalizada"],
    image: "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1200&q=85",
    tag: "Packaging", featured: false
  }
];
