import { login } from "./actions";
import { LogoMark } from "@/components/LogoMark";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2">
          <LogoMark className="h-8 w-8 shrink-0" />
          <h1 className="text-lg font-semibold leading-tight text-slate-900">
            CARTERA URBANIZADORA LYF OLMOS
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Ingresa con tu usuario para continuar.
        </p>

        <form action={login} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="tu@empresa.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Ingresar
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400">
          Los usuarios se crean desde el panel de Supabase (Authentication &gt; Users)
          o habilitando el alta pública si lo necesitas.
        </p>
      </div>
    </div>
  );
}
