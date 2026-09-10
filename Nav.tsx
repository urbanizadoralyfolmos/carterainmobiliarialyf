import { LogoMark } from "./LogoMark";
import { NavLinks } from "./NavLinks";

export function Nav({ email }: { email?: string | null }) {
  return (
    <header className="border-t-2 border-b border-t-brand border-b-slate-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="flex items-center gap-2">
            <LogoMark className="h-6 w-6 shrink-0" />
            <span className="text-xs font-semibold tracking-tight text-slate-900 sm:text-sm">
              CARTERA URBANIZADORA LYF OLMOS
            </span>
          </span>
          <NavLinks />
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
