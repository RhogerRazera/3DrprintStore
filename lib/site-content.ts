import { defaultProductCategories, ProductCategory } from "@/lib/products";

export type SiteContent = Record<string, string>;

export function getSiteCategories(content: SiteContent): ProductCategory[] {
  try {
    const saved = JSON.parse(content.categoryItems || "null");
    if (Array.isArray(saved)) {
      const valid = saved.filter((item): item is ProductCategory => item && typeof item.id === "string" && typeof item.name === "string");
      if (valid.length) return valid;
    }
  } catch { /* Usa as categorias padrão em registros antigos. */ }
  return defaultProductCategories.map((category, index) => ({
    ...category,
    name: content[`category${index + 1}Title`] || category.name,
    description: content[`category${index + 1}Desc`] || category.description,
    color: content[`category${index + 1}Color`] || category.color,
    icon: content[`category${index + 1}Icon`] || category.icon,
  }));
}

export function resolveCategory(content: SiteContent, value: string): ProductCategory | undefined {
  return getSiteCategories(content).find((category) => category.id === value || category.name === value);
}

export function categoryLabel(content: SiteContent, value: string): string {
  return resolveCategory(content, value)?.name ?? value;
}

export const defaultSiteContent: SiteContent = {
  siteName: "Kriatto3D", siteInitial: "K", siteTitle: "Kriatto3D — Produtos que viram ideias.", adminButtonLabel: "Painel administrativo",
  siteDescription: "Portfólio de produtos personalizados, mascotes, chaveiros, vestuário, brindes e embalagens.",
  navCategories: "Categorias", navProcess: "Processo", navContact: "Vamos conversar",
  heroEyebrow: "ESTÚDIO DE PRODUTOS & EXPERIÊNCIAS", heroTitleLine1: "Ideias que", heroTitleLine2: "ganham", heroTitleEm: "vida.",
  heroLead: "Criamos produtos que contam histórias. Do primeiro rascunho ao detalhe que faz alguém olhar duas vezes.",
  heroPrimaryLabel: "Explorar categorias", heroPrimaryHref: "#categorias", heroSecondaryLabel: "Como funciona", heroSecondaryHref: "#processo", heroFootLeft: "DESIGN COM INTENÇÃO.", heroFootRight: "FEITO PARA MARCAR.",
  heroStickerTop: "IDEIA\n→ OBJETO", heroStickerBottom: "FEITO\nPRA VOCÊ", heroCompositionAlt: "Apresentação visual da Kriatto3D", heroMainImageUrl: "",
  heroMainImageAlt: "Produto personalizado", heroMainImageLabel: "01 / PERSONAGEM",
  heroSmallImageUrl: "",
  heroSmallImageAlt: "Camiseta personalizada", heroSmallImageLabel: "02 / VESTUÁRIO",
  heroIndex: "PORTFÓLIO Nº 001 — 2026", heroScroll: "ROLE PARA DESCOBRIR",
  introKicker: "O QUE PODEMOS CRIAR", introTitleLine1: "Não é só um", introTitleLine2: "produto. É", introTitleEm: "presença.",
  introBody: "Objetos, personagens e experiências que levam a identidade da sua marca para o mundo real. Cada projeto começa com uma boa pergunta: o que queremos fazer as pessoas sentir?",
  category1Title: "Mascotes", category1Desc: "Personagens com personalidade.", category1Color: "#d8fa49", category1Icon: "shape",
  category2Title: "Chaveiros", category2Desc: "Pequenos objetos, grandes ideias.", category2Color: "#f1b9b8", category2Icon: "package",
  category3Title: "Sensoriais", category3Desc: "Experiências que despertam sentidos.", category3Color: "#f3a75f", category3Icon: "sparkles",
  category4Title: "Vestuário", category4Desc: "Peças que vestem uma identidade.", category4Color: "#9ec5e5", category4Icon: "shape",
  category5Title: "Brindes", category5Desc: "Presentes que ficam na memória.", category5Color: "#c8b8e9", category5Icon: "package",
  category6Title: "Embalagens", category6Desc: "A primeira impressão do produto.", category6Color: "#f1dd77", category6Icon: "package",
  categoryItems: JSON.stringify(defaultProductCategories),
  categoriesHint: "Selecione uma categoria para ver projetos relacionados.", categoriesSeeAll: "Ver tudo",
  manifestoEyebrow: "NOSSO JEITO DE FAZER", manifestoTitleLine1: "Do “e se...”", manifestoTitleLine2: "ao", manifestoTitleEm: "“é isso!”",
  manifestoBody: "Boa ideia merece sair da tela. Unimos conceito, estética e atenção aos detalhes para criar produtos com identidade própria.",
  manifestoButton: "Tirar uma ideia do papel", manifestoButtonHref: "#contato", manifestoSide: "IMAGINAR / DESENHAR / MATERIALIZAR",
  processKicker: "DO CONCEITO À ENTREGA", processTitleLine1: "Simples no processo.", processTitleLine2: "Marcante no resultado.",
  process1Title: "Recebemos seu pedido", process1Body: "Conferimos os detalhes do seu pedido, as personalizações e o prazo combinado.",
  process2Title: "Iniciamos a produção", process2Body: "Preparamos os materiais e começamos a produzir seu pedido com atenção aos detalhes.",
  process3Title: "Verificação e teste de qualidade", process3Body: "Verificamos o acabamento e testamos a qualidade antes de preparar o envio.",
  process4Title: "Realizamos a entrega", process4Body: "Seu pedido é embalado com cuidado e enviado ou entregue conforme combinado.",
  contactKicker: "SEU PROJETO COMEÇA AQUI", contactTitleLine1: "Vamos criar", contactTitleLine2: "algo", contactTitleEm: "memorável?",
  contactBody: "Conte um pouco da sua ideia. Vamos entender o que você precisa e conversar sobre os próximos passos.",
  contactNote: "Sem compromisso. A primeira conversa é para entender sua ideia.",
  footerTagline: "Produtos que viram ideias.", footerTop: "Voltar ao topo", footerCopyright: "© 2026 KRIATTO3D",
  projectLoading: "Carregando produto…", projectNotFoundTitle: "Produto não encontrado", projectNotFoundBody: "Este produto pode ter sido removido ou não está publicado.",
  projectBackLabel: "Voltar ao portfólio", projectExploreLabel: "Explorar portfólio", projectStudyLabel: "DETALHES DO PRODUTO", projectMaterialsLabel: "Material", projectPaletteLabel: "Paleta",
  projectNote: "Valores e especificações serão confirmados no orçamento.", projectQuoteLabel: "Solicitar orçamento", projectFooterExploreLabel: "Explorar outros produtos",
  colorPaper: "#f2f0e9", colorInk: "#171915", colorLime: "#d6fa42",
};

