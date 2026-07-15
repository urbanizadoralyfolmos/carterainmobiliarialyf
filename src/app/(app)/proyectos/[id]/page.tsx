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
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
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
    .order("numero_lote", { ascending: true });

  const actualizarConId = actualizarProyecto.bind(null, id);
  const generarLotesConId = generarLotes.bind(null, id);

  const conteos = { disponible: 0, prometido_en_venta: 0, escriturado: 0, facturado: 0 };
  for (const l of lotes ?? []) {
    if (l.estado in conteos) conteos[l.estado as keyof typeof conteos]++;
  }

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
            Crea varios lotes de una vez (por ejemplo 50, 100 o 200). Cada uno queda como
            una propiedad individual que después podés editar.
          </p>
          <form action={generarLotesConId} className="mt-3 grid grid-cols-2 gap-3">
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
              <label className="block text-xs font-medium text-slate-700">Empezar en el N.º</label>
              <input
                type="number"
                name="desde"
                min={1}
                defaultValue={(lotes?.length ?? 0) + 1}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Prefijo</label>
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
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
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
            Lotes ({lotes?.length ?? 0})
          </h2>
          <div className="flex gap-2 text-xs text-slate-500">
            <span>Disponibles: {conteos.disponible}</span>
            <span>Prometidos: {conteos.prometido_en_venta}</span>
            <span>Escriturados: {conteos.escriturado}</span>
            <span>Facturados: {conteos.facturado}</span>
          </div>
        </div>

        <div className="mt-2 max-h-[32rem] overflow-y-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Lote</th>
                <th className="px-4 py-2">Superficie</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lotes?.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{l.direccion}</td>
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
              {lotes?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
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
