import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATLAS SAC | Inteligência de Risco",
  description:
    "Inteligência de risco social, ambiental e climático orientada por evidências, com regras determinísticas, modelo estatístico e revisão humana.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
