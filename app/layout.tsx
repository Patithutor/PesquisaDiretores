import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "Expectativa da Diretoria sobre a Liderança",
  description: "Régua de maturidade da liderança do Sebrae / MT — questionário da Diretoria",
};

export const viewport: Viewport = { themeColor: "#2A4FDA" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={figtree.variable}>{children}</body>
    </html>
  );
}
