import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATLAS SAC | Risk Intelligence",
  description:
    "Evidence-first social, environmental and climate risk intelligence with deterministic rules, statistical models and human review.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
