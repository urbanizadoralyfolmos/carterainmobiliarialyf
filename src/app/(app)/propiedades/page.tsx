import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { eliminarPropiedad, eliminarPropiedades } from "./actions";
import { SearchInput } from "@/components/SearchInput";
import { SeleccionarTodasCheckbox } from "@/components/SeleccionarTodasCheckbox";
import { EliminarSeleccionadasButton } from "@/components/EliminarSeleccionadasButton";
import { esAdmin } from "@/lib/auth/rol";

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
  searchParams: Promise<{ proyecto?: string; estado?: string; q?: string; error?: string }>;
}) {
  const { proyecto: proyectoFiltro, estado: estadoFiltro, q, error: errorParam } = await searchParams;
  const supabase = await createClient();
  const admin = await esAdmin();

  let query = supabase
    .from("propiedades")
    .select("*, proyectos(nombre)")
    .order("created_at", { ascending: false });

  if (proyectoFiltro === "sin-proyecto") {
    query = query.is("proyecto_id", null);
  } else if (proyectoFiltro) {
    query = query.eq("proyecto_id", proyectoFiltro);
  }

  if (estadoFiltro) {
    query = query.eq("estado", estadoFiltro);
  }

  const [{ data: propiedadesData, error }, { data: vinculos }, { data: proyectos }] =
    await Promise.all([
      query,
      supabase
        .from("contrato_propiedades")
        .select("propiedad_id, contratos(numero, estado, numero_factura, created_at)")
        .order("created_at", { ascending: false }),
      supabase.from("proyectos").select("id, nombre").order("nombre"),
    ]);

  type ContratoRelPropiedad = {
    numero: number;
    estado: string;
    numero_factura: string | null;
  };

  // Contrato más reciente por propiedad (para mostrar el vínculo, y el N.º
  // de factura cuando corresponda: la factura se registra a nivel del
  // contrato, no de la propiedad). Una propiedad puede, en teoría, pasar
  // por más de un contrato en el tiempo.
  const contratoPorPropiedad = new Map<string, ContratoRelPropiedad>();
  for (const v of vinculos ?? []) {
    const c = v.contratos as ContratoRelPropiedad | ContratoRelPropiedad[] | null;
    const contrato = Array.isArray(c) ? c[0] : c;
    if (contrato && !contratoPorPropiedad.has(v.propiedad_id)) {
      contratoPorPropiedad.set(v.propiedad_id, contrato);
    }
  }

  const termino = (q ?? "").trim().toLowerCase();
  const propiedades = (propiedadesData ?? []).filter((p) => {
    if (!termino) return true;
    return (
      p.direccion.toLowerCase().includes(termino) ||
      (p.manzana ?? "").toLowerCase().includes(termino) ||
      (p.numero_lote ?? "").toLowerCase().includes(termino) ||
      (p.ciudad ?? "").toLowerCase().includes(termino)
    );
  });

  const buildHref = (overrides: { proyecto?: string; estado?: string }) => {
    const params = new URLSearchParams();
    const proyectoValor = "proyecto" in overrides ? overrides.proyecto : proyectoFiltro;
    const estadoValor = "estado" in overrides ? overrides.estado : estadoFiltro;
    if (proyectoValor) params.set("proyecto", proyectoValor);
    if (estadoValor) params.set("estado", estadoValor);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/propiedades${qs ? `?${qs}` : ""}`;
  };

  // URL del listado con el filtro actual (proyecto/estado/búsqueda) tal cual
  // está ahora, para volver aquí mismo después de eliminar una propiedad.
  const currentHref = buildHref({});

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Propiedades</h1>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Buscar por dirección, manzana, lote o ciudad..." />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Link
          href={buildHref({ proyecto: undefined })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            !proyectoFiltro ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Todas
        </Link>
        <Link
          href={buildHref({ proyecto: "sin-proyecto" })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            proyectoFiltro === "sin-proyecto"
              ? "bg-brand text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Sin proyecto
        </Link>
        {proyectos?.map((pr) => (
          <Link
            key={pr.id}
            href={buildHref({ proyecto: pr.id })}
            className={`rounded-md px-3 py-1.5 text-sm ${
              proyectoFiltro === pr.id
                ? "bg-brand text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {pr.nombre}
          </Link>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Link
          href={buildHref({ estado: undefined })}
          className={`rounded-md px-3 py-1 text-xs font-medium ${
            !estadoFiltro ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Todos los estados
        </Link>
        {Object.entries(ESTADO_LABELS).map(([valor, etiqueta]) => (
          <Link
            key={valor}
            href={buildHref({ estado: valor })}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              estadoFiltro === valor
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {etiqueta}
          </Link>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}
      {errorParam && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorParam}</p>
      )}

      <form action={eliminarPropiedades}>
        <input type="hidden" name="redirect_to" value={currentHref} />

        {admin && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Marca las propiedades que quieras eliminar y usa el botón de abajo para borrarlas
              todas de una vez.
            </p>
            <EliminarSeleccionadasButton className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50" />
          </div>
        )}

        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  {admin && (
                    <th className="px-4 py-2">
                      <SeleccionarTodasCheckbox />
                    </th>
                  )}
                  <th className="px-4 py-2">Dirección</th>
                  <th className="px-4 py-2">Proyecto</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Ciudad</th>
                  <th className="px-4 py-2">m²</th>
                  <th className="px-4 py-2">Valor</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Detalle</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {propiedades?.map((p) => {
                  const contrato = contratoPorPropiedad.get(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      {admin && (
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            name="propiedad_ids"
                            value={p.id}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </td>
                      )}
                      <td className="px-4 py-2 font-medium text-slate-900">
                        <Link href={`/propiedades/${p.id}`} className="hover:underline">
                          {p.direccion}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-slate-600">{p.proyectos?.nombre ?? "-"}</td>
                      <td className="px-4 py-2 text-slate-600 capitalize">{p.tipo}</td>
                      <td className="px-4 py-2 text-slate-600">{p.ciudad ?? "-"}</td>
                      <td className="px-4 py-2 text-slate-600">
                        {p.superficie_m2 ? p.superficie_m2 : "-"}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {p.valor_referencia ? formatMoney(p.valor_referencia) : "-"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            ESTADO_STYLES[p.estado] ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ESTADO_LABELS[p.estado] ?? p.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {p.estado === "prometido_en_venta" && contrato && (
                          <span className="text-amber-700">
                            Contrato N.º {contrato.numero} ({contrato.estado})
                          </span>
                        )}
                        {p.estado === "escriturado" && (
                          <span className="text-blue-700">
                            {p.numero_escritura
                              ? `Escritura N.º ${p.numero_escritura}`
                              : "Sin número de escritura"}
                            {p.fecha_escritura ? ` · ${formatDate(p.fecha_escritura)}` : ""}
                          </span>
                        )}
                        {p.estado === "facturado" && (
                          <span className="text-purple-700">
                            {contrato?.numero_factura
                              ? `Factura N.º ${contrato.numero_factura}`
                              : "Sin número de factura"}
                          </span>
                        )}
                        {p.estado === "disponible" && "-"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {admin ? (
                          <>
                            <Link
                              href={`/propiedades/${p.id}`}
                              className="text-slate-600 hover:text-slate-900 hover:underline"
                            >
                              Editar
                            </Link>
                            <button
                              type="submit"
                              formAction={eliminarPropiedad.bind(null, p.id)}
                              className="ml-3 text-red-600 hover:text-red-800 hover:underline"
                            >
                              Eliminar
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {propiedades?.length === 0 && (
                  <tr>
                    <td colSpan={admin ? 10 : 9} className="px-4 py-6 text-center text-slate-400">
                      Todavía no hay propiedades cargadas.
                                        </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </div>
  );
}
