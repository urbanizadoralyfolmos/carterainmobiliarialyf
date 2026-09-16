"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/proyectos", label: "Proyectos" },
  { href: "/propiedades", label: "Propiedades" },
  { href: "/contratos", label: "Contratos" },
  { href: "/cuotas", label: "Cuotas" },
  { href: "/recibos", label: "Recibos" },
  { href: "/reportes", label: "Reportes" },
];

export function NavLinks({ rol }: { rol?: string | null }) {
  const pathname = usePathname();
  const linksVisibles =
    rol === "admin" ? [...links, { href: "/usuarios", label: "Usuarios" }] : links;

  return (
    <nav className="flex flex-wrap gap-1">
      {linksVisibles.map((link) => {
        const activo =
          pathname === link.href || pathname?.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm ${
              activo
                ? "bg-brand-light text-brand-dark font-medium"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
