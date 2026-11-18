import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kriatto3D — Produtos que viram ideias",
  description: "Portfólio de produtos personalizados em impressão 3D pela Kriatto3D.",
  openGraph: {
    title: "Kriatto3D — Produtos que viram ideias",
    description: "Produtos personalizados em impressão 3D pela Kriatto3D.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}