export const contentFields: { key: string; label: string; group: string; kind?: "textarea" | "url" | "color"; options?: { value: string; label: string }[] }[] = [
  { group: "Marca e navegação", key: "siteName", label: "Nome da marca" }, { group: "Marca e navegação", key: "siteInitial", label: "Letra do símbolo" },
  { group: "Marca e navegação", key: "siteTitle", label: "Título da aba" }, { group: "Marca e navegação", key: "siteDescription", label: "Descrição para busca e compartilhamento", kind: "textarea" },
  { group: "Marca e navegação", key: "adminButtonLabel", label: "Botão de acesso ao painel" },
{ group: "Marca e navegação", key: "navCategories", label: "Link: categorias" },
  { group: "Marca e navegação", key: "navProcess", label: "Link: processo" }, { group: "Marca e navegação", key: "navContact", label: "Link: contato" },
  { group: "Capa", key: "heroEyebrow", label: "Linha superior" }, { group: "Capa", key: "heroTitleLine1", label: "Título — linha 1" },
  { group: "Capa", key: "heroTitleLine2", label: "Título — linha 2" }, { group: "Capa", key: "heroTitleEm", label: "Título — destaque" },
  { group: "Capa", key: "heroLead", label: "Texto de apresentação", kind: "textarea" }, { group: "Capa", key: "heroPrimaryLabel", label: "Botão principal" },
  { group: "Capa", key: "heroPrimaryHref", label: "Destino do botão principal" }, { group: "Capa", key: "heroSecondaryLabel", label: "Botão secundário" }, { group: "Capa", key: "heroSecondaryHref", label: "Destino do botão secundário" }, { group: "Capa", key: "heroFootLeft", label: "Frase inferior esquerda" },
  { group: "Capa", key: "heroFootRight", label: "Frase inferior direita" }, { group: "Capa", key: "heroStickerTop", label: "Adesivo superior" },
  { group: "Capa", key: "heroStickerBottom", label: "Adesivo inferior", kind: "textarea" }, { group: "Capa", key: "heroCompositionAlt", label: "Descrição da composição" },
  { group: "Capa", key: "heroMainImageUrl", label: "URL da foto principal", kind: "url" },
  { group: "Capa", key: "heroMainImageAlt", label: "Descrição da foto principal" }, { group: "Capa", key: "heroMainImageLabel", label: "Legenda da foto principal" },
  { group: "Capa", key: "heroSmallImageUrl", label: "URL da foto secundária", kind: "url" }, { group: "Capa", key: "heroSmallImageAlt", label: "Descrição da foto secundária" },
  { group: "Capa", key: "heroSmallImageLabel", label: "Legenda da foto secundária" }, { group: "Capa", key: "heroIndex", label: "Número do portfólio" },
  { group: "Capa", key: "heroScroll", label: "Texto de rolagem" },
  { group: "Categorias", key: "introKicker", label: "Identificação da seção" }, { group: "Categorias", key: "introTitleLine1", label: "Título — linha 1" },
  { group: "Categorias", key: "introTitleLine2", label: "Título — linha 2" }, { group: "Categorias", key: "introTitleEm", label: "Título — destaque" },
  { group: "Categorias", key: "introBody", label: "Descrição da seção", kind: "textarea" },
  { group: "Categorias", key: "categoriesHint", label: "Instrução das categorias" }, { group: "Categorias", key: "categoriesSeeAll", label: "Botão ver tudo" },
  { group: "Manifesto", key: "manifestoEyebrow", label: "Identificação da seção" }, { group: "Manifesto", key: "manifestoTitleLine1", label: "Título — linha 1" },
  { group: "Manifesto", key: "manifestoTitleLine2", label: "Título — linha 2" }, { group: "Manifesto", key: "manifestoTitleEm", label: "Título — destaque" },
  { group: "Manifesto", key: "manifestoBody", label: "Texto", kind: "textarea" }, { group: "Manifesto", key: "manifestoButton", label: "Botão" }, { group: "Manifesto", key: "manifestoButtonHref", label: "Destino do botão" },
  { group: "Manifesto", key: "manifestoSide", label: "Texto lateral" },
  { group: "Processo", key: "processKicker", label: "Identificação da seção" }, { group: "Processo", key: "processTitleLine1", label: "Título — linha 1" },
  { group: "Processo", key: "processTitleLine2", label: "Título — linha 2" },
  ...Array.from({ length: 4 }, (_, i) => [
    { group: "Processo", key: `process${i + 1}Title`, label: `Etapa ${i + 1} — nome` },
    { group: "Processo", key: `process${i + 1}Body`, label: `Etapa ${i + 1} — descrição`, kind: "textarea" as const },
  ]).flat(),
  { group: "Contato", key: "contactKicker", label: "Identificação da seção" }, { group: "Contato", key: "contactTitleLine1", label: "Título — linha 1" },
  { group: "Contato", key: "contactTitleLine2", label: "Título — linha 2" }, { group: "Contato", key: "contactTitleEm", label: "Título — destaque" },
  { group: "Contato", key: "contactBody", label: "Texto", kind: "textarea" }, { group: "Contato", key: "contactNote", label: "Observação" },
  { group: "Rodapé", key: "footerTagline", label: "Frase da marca" }, { group: "Rodapé", key: "footerTop", label: "Link voltar ao topo" },
  { group: "Rodapé", key: "footerCopyright", label: "Copyright" },
  { group: "Página de produto", key: "projectLoading", label: "Carregando produto" }, { group: "Página de produto", key: "projectNotFoundTitle", label: "Produto não encontrado — título" },
  { group: "Página de produto", key: "projectNotFoundBody", label: "Produto não encontrado — texto", kind: "textarea" }, { group: "Página de produto", key: "projectBackLabel", label: "Voltar ao portfólio" },
  { group: "Página de produto", key: "projectExploreLabel", label: "Botão explorar portfólio" }, { group: "Página de produto", key: "projectStudyLabel", label: "Identificação do produto" },
  { group: "Página de produto", key: "projectMaterialsLabel", label: "Campo material" }, { group: "Página de produto", key: "projectPaletteLabel", label: "Campo paleta" },
  { group: "Página de produto", key: "projectNote", label: "Observação do produto", kind: "textarea" }, { group: "Página de produto", key: "projectQuoteLabel", label: "Botão solicitar orçamento" },
  { group: "Página de produto", key: "projectFooterExploreLabel", label: "Link explorar outros produtos" },
  { group: "Cores", key: "colorPaper", label: "Fundo claro", kind: "color" }, { group: "Cores", key: "colorInk", label: "Texto escuro", kind: "color" },
  { group: "Cores", key: "colorLime", label: "Cor de destaque", kind: "color" },
];

