import Link from "next/link";
import { getReportes, type ReporteTipo } from "@/lib/reportes";
import { formatMoney, formatDate } from "@/lib/utils/format";

function DescargarReporte({ tipo, anio }: { tipo: ReporteTipo; anio: number }) {
  return (
    <div className="flex gap-2">
      
        href={`/api/reportes/${tipo}/excel?anio=${anio}`}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
      >
        Excel
      </a>
      
        href={`/api/reportes/${tipo}/pdf?anio=${anio}`}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
      >
        PDF
      </a>
    </div>
  );
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const { anio: anioParam } = await searchParams;

  const anioActual = new Date().getFullYear();
  const anioParseado = anioParam ? Number(anioParam) : anioActual;
  const anio = Number.isFinite(anioParseado) && anioParseado > 2000 ? anioParseado : anioActual;

  const data = await getReportes(anio);

  const aniosDisponibles = Array.from(
    new Set([anioActual, anioActual - 1, anioActual - 2, anioActual - 3, anio])
  ).sort((a, b) => b - a);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Reportes</h1>

      {/* 1. Recaudo real por mes y proyecto */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Dinero recaudado (real) por mes y proyecto
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {aniosDisponibles.map((a) => (
                <Link
                  key={a}
                  href={`/reportes?anio=${a}`}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    a === anio
                      ? "bg-brand text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {a}
                </Link>
              ))}
            </div>
            <DescargarReporte tipo="recaudo" anio={anio} />
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Suma de recibos de pago por fecha de pago. Montos en COP (sin distinguir moneda del
          contrato). El selector de año de arriba aplica a todos los reportes de esta página.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap py-1 pr-3">Mes</th>
                {data.proyectos.map((p) => (
                  <th key={p} className="whitespace-nowrap py-1 pr-3 text-right">
                    {p}
                  </th>
                ))}
                <th className="whitespace-nowrap py-1 pr-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.filasPorMes.map((fila) => (
                <tr key={fila.mes}>
                  <td className="whitespace-nowrap py-1 pr-3 text-slate-700">{fila.nombreMes}</td>
                  {data.proyectos.map((p) => (
                    <td key={p} className="whitespace-nowrap py-1 pr-3 text-right text-slate-600">
                      {formatMoney(fila.porProyecto[p] ?? 0)}
                    </td>
                  ))}
                  <td className="whitespace-nowrap py-1 pr-3 text-right font-medium text-slate-900">
                    {formatMoney(fila.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="whitespace-nowrap py-1 pr-3 font-semibold text-slate-900">
                  Total {anio}
                </td>
                {data.proyectos.map((p) => (
                  <td
                    key={p}
                    className="whitespace-nowrap py-1 pr-3 text-right font-semibold text-slate-900"
                  >
                    {formatMoney(data.totalesPorProyecto[p] ?? 0)}
                  </td>
                ))}
                <td className="whitespace-nowrap py-1 pr-3 text-right font-semibold text-amber-800">
                  {formatMoney(data.totalGeneralAnio)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2. Recaudo esperado por mes y proyecto */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Dinero recaudado esperado por mes y proyecto
          </h2>
          <DescargarReporte tipo="recaudo-esperado" anio={anio} />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Suma del monto de las cuotas según su fecha de vencimiento (sin importar si ya se
          pagaron o no). Muestra lo que debería recaudarse cada mes según el cronograma de pagos.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap py-1 pr-3">Mes</th>
                {data.proyectosEsperado.map((p) => (
                  <th key={p} className="whitespace-nowrap py-1 pr-3 text-right">
                    {p}
                  </th>
                ))}
                <th className="whitespace-nowrap py-1 pr-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.filasPorMesEsperado.map((fila) => (
                <tr key={fila.mes}>
                  <td className="whitespace-nowrap py-1 pr-3 text-slate-700">{fila.nombreMes}</td>
                  {data.proyectosEsperado.map((p) => (
                    <td key={p} className="whitespace-nowrap py-1 pr-3 text-right text-slate-600">
                      {formatMoney(fila.porProyecto[p] ?? 0)}
                    </td>
                  ))}
                  <td className="whitespace-nowrap py-1 pr-3 text-right font-medium text-slate-900">
                    {formatMoney(fila.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="whitespace-nowrap py-1 pr-3 font-semibold text-slate-900">
                  Total {anio}
                </td>
                {data.proyectosEsperado.map((p) => (
                  <td
                    key={p}
                    className="whitespace-nowrap py-1 pr-3 text-right font-semibold text-slate-900"
                  >
                    {formatMoney(data.totalesPorProyectoEsperado[p] ?? 0)}
                  </td>
                ))}
                <td className="whitespace-nowrap py-1 pr-3 text-right font-semibold text-amber-800">
                  {formatMoney(data.totalGeneralAnioEsperado)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. Cuotas que vencen este mes */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Cuotas que vencen este mes ({data.cuotasVencenEsteMes.length})
          </h2>
          <DescargarReporte tipo="vencen-este-mes" anio={anio} />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Cuotas no pagadas con vencimiento entre hoy y fin de mes.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap py-1 pr-3">Cliente</th>
                <th className="whitespace-nowrap py-1 pr-3">Propiedad</th>
                <th className="whitespace-nowrap py-1 pr-3">Proyecto</th>
                <th className="whitespace-nowrap py-1 pr-3">Contrato</th>
                <th className="whitespace-nowrap py-1 pr-3">Cuota</th>
                <th className="whitespace-nowrap py-1 pr-3">Vencimiento</th>
                <th className="whitespace-nowrap py-1 pr-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.cuotasVencenEsteMes.map((c) => (
                <tr key={c.id}>
                  <td className="py-1 pr-3 font-medium text-slate-900">{c.nombreCliente}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.propiedadesTexto || "-"}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.proyectoTexto}</td>
                  <td className="py-1 pr-3 text-slate-600">
                    {c.numeroContrato ? `N.º ${c.numeroContrato}` : "-"}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">
                    {c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">{formatDate(c.fecha_vencimiento)}</td>
                  <td className="py-1 pr-3 text-right font-medium text-slate-900">
                    {formatMoney(c.saldo)}
                  </td>
                </tr>
              ))}
              {data.cuotasVencenEsteMes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-400">
                    No hay cuotas por vencer en lo que queda del mes.
                  </td>
                </tr>
              )}
            </tbody>
            {data.cuotasVencenEsteMes.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="py-1 pr-3 font-semibold text-slate-900" colSpan={6}>
                    Total
                  </td>
                  <td className="py-1 pr-3 text-right font-semibold text-slate-900">
                    {formatMoney(data.totalVencenEsteMes)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 4. Cuotas vencidas */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Cuotas vencidas ({data.cuotasVencidas.length})
          </h2>
          <DescargarReporte tipo="vencidas" anio={anio} />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Cuotas no pagadas con fecha de vencimiento anterior a hoy, sin importar el mes.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap py-1 pr-3">Cliente</th>
                <th className="whitespace-nowrap py-1 pr-3">Propiedad</th>
                <th className="whitespace-nowrap py-1 pr-3">Proyecto</th>
                <th className="whitespace-nowrap py-1 pr-3">Contrato</th>
                <th className="whitespace-nowrap py-1 pr-3">Cuota</th>
                <th className="whitespace-nowrap py-1 pr-3">Vencimiento</th>
                <th className="whitespace-nowrap py-1 pr-3">Días vencida</th>
                <th className="whitespace-nowrap py-1 pr-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.cuotasVencidas.map((c) => (
                <tr key={c.id} className="bg-red-50/40">
                  <td className="py-1 pr-3 font-medium text-slate-900">{c.nombreCliente}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.propiedadesTexto || "-"}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.proyectoTexto}</td>
                  <td className="py-1 pr-3 text-slate-600">
                    {c.numeroContrato ? `N.º ${c.numeroContrato}` : "-"}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">
                    {c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">{formatDate(c.fecha_vencimiento)}</td>
                  <td className="py-1 pr-3 text-red-700">{c.diasMora ?? 0} días</td>
                  <td className="py-1 pr-3 text-right font-medium text-slate-900">
                    {formatMoney(c.saldo)}
                  </td>
                </tr>
              ))}
              {data.cuotasVencidas.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400">
                    No hay cuotas vencidas. 🎉
                  </td>
                </tr>
              )}
            </tbody>
            {data.cuotasVencidas.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="py-1 pr-3 font-semibold text-slate-900" colSpan={7}>
                    Total
                  </td>
                  <td className="py-1 pr-3 text-right font-semibold text-amber-800">
                    {formatMoney(data.totalVencidas)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 5. Lotes escriturados por proyecto */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Lotes escriturados por proyecto ({data.totalEscrituradas})
          </h2>
          <DescargarReporte tipo="escrituradas" anio={anio} />
        </div>
        <div className="mt-3 space-y-4">
          {data.escrituradasPorProyecto.map((grupo) => (
            <div key={grupo.proyecto}>
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                {grupo.proyecto} ({grupo.lotes.length})
              </h3>
              <div className="mt-1 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap py-1 pr-3">Dirección</th>
                      <th className="whitespace-nowrap py-1 pr-3">Manzana</th>
                      <th className="whitespace-nowrap py-1 pr-3">Lote</th>
                      <th className="whitespace-nowrap py-1 pr-3">N.º Escritura</th>
                      <th className="whitespace-nowrap py-1 pr-3">Fecha escritura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grupo.lotes.map((p) => (
                      <tr key={p.id}>
                        <td className="py-1 pr-3 text-slate-700">
                          <Link href={`/propiedades/${p.id}`} className="hover:underline">
                            {p.direccion}
                          </Link>
                        </td>
                        <td className="py-1 pr-3 text-slate-600">{p.manzana ?? "-"}</td>
                        <td className="py-1 pr-3 text-slate-600">{p.numero_lote ?? "-"}</td>
                        <td className="py-1 pr-3 text-slate-600">
                          {p.numero_escritura ?? "-"}
                        </td>
                        <td className="py-1 pr-3 text-slate-600">
                          {formatDate(p.fecha_escritura)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {data.escrituradasPorProyecto.length === 0 && (
            <p className="text-sm text-slate-400">Todavía no hay lotes escriturados.</p>
          )}
        </div>
      </div>
    </div>
  );
}
