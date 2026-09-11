import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { PrintButton } from "@/components/PrintButton";
import { getEstadoCuentaContrato } from "@/lib/estado-cuenta-contrato";

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  cedido: "Cedido",
  escriturado: "Escriturado",
  cancelado: "Cancelado",
};

const DOWNLOAD_LINKS = [
  { tipo: "excel", etiqueta: "Descargar Excel" },
  { tipo: "pdf", etiqueta: "Descargar PDF" },
];

export default async function EstadoCuentaContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEstadoCuentaContrato(id);

  if (!data) notFound();

  const { contrato, cliente, nombreCliente, propiedades, resumen, cuotasPendientes } = data;
  const detalle = [...resumen.detalle].sort((a, b) => a.numero_cuota - b.numero_cuota);
  const totalSaldoPendiente = cuotasPendientes.reduce((acc, c) => acc + c.saldo, 0);

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/contratos/${id}`} className="text-sm text-slate-500 hover:underline">
          ← Volver al contrato
        </Link>
        <div className="flex gap-2">
          {DOWNLOAD_LINKS.map((link) => (
            <a
              key={link.tipo}
              href={`/api/contratos/${id}/estado-cuenta/${link.tipo}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              {link.etiqueta}
            </a>
          ))}
          <PrintButton />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <h1 className="text-lg font-semibold text-slate-900">
          Estado de cuenta: Contrato N.º {contrato.numero}
        </h1>
        <p className="text-xs text-slate-400">
          Generado el {formatDate(new Date().toISOString().slice(0, 10))}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-4">
            <h2 className="text-xs font-semibold uppercase text-slate-500">Cliente</h2>
            <p className="mt-1 text-sm font-medium text-slate-900">{nombreCliente}</p>
            {cliente?.tipo_persona === "juridica" ? (
              <>
                <p className="text-sm text-slate-600">NIT {cliente.nit ?? "-"}</p>
                {(cliente.representante_nombre || cliente.representante_documento) && (
                  <p className="text-sm text-slate-600">
                    Repr. {cliente.representante_nombre ?? "-"}
                    {cliente.representante_documento
                      ? ` · Doc. ${cliente.representante_documento}`
                      : ""}
                  </p>
                )}
              </>
            ) : (
              cliente?.documento && (
                <p className="text-sm text-slate-600">Doc. {cliente.documento}</p>
              )
            )}
            {cliente?.email && <p className="text-sm text-slate-600">{cliente.email}</p>}
            {cliente?.telefono && <p className="text-sm text-slate-600">{cliente.telefono}</p>}
          </div>

          <div className="rounded-md bg-slate-50 p-4">
            <h2 className="text-xs font-semibold uppercase text-slate-500">
              Propiedad{propiedades.length > 1 ? "es" : ""}
            </h2>
            {propiedades.length > 0 ? (
              propiedades.map((p, i) => (
                <p key={i} className="mt-1 text-sm text-slate-700">
                  {p.proyecto ? `${p.proyecto} · ` : ""}
                  {p.direccion}
                  {p.manzana ? ` · Mz. ${p.manzana}` : ""}
                  {p.numero_lote ? ` · Lote ${p.numero_lote}` : ""}
                </p>
              ))
            ) : (
              <p className="mt-1 text-sm text-slate-400">Sin propiedad asociada</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Tipo de contrato</p>
            <p className="text-sm font-semibold capitalize text-slate-900">{contrato.tipo}</p>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Estado</p>
            <p className="text-sm font-semibold text-slate-900">
              {ESTADO_LABELS[contrato.estado] ?? contrato.estado}
            </p>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Fecha de inicio</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatDate(contrato.fecha_inicio)}
            </p>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Cuota inicial</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatMoney(contrato.cuota_inicial, contrato.moneda)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Total contratado</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatMoney(resumen.totalMonto, contrato.moneda)}
            </p>
          </div>
          <div className="rounded-md bg-green-50 px-3 py-2">
            <p className="text-xs text-slate-500">Total pagado</p>
            <p className="text-sm font-semibold text-green-800">
              {formatMoney(resumen.totalPagado, contrato.moneda)}
            </p>
          </div>
          <div className="rounded-md bg-amber-50 px-3 py-2">
            <p className="text-xs text-slate-500">Saldo pendiente</p>
            <p className="text-sm font-semibold text-amber-800">
              {formatMoney(resumen.totalPendiente, contrato.moneda)}
            </p>
          </div>
          <div className="rounded-md bg-red-50 px-3 py-2">
            <p className="text-xs text-slate-500">Mora acumulada</p>
            <p className="text-sm font-semibold text-red-800">
              {formatMoney(resumen.totalMora, contrato.moneda)}
            </p>
          </div>
        </div>

        <h2 className="mt-6 text-sm font-semibold text-slate-900">Cuotas pendientes de pago</h2>
        {cuotasPendientes.length > 0 ? (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1 pr-3">Cuota</th>
                  <th className="py-1 pr-3">Vencimiento</th>
                  <th className="py-1 pr-3">Monto</th>
                  <th className="py-1 pr-3">Pagado</th>
                  <th className="py-1 pr-3">Saldo</th>
                  <th className="py-1 pr-3">Mora</th>
                  <th className="py-1 pr-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cuotasPendientes.map((c) => (
                  <tr key={c.id}>
                    <td className="py-1 pr-3">
                      {c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`}
                    </td>
                    <td className="py-1 pr-3 text-slate-600">
                      {formatDate(c.fecha_vencimiento)}
                    </td>
                    <td className="py-1 pr-3 text-slate-600">
                      {formatMoney(c.monto, contrato.moneda)}
                    </td>
                    <td className="py-1 pr-3 text-slate-600">
                      {formatMoney(c.monto_pagado, contrato.moneda)}
                    </td>
                    <td className="py-1 pr-3 font-medium text-amber-800">
                      {formatMoney(c.saldo, contrato.moneda)}
                    </td>
                    <td className="py-1 pr-3 text-slate-600">
                      {c.recargo > 0 ? formatMoney(c.recargo, contrato.moneda) : "-"}
                    </td>
                    <td className="py-1 pr-3 text-slate-600">{c.estado}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="py-1 pr-3 font-semibold text-slate-900" colSpan={4}>
                    Total pendiente
                  </td>
                  <td className="py-1 pr-3 font-semibold text-amber-800">
                    {formatMoney(totalSaldoPendiente, contrato.moneda)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            Este contrato no tiene cuotas pendientes de pago.
          </p>
        )}

        <h2 className="mt-6 text-sm font-semibold text-slate-900">Detalle de cuotas</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1 pr-3">Cuota</th>
                <th className="py-1 pr-3">Vencimiento</th>
                <th className="py-1 pr-3">Monto</th>
                <th className="py-1 pr-3">Pagado</th>
                <th className="py-1 pr-3">Mora</th>
                <th className="py-1 pr-3">Fecha de pago</th>
                <th className="py-1 pr-3">Referencia</th>
                <th className="py-1 pr-3">N.º Recibo</th>
                <th className="py-1 pr-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detalle.map((c) => (
                <tr key={c.id}>
                  <td className="py-1 pr-3">
                    {c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">{formatDate(c.fecha_vencimiento)}</td>
                  <td className="py-1 pr-3 text-slate-600">
                    {formatMoney(c.monto, contrato.moneda)}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">
                    {formatMoney(c.monto_pagado, contrato.moneda)}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">
                    {c.recargo > 0 ? formatMoney(c.recargo, contrato.moneda) : "-"}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">{formatDate(c.fecha_pago)}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.referencia ?? "-"}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.numero_recibo ?? "-"}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.estado}</td>
                </tr>
              ))}
              {detalle.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-slate-400">
                    Este contrato todavía no tiene cuotas generadas.
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
