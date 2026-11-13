import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORMA — Produtos que viram ideias",
  description: "Portfólio de produtos personalizados, mascotes, chaveiros, vestuário, brindes e embalagens.",
  openGraph: {
    title: "FORMA — Produtos que viram ideias",
    description: "Projetos personalizados com identidade e impacto.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}