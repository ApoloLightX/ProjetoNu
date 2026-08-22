import type { Metadata } from "next";
import "./globals.css";
import "./refinements.css";
import "./registry.css";
import "./evidence-trace.css";

export const metadata: Metadata = {
  title: "ATLAS | Evidence-First Risk Intelligence",
  description:
    "Inteligência de risco orientada por evidências, incerteza explícita, limites de modelo e decisão humana.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
