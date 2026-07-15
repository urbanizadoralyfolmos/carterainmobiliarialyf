import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/proyectos", label: "Proyectos" },
  { href: "/propiedades", label: "Propiedades" },
  { href: "/contratos", label: "Contratos" },
  { href: "/cuotas", label: "Cuotas" },
  { href: "/recibos", label: "Recibos" },
];

export function Nav({ email }: { email?: string | null }) {
  return (
    <header className="border-b border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-slate-900">
            Cartera Inmobiliaria
          </span>
          <nav className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {email && <span className="text-sm text-slate-500">{email}</span>}
          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
