import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils/format";
import { eliminarPropiedad } from "./actions";

const ESTADO_STYLES: Record<string, string> = {
  disponible: "bg-green-100 text-green-800",
  alquilada: "bg-blue-100 text-blue-800",
  vendida: "bg-slate-200 text-slate-700",
  reservada: "bg-amber-100 text-amber-800",
};

export default async function PropiedadesPage() {
  const supabase = await createClient();
  const { data: propiedades, error } = await supabase
    .from("propiedades")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Propiedades</h1>
        <Link
          href="/propiedades/nuevo"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Nueva propiedad
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {propiedades?.map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <h2 className="font-medium text-slate-900">{p.direccion}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  ESTADO_STYLES[p.estado] ?? "bg-slate-100 text-slate-700"
                }`}
              >
                {p.estado}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {p.tipo} · {p.ciudad ?? "sin ciudad"}
              {p.superficie_m2 ? ` · ${p.superficie_m2} m²` : ""}
            </p>
            {p.valor_referencia && (
              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatMoney(p.valor_referencia)}
              </p>
            )}
            <div className="mt-3 flex gap-3 text-sm">
              <Link
                href={`/propiedades/${p.id}`}
                className="text-slate-600 hover:text-slate-900 hover:underline"
              >
                Editar
              </Link>
              <form action={eliminarPropiedad.bind(null, p.id)}>
                <button
                  type="submit"
                  className="text-red-600 hover:text-red-800 hover:underline"
                >
                  Eliminar
                </button>
              </form>
            </div>
          </div>
        ))}
        {propiedades?.length === 0 && (
          <p className="col-span-full py-6 text-center text-slate-400">
            Todavía no hay propiedades cargadas.
          </p>
        )}
      </div>
    </div>
  );
}
