import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { resumenCuotas } from "@/lib/utils/estado-cuenta";
import { PrintButton } from "@/components/PrintButton";

export default async function ReporteProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .single();

  if (!proyecto) notFound();

  const { data: propiedades } = await supabase
    .from("propiedades")
    .select(
      "*, contratos(*, clientes(nombre, apellido), cuotas(id, numero_cuota, fecha_vencimiento, monto, monto_pagado, estado, fecha_pago))"
    )
    .eq("proyecto_id", id)
    .order("numero_lote", { ascending: true });

  const filas = (propiedades ?? []).map((p) => {
    // contrato vigente más reciente que no esté cancelado (si existe)
    const contratosOrdenados = [...(p.contratos ?? [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const contrato = contratosOrdenados.find((c) => c.estado !== "cancelado") ?? null;
    const resumen = contrato
      ? resumenCuotas(contrato.cuotas ?? [], contrato.tasa_mora_mensual)
      : null;
    return { propiedad: p, contrato, resumen };
  });

  const vendidas = filas.filter((f) => f.contrato);
  const disponibles = filas.filter((f) => !f.contrato);

  let totalVendido = 0;
  let totalRecaudado = 0;
  let totalPendiente = 0;
  for (const f of vendidas) {
    if (f.resumen) {
      totalVendido += f.resumen.totalMonto;
      totalRecaudado += f.resumen.totalPagado;
      totalPendiente += f.resumen.totalPendiente;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/proyectos/${id}`} className="text-sm text-slate-500 hover:underline">
          ← Volver al proyecto
        </Link>
        <PrintButton />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <h1 className="text-lg font-semibold text-slate-900">
          Reporte del proyecto: {proyecto.nombre}
        </h1>
        <p className="text-xs text-slate-400">
          Generado el {formatDate(new Date().toISOString().slice(0, 10))}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Total lotes</p>
            <p className="text-sm font-semibold text-slate-900">{filas.length}</p>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Vendidos</p>
            <p className="text-sm font-semibold text-slate-900">{vendidas.length}</p>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Disponibles</p>
            <p className="text-sm font-semibold text-slate-900">{disponibles.length}</p>
          </div>
          <div className="rounded-md bg-green-50 px-3 py-2">
            <p className="text-xs text-slate-500">Recaudado</p>
            <p className="text-sm font-semibold text-green-800">
              {formatMoney(totalRecaudado)}
            </p>
          </div>
          <div className="rounded-md bg-amber-50 px-3 py-2">
            <p className="text-xs text-slate-500">Saldo pendiente</p>
            <p className="text-sm font-semibold text-amber-800">
              {formatMoney(totalPendiente)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Valor total vendido: <span className="font-medium text-slate-700">{formatMoney(totalVendido)}</span>
        </p>

        <h2 className="mt-6 text-sm font-semibold text-slate-900">
          Propiedades vendidas ({vendidas.length})
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1 pr-3">Lote</th>
                <th className="py-1 pr-3">Cliente</th>
                <th className="py-1 pr-3">Contrato</th>
                <th className="py-1 pr-3">Estado</th>
                <th className="py-1 pr-3">Valor</th>
                <th className="py-1 pr-3">Recaudado</th>
                <th className="py-1 pr-3">Saldo pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendidas.map((f) => (
                <tr key={f.propiedad.id}>
                  <td className="py-1 pr-3 font-medium text-slate-900">
                    {f.propiedad.direccion}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">
                    {f.contrato?.clientes
                      ? `${f.contrato.clientes.nombre} ${f.contrato.clientes.apellido}`
                      : "-"}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">
                    N.º {f.contrato?.numero}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">{f.contrato?.estado}</td>
                  <td className="py-1 pr-3 text-slate-600">
                    {formatMoney(f.resumen?.totalMonto ?? 0, f.contrato?.moneda)}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">
                    {formatMoney(f.resumen?.totalPagado ?? 0, f.contrato?.moneda)}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">
                    {formatMoney(f.resumen?.totalPendiente ?? 0, f.contrato?.moneda)}
                  </td>
                </tr>
              ))}
              {vendidas.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-400">
                    Todavía no hay propiedades vendidas en este proyecto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="mt-6 text-sm font-semibold text-slate-900 print:hidden">
          Propiedades disponibles ({disponibles.length})
        </h2>
        <div className="mt-2 flex flex-wrap gap-1 print:hidden">
          {disponibles.map((f) => (
            <span
              key={f.propiedad.id}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {f.propiedad.direccion}
            </span>
          ))}
          {disponibles.length === 0 && (
            <span className="text-sm text-slate-400">No quedan lotes disponibles.</span>
          )}
        </div>
      </div>
    </div>
  );
}
