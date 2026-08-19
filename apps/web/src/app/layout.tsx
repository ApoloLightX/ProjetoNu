import type { Metadata } from "next";
import "./globals.css";
import "./refinements.css";

export const metadata: Metadata = {
  title: "ATLAS SAC | Inteligência de Risco",
  description:
    "Risco social, ambiental e climático orientado por evidências, incerteza explícita e decisão humana.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
