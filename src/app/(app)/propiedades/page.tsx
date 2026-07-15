import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { eliminarPropiedad } from "./actions";

const ESTADO_LABELS: Record<string, string> = {
  disponible: "Disponible",
  prometido_en_venta: "Prometido en venta",
  escriturado: "Escriturado",
  facturado: "Facturado",
};

const ESTADO_STYLES: Record<string, string> = {
  disponible: "bg-green-100 text-green-800",
  prometido_en_venta: "bg-amber-100 text-amber-800",
  escriturado: "bg-blue-100 text-blue-800",
  facturado: "bg-purple-100 text-purple-800",
};

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string }>;
}) {
  const { proyecto: proyectoFiltro } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("propiedades")
    .select("*, proyectos(nombre)")
    .order("created_at", { ascending: false });

  if (proyectoFiltro === "sin-proyecto") {
    query = query.is("proyecto_id", null);
  } else if (proyectoFiltro) {
    query = query.eq("proyecto_id", proyectoFiltro);
  }

  const [{ data: propiedades, error }, { data: contratos }, { data: proyectos }] =
    await Promise.all([
      query,
      supabase
        .from("contratos")
        .select("numero, estado, propiedad_id, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("proyectos").select("id, nombre").order("nombre"),
    ]);

  // Contrato más reciente por propiedad (para mostrar el vínculo).
  const contratoPorPropiedad = new Map<string, { numero: number; estado: string }>();
  for (const c of contratos ?? []) {
    if (!contratoPorPropiedad.has(c.propiedad_id)) {
      contratoPorPropiedad.set(c.propiedad_id, { numero: c.numero, estado: c.estado });
    }
  }

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

      <div className="mt-3 flex flex-wrap gap-1">
        <Link
          href="/propiedades"
          className={`rounded-md px-3 py-1.5 text-sm ${
            !proyectoFiltro ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Todas
        </Link>
        <Link
          href="/propiedades?proyecto=sin-proyecto"
          className={`rounded-md px-3 py-1.5 text-sm ${
            proyectoFiltro === "sin-proyecto"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Sin proyecto
        </Link>
        {proyectos?.map((pr) => (
          <Link
            key={pr.id}
            href={`/propiedades?proyecto=${pr.id}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              proyectoFiltro === pr.id
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {pr.nombre}
          </Link>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {propiedades?.map((p) => {
          const contrato = contratoPorPropiedad.get(p.id);
          return (
            <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <h2 className="font-medium text-slate-900">{p.direccion}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    ESTADO_STYLES[p.estado] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {ESTADO_LABELS[p.estado] ?? p.estado}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {p.proyectos?.nombre ? `${p.proyectos.nombre} · ` : ""}
                {p.tipo} · {p.ciudad ?? "sin ciudad"}
                {p.superficie_m2 ? ` · ${p.superficie_m2} m²` : ""}
              </p>
              {p.valor_referencia && (
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {formatMoney(p.valor_referencia)}
                </p>
              )}

              {p.estado === "prometido_en_venta" && contrato && (
                <p className="mt-2 text-xs text-amber-700">
                  Contrato N.º {contrato.numero} ({contrato.estado})
                </p>
              )}
              {p.estado === "escriturado" && (
                <p className="mt-2 text-xs text-blue-700">
                  {p.numero_escritura ? `Escritura N.º ${p.numero_escritura}` : "Sin número de escritura"}
                  {p.fecha_escritura ? ` · ${formatDate(p.fecha_escritura)}` : ""}
                </p>
              )}
              {p.estado === "facturado" && (
                <p className="mt-2 text-xs text-purple-700">
                  {p.numero_factura ? `Factura N.º ${p.numero_factura}` : "Sin número de factura"}
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
          );
        })}
        {propiedades?.length === 0 && (
          <p className="col-span-full py-6 text-center text-slate-400">
            Todavía no hay propiedades cargadas.
          </p>
        )}
      </div>
    </div>
  );
}
