import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATLAS SAC | Inteligência de Risco",
  description:
    "Análise social, ambiental e climática orientada por evidências, com incerteza explícita e decisão humana por design.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
