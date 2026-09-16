import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { PrintButton } from "@/components/PrintButton";
import { OtrosiPlanPagoForm } from "@/components/OtrosiPlanPagoForm";
import { getEstadoCuentaContrato } from "@/lib/estado-cuenta-contrato";
import { agregarCuota, eliminarCuota } from "@/app/(app)/cuotas/actions";
import { cederContrato, reestructurarPlanPago } from "@/app/(app)/contratos/actions";
import { esAdmin } from "@/lib/auth/rol";

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  paz_y_salvo_sin_escritura: "Paz y salvo sin escritura",
  escriturado: "Escriturado",
  anulado: "Anulado",
};

type CuotaSnapshot = { numero_cuota: number; fecha_vencimiento: string; monto: number };

const DOWNLOAD_LINKS = [
  { tipo: "excel", etiqueta: "Descargar Excel" },
  { tipo: "pdf", etiqueta: "Descargar PDF" },
];

export default async function EstadoCuentaContratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; cedido?: string; otrosi?: string }>;
}) {
  const { id } = await params;
  const { error, cedido, otrosi } = await searchParams;
  const data = await getEstadoCuentaContrato(id);
  const admin = await esAdmin();

  if (!data) notFound();

  const { contrato, cliente, nombreCliente, propiedades, resumen, cuotasPendientes } = data;
  const detalle = [...resumen.detalle].sort((a, b) => a.numero_cuota - b.numero_cuota);
  const totalSaldoPendiente = cuotasPendientes.reduce((acc, c) => acc + c.saldo, 0);

  // Saldo elegible para un otrosí: solo cuotas "pendiente" (sin ningún
  // abono todavía). Las que tienen abono parcial o ya están pagadas no se
  // tocan con la reestructuración.
  const saldoReestructurable = detalle
    .filter((c) => c.estado === "pendiente")
    .reduce((acc, c) => acc + c.monto, 0);

  const supabase = await createClient();
  const [{ data: clientesData }, { data: cesionesData }, { data: otrosiesData }] =
    await Promise.all([
      supabase.from("clientes").select("id, nombre, apellido").order("apellido"),
      supabase
        .from("cesiones_contrato")
        .select(
          "id, fecha, nota, cliente_anterior:clientes!cesiones_contrato_cliente_anterior_id_fkey(nombre, apellido), cliente_nuevo:clientes!cesiones_contrato_cliente_nuevo_id_fkey(nombre, apellido)"
        )
        .eq("contrato_id", id)
        .order("fecha", { ascending: false }),
      supabase
        .from("otrosies_contrato")
        .select("id, fecha, motivo, saldo_reestructurado, cuotas_anteriores, cuotas_nuevas")
        .eq("contrato_id", id)
        .order("fecha", { ascending: false }),
    ]);

  type ClienteNombre = { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null;
  function nombreDe(rel: ClienteNombre) {
    const c = Array.isArray(rel) ? rel[0] : rel;
    return c ? `${c.apellido}, ${c.nombre}` : "-";
  }

  const clientesParaCeder = (clientesData ?? []).filter((c) => c.id !== contrato.cliente_id);

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/contratos" className="text-sm text-slate-500 hover:underline">
          ← Volver a contratos
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

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">
          {error}
        </p>
      )}
      {cedido && (
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 print:hidden">
          Cesión registrada correctamente.
        </p>
      )}
      {otrosi && (
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 print:hidden">
          Otrosí registrado y plan de cuotas reestructurado.
        </p>
      )}

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

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  <td></td>
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
                <th className="py-1 pr-3">Fecha de pago</th>
                <th className="py-1 pr-3">Referencia</th>
                <th className="py-1 pr-3">N.º Recibo</th>
                <th className="py-1 pr-3">Estado</th>
                <th className="py-1 pr-3 text-right print:hidden">Acciones</th>
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
                  <td className="py-1 pr-3 text-slate-600">{formatDate(c.fecha_pago)}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.referencia ?? "-"}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.numero_recibo ?? "-"}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.estado}</td>
                  <td className="py-1 pr-3 text-right print:hidden">
                    {admin ? (
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <Link
                          href={`/cuotas/${c.id}/editar`}
                          className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
                        >
                          Editar
                        </Link>
                        <form action={eliminarCuota.bind(null, c.id, contrato.id)}>
                          <button
                            type="submit"
                            className="text-xs text-red-600 hover:text-red-800 hover:underline"
                          >
                            Eliminar
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
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

        <div className="mt-4 rounded-md border border-dashed border-slate-300 p-3 print:hidden">
          <h3 className="text-xs font-semibold uppercase text-slate-500">
            Agregar cuota faltante
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Se agrega al final del plan (con el siguiente número de cuota disponible).
          </p>
          <form
            action={agregarCuota.bind(null, contrato.id)}
            className="mt-2 flex flex-wrap items-end gap-2"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Fecha de vencimiento
              </label>
              <input
                type="date"
                name="fecha_vencimiento"
                required
                className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Monto ({contrato.moneda})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="monto"
                required
                className="mt-1 w-36 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Agregar cuota
            </button>
          </form>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 print:hidden">
          <h2 className="text-sm font-semibold text-slate-900">Cesiones</h2>
          <p className="mt-1 text-xs text-slate-400">
            Cuando el comprador cede sus derechos a un tercero, el contrato sigue con su
            estado normal (no existe un estado &quot;cedido&quot;); aquí queda el registro de
            quién era el titular antes y quién es ahora.
          </p>

          {(cesionesData?.length ?? 0) > 0 && (
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-1 pr-3">Fecha</th>
                    <th className="py-1 pr-3">De</th>
                    <th className="py-1 pr-3">A</th>
                    <th className="py-1 pr-3">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cesionesData!.map((c) => (
                    <tr key={c.id}>
                      <td className="py-1 pr-3 text-slate-600">{formatDate(c.fecha)}</td>
                      <td className="py-1 pr-3 text-slate-600">{nombreDe(c.cliente_anterior)}</td>
                      <td className="py-1 pr-3 font-medium text-slate-900">
                        {nombreDe(c.cliente_nuevo)}
                      </td>
                      <td className="py-1 pr-3 text-slate-500">{c.nota ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {admin && (
            <form
              action={cederContrato.bind(null, contrato.id)}
              className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-slate-300 p-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Ceder contrato a
                </label>
                <select
                  name="cliente_nuevo_id"
                  required
                  defaultValue=""
                  className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="" disabled>
                    Seleccionar cliente...
                  </option>
                  {clientesParaCeder.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.apellido}, {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Fecha</label>
                <input
                  type="date"
                  name="fecha"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="min-w-[16rem] flex-1">
                <label className="block text-xs font-medium text-slate-700">
                  Nota (opcional)
                </label>
                <input
                  type="text"
                  name="nota"
                  placeholder="Ej: cesión notarial N.º..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
              >
                Ceder contrato
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 print:hidden">
          <h2 className="text-sm font-semibold text-slate-900">Otrosíes (cambios de forma de pago)</h2>
          <p className="mt-1 text-xs text-slate-400">
            Reestructura el saldo pendiente (solo cuotas sin ningún abono) en un nuevo plan de
            cuotas. Queda registrado el motivo y las cuotas antes/después.
          </p>

          {(otrosiesData?.length ?? 0) > 0 && (
            <div className="mt-2 space-y-2">
              {otrosiesData!.map((o) => {
                const anteriores = (o.cuotas_anteriores as CuotaSnapshot[] | null) ?? [];
                const nuevas = (o.cuotas_nuevas as CuotaSnapshot[] | null) ?? [];
                return (
                  <div key={o.id} className="rounded-md bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-900">
                      {formatDate(o.fecha)} · {formatMoney(o.saldo_reestructurado, contrato.moneda)}{" "}
                      reestructurados en {nuevas.length} cuota{nuevas.length === 1 ? "" : "s"}{" "}
                      (antes {anteriores.length})
                    </p>
                    <p className="mt-1 text-slate-600">{o.motivo}</p>
                  </div>
                );
              })}
            </div>
          )}

          {admin && (
            <div className="mt-3 rounded-md border border-dashed border-slate-300 p-3">
              {saldoReestructurable > 0 ? (
                <OtrosiPlanPagoForm
                  action={reestructurarPlanPago.bind(null, contrato.id)}
                  saldoPendiente={saldoReestructurable}
                  moneda={contrato.moneda}
                  diaVencimientoActual={contrato.dia_vencimiento}
                />
              ) : (
                <p className="text-sm text-slate-400">
                  Este contrato no tiene cuotas pendientes sin abonos para reestructurar (las
                  cuotas con abono parcial no se incluyen automáticamente; edítalas
                  manualmente si hace falta).
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
