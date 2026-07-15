import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { resumenCuotas } from "@/lib/utils/estado-cuenta";
import { PrintButton } from "@/components/PrintButton";

export default async function EstadoCuentaPropiedadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: propiedad } = await supabase
    .from("propiedades")
    .select("*, proyectos(nombre)")
    .eq("id", id)
    .single();

  if (!propiedad) notFound();

  const { data: contratos } = await supabase
    .from("contratos")
    .select(
      "*, clientes(nombre, apellido, documento), cuotas(id, numero_cuota, fecha_vencimiento, monto, monto_pagado, estado, fecha_pago)"
    )
    .eq("propiedad_id", id)
    .order("created_at", { ascending: false });

  const proyectoRel = propiedad.proyectos as
    | { nombre: string }
    | { nombre: string }[]
    | null
    | undefined;
  const proyecto = Array.isArray(proyectoRel) ? proyectoRel[0] : proyectoRel;

  const contratosConResumen = (contratos ?? []).map((contrato) => ({
    ...contrato,
    resumen: resumenCuotas(contrato.cuotas ?? [], contrato.tasa_mora_mensual),
  }));

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/propiedades/${id}`} className="text-sm text-slate-500 hover:underline">
          ← Volver a la propiedad
        </Link>
        <PrintButton />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <h1 className="text-lg font-semibold text-slate-900">
          Estado de cuenta: {propiedad.direccion}
        </h1>
        <p className="text-sm text-slate-500">
          {proyecto?.nombre ? `${proyecto.nombre} · ` : ""}
          Estado actual: {propiedad.estado}
        </p>

        {contratosConResumen.map((contrato) => (
          <div key={contrato.id} className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Contrato N.º {contrato.numero} ·{" "}
                {contrato.clientes
                  ? `${contrato.clientes.nombre} ${contrato.clientes.apellido}`
                  : "-"}
              </h2>
              <span className="text-xs text-slate-500">{contrato.estado}</span>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-3">
              <div className="rounded-md bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Total contratado</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatMoney(contrato.resumen.totalMonto, contrato.moneda)}
                </p>
              </div>
              <div className="rounded-md bg-green-50 px-3 py-2">
                <p className="text-xs text-slate-500">Pagado</p>
                <p className="text-sm font-semibold text-green-800">
                  {formatMoney(contrato.resumen.totalPagado, contrato.moneda)}
                </p>
              </div>
              <div className="rounded-md bg-amber-50 px-3 py-2">
                <p className="text-xs text-slate-500">Saldo pendiente</p>
                <p className="text-sm font-semibold text-amber-800">
                  {formatMoney(contrato.resumen.totalPendiente, contrato.moneda)}
                </p>
              </div>
            </div>

            <table className="mt-3 min-w-full divide-y divide-slate-200 text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1">Cuota</th>
                  <th className="py-1">Vencimiento</th>
                  <th className="py-1">Monto</th>
                  <th className="py-1">Pagado</th>
                  <th className="py-1">Mora</th>
                  <th className="py-1">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contrato.resumen.detalle
                  .sort((a: { numero_cuota: number }, b: { numero_cuota: number }) => a.numero_cuota - b.numero_cuota)
                  .map((c: import("@/lib/utils/estado-cuenta").CuotaConMora) => (
                    <tr key={c.id}>
                      <td className="py-1">{c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`}</td>
                      <td className="py-1 text-slate-600">{formatDate(c.fecha_vencimiento)}</td>
                      <td className="py-1 text-slate-600">
                        {formatMoney(c.monto, contrato.moneda)}
                      </td>
                      <td className="py-1 text-slate-600">
                        {formatMoney(c.monto_pagado, contrato.moneda)}
                      </td>
                      <td className="py-1 text-slate-600">
                        {c.recargo > 0 ? formatMoney(c.recargo, contrato.moneda) : "-"}
                      </td>
                      <td className="py-1 text-slate-600">{c.estado}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}

        {contratosConResumen.length === 0 && (
          <p className="mt-6 text-center text-sm text-slate-400">
            Esta propiedad todavía no tiene contratos asociados.
          </p>
        )}
      </div>
    </div>
  );
}
