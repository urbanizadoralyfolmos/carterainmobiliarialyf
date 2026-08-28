import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { resumenCuotas } from "@/lib/utils/estado-cuenta";
import { PrintButton } from "@/components/PrintButton";

export default async function EstadoCuentaClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (!cliente) notFound();

  const { data: contratos } = await supabase
    .from("contratos")
    .select(
      "*, propiedades(direccion, proyectos(nombre)), cuotas(id, numero_cuota, fecha_vencimiento, monto, monto_pagado, estado, fecha_pago)"
    )
    .eq("cliente_id", id)
    .order("created_at", { ascending: false });

  let granTotalMonto = 0;
  let granTotalPagado = 0;
  let granTotalPendiente = 0;
  let granTotalMora = 0;

  const contratosConResumen = (contratos ?? []).map((contrato) => {
    const resumen = resumenCuotas(contrato.cuotas ?? [], contrato.tasa_mora_mensual);
    granTotalMonto += resumen.totalMonto;
    granTotalPagado += resumen.totalPagado;
    granTotalPendiente += resumen.totalPendiente;
    granTotalMora += resumen.totalMora;
    const proyectoRel = contrato.propiedades?.proyectos as
      | { nombre: string }
      | { nombre: string }[]
      | null
      | undefined;
    const proyecto = Array.isArray(proyectoRel) ? proyectoRel[0] : proyectoRel;
    return { ...contrato, resumen, proyecto };
  });

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/clientes/${id}`} className="text-sm text-slate-500 hover:underline">
          ← Volver al cliente
        </Link>
        <PrintButton />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <h1 className="text-lg font-semibold text-slate-900">
          Estado de cuenta: {cliente.nombre} {cliente.apellido}
        </h1>
        {cliente.documento && (
          <p className="text-sm text-slate-500">Doc. {cliente.documento}</p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          Generado el {formatDate(new Date().toISOString().slice(0, 10))}
        </p>

        <div className="mt-4 grid grid-cols-4 gap-3">
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Total contratado</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatMoney(granTotalMonto)}
            </p>
          </div>
          <div className="rounded-md bg-green-50 px-3 py-2">
            <p className="text-xs text-slate-500">Total pagado</p>
            <p className="text-sm font-semibold text-green-800">
              {formatMoney(granTotalPagado)}
            </p>
          </div>
          <div className="rounded-md bg-amber-50 px-3 py-2">
            <p className="text-xs text-slate-500">Saldo pendiente</p>
            <p className="text-sm font-semibold text-amber-800">
              {formatMoney(granTotalPendiente)}
            </p>
          </div>
          <div className="rounded-md bg-red-50 px-3 py-2">
            <p className="text-xs text-slate-500">Mora acumulada</p>
            <p className="text-sm font-semibold text-red-800">
              {formatMoney(granTotalMora)}
            </p>
          </div>
        </div>

        {contratosConResumen.map((contrato) => (
          <div key={contrato.id} className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Contrato N.º {contrato.numero}
                {contrato.proyecto?.nombre ? ` · ${contrato.proyecto.nombre}` : ""}
                {contrato.propiedades?.direccion ? ` · ${contrato.propiedades.direccion}` : ""}
              </h2>
              <span className="text-xs text-slate-500">{contrato.estado}</span>
            </div>

            <table className="mt-2 min-w-full divide-y divide-slate-200 text-sm">
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
            Este cliente todavía no tiene contratos.
          </p>
        )}
      </div>
    </div>
  );
}
