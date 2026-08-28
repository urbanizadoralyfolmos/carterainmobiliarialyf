import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils/format";
import { ProyectoForm } from "@/components/ProyectoForm";
import { actualizarProyecto, generarLotes } from "../actions";

const ESTADO_LABELS: Record<string, string> = {
  disponible: "Disponible",
  prometido_en_venta: "Prometido",
  escriturado: "Escriturado",
  facturado: "Facturado",
};

const ESTADO_STYLES: Record<string, string> = {
  disponible: "bg-green-100 text-green-800",
  prometido_en_venta: "bg-amber-100 text-amber-800",
  escriturado: "bg-blue-100 text-blue-800",
  facturado: "bg-purple-100 text-purple-800",
};

export default async function ProyectoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; manzana?: string }>;
}) {
  const { id } = await params;
  const { error, manzana: manzanaFiltro } = await searchParams;
  const supabase = await createClient();

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .single();

  if (!proyecto) notFound();

  const { data: lotes } = await supabase
    .from("propiedades")
    .select("*")
    .eq("proyecto_id", id)
    .order("manzana", { ascending: true, nullsFirst: true })
    .order("numero_lote", { ascending: true });

  const actualizarConId = actualizarProyecto.bind(null, id);
  const generarLotesConId = generarLotes.bind(null, id);

  const conteos = { disponible: 0, prometido_en_venta: 0, escriturado: 0, facturado: 0 };
  for (const l of lotes ?? []) {
    if (l.estado in conteos) conteos[l.estado as keyof typeof conteos]++;
  }

  const manzanas = Array.from(
    new Set((lotes ?? []).map((l) => l.manzana).filter((m): m is string => !!m))
  ).sort();
  const lotesFiltrados = manzanaFiltro
    ? (lotes ?? []).filter((l) => l.manzana === manzanaFiltro)
    : lotes ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{proyecto.nombre}</h1>
        <div className="flex items-center gap-4">
          <Link
            href={`/proyectos/${id}/estado-cuenta`}
            className="text-sm text-slate-500 hover:underline"
          >
            Ver reporte del proyecto
          </Link>
          <Link href="/proyectos" className="text-sm text-slate-500 hover:underline">
            ← Volver a proyectos
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Datos del proyecto</h2>
          <ProyectoForm proyecto={proyecto} action={actualizarConId} error={error} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">Generar lotes</h2>
          <p className="mt-1 text-xs text-slate-500">
            Crea varios lotes de una vez (por ejemplo 50, 100 o 200). Si el proyecto se
            organiza por manzanas, indica el número de manzana: el lote quedará numerado
            como MZLL (ej. manzana 01 + lote 01 = &quot;0101&quot;) y el conteo se reinicia
            en 1 para cada manzana nueva.
          </p>
          <form action={generarLotesConId} className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Manzana (opcional)
              </label>
              <input
                name="manzana"
                placeholder="Ej: 01"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Cantidad</label>
              <input
                type="number"
                name="cantidad"
                min={1}
                max={1000}
                defaultValue={50}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Empezar en el lote N.º
              </label>
              <input
                type="number"
                name="desde"
                min={1}
                defaultValue={1}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-400">
                Usa 1 para una manzana nueva. Sin manzana, indica el siguiente
                número consecutivo (llevas {lotes?.length ?? 0} lotes).
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Prefijo (solo si no usas manzana)
              </label>
              <input
                name="prefijo"
                defaultValue="Lote"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Ciudad</label>
              <input
                name="ciudad"
                defaultValue={proyecto.ciudad ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Superficie (m², opcional)
              </label>
              <input
                type="number"
                step="0.01"
                name="superficie_m2"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Valor de referencia (opcional)
              </label>
              <input
                type="number"
                step="0.01"
                name="valor_referencia"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
              >
                Generar lotes
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Lotes ({lotesFiltrados.length}{manzanaFiltro ? ` de ${lotes?.length ?? 0}` : ""})
          </h2>
          <div className="flex gap-2 text-xs text-slate-500">
            <span>Disponibles: {conteos.disponible}</span>
            <span>Prometidos: {conteos.prometido_en_venta}</span>
            <span>Escriturados: {conteos.escriturado}</span>
            <span>Facturados: {conteos.facturado}</span>
          </div>
        </div>

        {manzanas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <Link
              href={`/proyectos/${id}`}
              className={`rounded-md px-2 py-1 text-xs ${
                !manzanaFiltro
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Todas las manzanas
            </Link>
            {manzanas.map((m) => (
              <Link
                key={m}
                href={`/proyectos/${id}?manzana=${encodeURIComponent(m)}`}
                className={`rounded-md px-2 py-1 text-xs ${
                  manzanaFiltro === m
                    ? "bg-brand text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Mz {m}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-2 max-h-[32rem] overflow-y-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Lote</th>
                <th className="px-4 py-2">Manzana</th>
                <th className="px-4 py-2">Superficie</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lotesFiltrados.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{l.direccion}</td>
                  <td className="px-4 py-2 text-slate-600">{l.manzana ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {l.superficie_m2 ? `${l.superficie_m2} m²` : "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {l.valor_referencia ? formatMoney(l.valor_referencia) : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ESTADO_STYLES[l.estado] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ESTADO_LABELS[l.estado] ?? l.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/propiedades/${l.id}`}
                      className="text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
              {lotesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Todavía no hay lotes generados para este proyecto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