const previousProductPageCopy: Record<string, string> = {
  projectLoading: "Carregando projeto…",
  projectNotFoundTitle: "Projeto não encontrado",
  projectNotFoundBody: "Este projeto pode ter sido removido ou não está publicado.",
  projectStudyLabel: "ESTUDO DE PROJETO",
  projectMaterialsLabel: "Materiais",
  projectNote: "Projeto demonstrativo. Especificações finais são definidas no orçamento.",
  projectFooterExploreLabel: "Explorar outros projetos",
};

const previousProcessCopy: Record<string, string> = {
  process1Title: "Escutamos", process1Body: "Entendemos a ideia, o público, o objetivo e o que torna sua marca diferente.",
  process2Title: "Desenhamos", process2Body: "Definimos conceito, referências, materiais e caminhos possíveis para o projeto.",
  process3Title: "Apresentamos", process3Body: "Organizamos a proposta visual para você avaliar e alinhar os próximos passos.",
  process4Title: "Realizamos", process4Body: "Com tudo aprovado, os detalhes de produção, prazo e orçamento são combinados.",
};

export function mergeSiteContent(saved: Record<string, unknown>): SiteContent {
  const merged = { ...defaultSiteContent, ...saved } as SiteContent;
  if (merged.siteName === "FORMA") merged.siteName = "Kriatto3D";
  if (typeof merged.heroTitleEm === "string" && /^forma\.?$/i.test(merged.heroTitleEm.trim())) merged.heroTitleEm = defaultSiteContent.heroTitleEm;
  if (merged.heroPrimaryHref === "#portfolio") merged.heroPrimaryHref = "#categorias";
  if (merged.heroPrimaryLabel === "Explorar projetos") merged.heroPrimaryLabel = "Explorar categorias";
  if (typeof merged.heroMainImageUrl === "string" && merged.heroMainImageUrl.includes("photo-1559454403-b8fb88521f11")) merged.heroMainImageUrl = "";
  if (typeof merged.heroSmallImageUrl === "string" && merged.heroSmallImageUrl.includes("photo-1521572163474-6864f9cf17ab")) merged.heroSmallImageUrl = "";
  if (merged.heroCompositionAlt === "Composição de produtos demonstrativos") merged.heroCompositionAlt = defaultSiteContent.heroCompositionAlt;
  if (merged.heroMainImageAlt === "Produto de design demonstrativo") merged.heroMainImageAlt = defaultSiteContent.heroMainImageAlt;
  if (merged.heroSmallImageAlt === "Camiseta de coleção demonstrativa") merged.heroSmallImageAlt = defaultSiteContent.heroSmallImageAlt;
  if (merged.siteInitial === "F" && merged.siteName === "Kriatto3D") merged.siteInitial = "K";
  if (typeof merged.siteTitle === "string" && merged.siteTitle.startsWith("FORMA")) merged.siteTitle = defaultSiteContent.siteTitle;
  if (merged.footerCopyright === "© 2026 FORMA STUDIO") merged.footerCopyright = defaultSiteContent.footerCopyright;
  if (typeof saved.categoryItems !== "string") {
    const legacyItems = defaultProductCategories.map((category, index) => ({
      ...category,
      name: typeof saved[`category${index + 1}Title`] === "string" ? saved[`category${index + 1}Title`] as string : category.name,
      description: typeof saved[`category${index + 1}Desc`] === "string" ? saved[`category${index + 1}Desc`] as string : category.description,
      color: typeof saved[`category${index + 1}Color`] === "string" ? saved[`category${index + 1}Color`] as string : category.color,
      icon: typeof saved[`category${index + 1}Icon`] === "string" ? saved[`category${index + 1}Icon`] as string : category.icon,
    }));
    merged.categoryItems = JSON.stringify(legacyItems);
  }
  for (const [key, oldValue] of Object.entries(previousProcessCopy)) {
    if (merged[key] === oldValue) merged[key] = defaultSiteContent[key];
  }
  for (const [key, oldValue] of Object.entries(previousProductPageCopy)) {
    if (merged[key] === oldValue) merged[key] = defaultSiteContent[key];
  }
  return merged;
}
