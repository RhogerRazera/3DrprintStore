import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://portfolio-3drprint-2026.web.app"),
  title: "Kriatto3D — Produtos que viram ideias",
  description: "Portfólio de produtos personalizados em impressão 3D pela Kriatto3D.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Kriatto3D — Produtos que viram ideias",
    description: "Produtos personalizados em impressão 3D pela Kriatto3D.",
    type: "website",
    siteName: "Kriatto3D",
    locale: "pt_BR",
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "Kriatto3D — Produtos que viram ideias", description: "Produtos personalizados em impressão 3D pela Kriatto3D." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}

