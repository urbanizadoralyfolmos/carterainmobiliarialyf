import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cartera Inmobiliaria",
  description: "Control de clientes, propiedades, contratos, cuotas y mora",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
