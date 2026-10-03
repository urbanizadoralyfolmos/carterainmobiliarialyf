import { NavLinks } from "./NavLinks";
import { BANNER_APP_URI } from "@/lib/bannerApp";

export function Nav({
  email,
  rol,
}: {
  email?: string | null;
  rol?: string | null;
}) {
  return (
    <header className="border-t-2 border-b border-t-brand border-b-slate-200 bg-white print:hidden">
      <div className="flex w-full items-center justify-center bg-white py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BANNER_APP_URI}
          alt="Urbanizadora LYF Olmos — Gestión de Cartera"
          className="h-16 w-auto sm:h-20"
        />
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 border-t border-slate-100 px-4 py-3">
        <NavLinks rol={rol} />
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
