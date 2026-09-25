import Link from "next/link";
import { getReportes, type ReporteTipo } from "@/lib/reportes";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { SelectorProyectoReportes } from "@/components/SelectorProyectoReportes";

function DescargarReporte({
  tipo,
  anio,
  proyecto,
}: {
  tipo: ReporteTipo;
  anio: number;
  proyecto?: string | null;
}) {
  const sufijo = proyecto ? `&proyecto=${proyecto}` : "";
  return (
    <div className="flex gap-2">
      <a
        href={`/api/reportes/${tipo}/excel?anio=${anio}${sufijo}`}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
      >
        Excel
      </a>
      <a
        href={`/api/reportes/${tipo}/pdf?anio=${anio}${sufijo}`}
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
  searchParams: Promise<{ anio?: string; proyecto?: string }>;
}) {
  const { anio: anioParam, proyecto: proyectoParam } = await searchParams;

  const anioActual = new Date().getFullYear();
  const anioParseado = anioParam ? Number(anioParam) : anioActual;
  const anio = Number.isFinite(anioParseado) && anioParseado > 2000 ? anioParseado : anioActual;

  const data = await getReportes(anio, proyectoParam);

  const aniosDisponibles = Array.from(
    new Set([anioActual, anioActual - 1, anioActual - 2, anioActual - 3, anio])
  ).sort((a, b) => b - a);

  const hrefConAnio = (a: number) => {
    const params = new URLSearchParams();
    params.set("anio", String(a));
    if (proyectoParam) params.set("proyecto", proyectoParam);
    return `/reportes?${params.toString()}`;
  };

  const INDICE_REPORTES = [
    { id: "lotes-disponibles", label: "Lotes disponibles" },
    { id: "recaudo-real", label: "Recaudo real" },
    { id: "recaudo-esperado", label: "Recaudo esperado" },
    { id: "recaudo-esperado-anio", label: "Recaudo esperado por año" },
    { id: "vencen-mes", label: "Vencen este mes" },
    { id: "vencidas", label: "Vencidas" },
    { id: "escrituradas", label: "Escriturados" },
    { id: "contratos-a-escriturar", label: "Contratos a escriturar" },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Reportes</h1>

      <SelectorProyectoReportes
        anio={anio}
        proyectoSeleccionado={data.proyectoSeleccionado}
        proyectos={data.proyectosDisponibles}
      />

      <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-3">
        <span className="mr-1 text-sm font-medium text-slate-700">Ir al reporte:</span>
        {INDICE_REPORTES.map((r) => (
          <a
            key={r.id}
            href={`#${r.id}`}
            className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            {r.label}
          </a>
        ))}
      </div>

      {/* 0. Lotes disponibles para venta */}
      <div id="lotes-disponibles" className="mt-4 scroll-mt-20 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Lotes disponibles para venta ({data.totalLotesDisponibles})
          </h2>
          <DescargarReporte tipo="lotes-disponibles" anio={anio} proyecto={proyectoParam} />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Lotes en estado &quot;disponible&quot;, con su área y valor de referencia.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap py-1 pr-3">Dirección</th>
                <th className="whitespace-nowrap py-1 pr-3">Proyecto</th>
                <th className="whitespace-nowrap py-1 pr-3">Manzana</th>
                <th className="whitespace-nowrap py-1 pr-3">Lote</th>
                <th className="whitespace-nowrap py-1 pr-3 text-right">Área (m²)</th>
                <th className="whitespace-nowrap py-1 pr-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.lotesDisponibles.map((l) => (
                <tr key={l.id}>
                  <td className="py-1 pr-3 text-slate-700">
                    <Link href={`/propiedades/${l.id}`} className="hover:underline">
                      {l.direccion}
                    </Link>
                  </td>
                  <td className="py-1 pr-3 text-slate-600">{l.proyecto}</td>
                  <td className="py-1 pr-3 text-slate-600">{l.manzana ?? "-"}</td>
                  <td className="py-1 pr-3 text-slate-600">{l.numero_lote ?? "-"}</td>
                  <td className="py-1 pr-3 text-right text-slate-600">
                    {l.superficie_m2 != null ? l.superficie_m2.toLocaleString("es-CO") : "-"}
                  </td>
                  <td className="py-1 pr-3 text-right font-medium text-slate-900">
                    {l.valor_referencia != null ? formatMoney(l.valor_referencia) : "-"}
                  </td>
                </tr>
              ))}
              {data.lotesDisponibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    No hay lotes disponibles para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
            {data.lotesDisponibles.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="py-1 pr-3 font-semibold text-slate-900" colSpan={4}>
                    Total
                  </td>
                  <td className="py-1 pr-3 text-right font-semibold text-slate-900">
                    {data.totalAreaLotesDisponibles.toLocaleString("es-CO")}
                  </td>
                  <td className="py-1 pr-3 text-right font-semibold text-amber-800">
                    {formatMoney(data.totalValorLotesDisponibles)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 1. Recaudo real por mes y proyecto */}
      <div id="recaudo-real" className="mt-4 scroll-mt-20 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Dinero recaudado (real) por mes y proyecto
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {aniosDisponibles.map((a) => (
                <Link
                  key={a}
                  href={hrefConAnio(a)}
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
            <DescargarReporte tipo="recaudo" anio={anio} proyecto={proyectoParam} />
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
      <div id="recaudo-esperado" className="mt-4 scroll-mt-20 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Dinero recaudado esperado por mes y proyecto
          </h2>
          <DescargarReporte tipo="recaudo-esperado" anio={anio} proyecto={proyectoParam} />
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

      {/* 2b. Recaudo esperado por año y proyecto (todos los años, no solo el seleccionado arriba) */}
      <div id="recaudo-esperado-anio" className="mt-4 scroll-mt-20 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Dinero recaudado esperado por año y proyecto
          </h2>
          <DescargarReporte tipo="recaudo-esperado-por-anio" anio={anio} proyecto={proyectoParam} />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Igual que el reporte anterior pero sumado por año completo: incluye todos los años que
          tengan cuotas programadas, sin importar el año seleccionado arriba.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap py-1 pr-3">Año</th>
                {data.proyectosEsperadoPorAnio.map((p) => (
                  <th key={p} className="whitespace-nowrap py-1 pr-3 text-right">
                    {p}
                  </th>
                ))}
                <th className="whitespace-nowrap py-1 pr-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.filasPorAnioEsperado.map((fila) => (
                <tr key={fila.anio}>
                  <td className="whitespace-nowrap py-1 pr-3 text-slate-700">{fila.anio}</td>
                  {data.proyectosEsperadoPorAnio.map((p) => (
                    <td key={p} className="whitespace-nowrap py-1 pr-3 text-right text-slate-600">
                      {formatMoney(fila.porProyecto[p] ?? 0)}
                    </td>
                  ))}
                  <td className="whitespace-nowrap py-1 pr-3 text-right font-medium text-slate-900">
                    {formatMoney(fila.total)}
                  </td>
                </tr>
              ))}
              {data.filasPorAnioEsperado.length === 0 && (
                <tr>
                  <td
                    colSpan={data.proyectosEsperadoPorAnio.length + 2}
                    className="py-4 text-center text-slate-400"
                  >
                    Todavía no hay cuotas programadas.
                  </td>
                </tr>
              )}
            </tbody>
            {data.filasPorAnioEsperado.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="whitespace-nowrap py-1 pr-3 font-semibold text-slate-900">
                    Total
                  </td>
                  {data.proyectosEsperadoPorAnio.map((p) => (
                    <td
                      key={p}
                      className="whitespace-nowrap py-1 pr-3 text-right font-semibold text-slate-900"
                    >
                      {formatMoney(data.totalesPorProyectoEsperadoPorAnio[p] ?? 0)}
                    </td>
                  ))}
                  <td className="whitespace-nowrap py-1 pr-3 text-right font-semibold text-amber-800">
                    {formatMoney(data.totalGeneralEsperadoPorAnio)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 3. Cuotas que vencen este mes */}
      <div id="vencen-mes" className="mt-4 scroll-mt-20 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Cuotas que vencen este mes ({data.cuotasVencenEsteMes.length})
          </h2>
          <DescargarReporte tipo="vencen-este-mes" anio={anio} proyecto={proyectoParam} />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Cuotas no pagadas con vencimiento entre hoy y fin de mes.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap py-1 pr-3">Cliente</th>
                <th className="whitespace-nowrap py-1 pr-3">Contacto</th>
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
                  <td className="py-1 pr-3 text-slate-600">{c.contactoCliente || "-"}</td>
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
                  <td colSpan={8} className="py-4 text-center text-slate-400">
                    No hay cuotas por vencer en lo que queda del mes.
                  </td>
                </tr>
              )}
            </tbody>
            {data.cuotasVencenEsteMes.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="py-1 pr-3 font-semibold text-slate-900" colSpan={7}>
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
      <div id="vencidas" className="mt-4 scroll-mt-20 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Cuotas vencidas ({data.cuotasVencidas.length})
          </h2>
          <DescargarReporte tipo="vencidas" anio={anio} proyecto={proyectoParam} />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Cuotas no pagadas con fecha de vencimiento anterior a hoy, sin importar el mes.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap py-1 pr-3">Cliente</th>
                <th className="whitespace-nowrap py-1 pr-3">Contacto</th>
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
                  <td className="py-1 pr-3 text-slate-600">{c.contactoCliente || "-"}</td>
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
                  <td colSpan={9} className="py-4 text-center text-slate-400">
                    No hay cuotas vencidas. 🎉
                  </td>
                </tr>
              )}
            </tbody>
            {data.cuotasVencidas.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="py-1 pr-3 font-semibold text-slate-900" colSpan={8}>
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
      <div id="escrituradas" className="mt-4 scroll-mt-20 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Lotes escriturados por proyecto ({data.totalEscrituradas})
          </h2>
          <DescargarReporte tipo="escrituradas" anio={anio} proyecto={proyectoParam} />
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

      {/* 6. Contratos a escriturar por mes y proyecto */}
      <div
        id="contratos-a-escriturar"
        className="mt-4 scroll-mt-20 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Contratos a escriturar por mes y proyecto ({data.totalContratosAEscriturar})
          </h2>
          <DescargarReporte tipo="contratos-a-escriturar" anio={anio} proyecto={proyectoParam} />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Contratos activos o paz y salvo (sin escritura) cuya fecha de escrituración cae en el
          año {anio}, agrupados por mes. Incluye los datos de contacto del cliente para coordinar
          la escrituración.
        </p>
        <div className="mt-3 space-y-4">
          {data.contratosAEscriturarPorMes.map((grupo) => (
            <div key={grupo.clave}>
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                {grupo.mes} ({grupo.contratos.length})
              </h3>
              <div className="mt-1 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap py-1 pr-3">Cliente</th>
                      <th className="whitespace-nowrap py-1 pr-3">Contacto</th>
                      <th className="whitespace-nowrap py-1 pr-3">Propiedad</th>
                      <th className="whitespace-nowrap py-1 pr-3">Proyecto</th>
                      <th className="whitespace-nowrap py-1 pr-3">Contrato</th>
                      <th className="whitespace-nowrap py-1 pr-3">Estado</th>
                      <th className="whitespace-nowrap py-1 pr-3">Fecha de escrituración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grupo.contratos.map((c) => (
                      <tr key={c.id}>
                        <td className="py-1 pr-3 font-medium text-slate-900">{c.nombreCliente}</td>
                        <td className="py-1 pr-3 text-slate-600">{c.contactoCliente || "-"}</td>
                        <td className="py-1 pr-3 text-slate-600">{c.propiedadesTexto || "-"}</td>
                        <td className="py-1 pr-3 text-slate-600">{c.proyectoTexto}</td>
                        <td className="py-1 pr-3 text-slate-600">
                          {c.numeroContrato ? `N.º ${c.numeroContrato}` : "-"}
                        </td>
                        <td className="py-1 pr-3 text-slate-600">{c.estadoTexto}</td>
                        <td className="py-1 pr-3 text-slate-600">
                          {formatDate(c.fechaEscrituracion)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {data.contratosAEscriturarPorMes.length === 0 && (
            <p className="text-sm text-slate-400">
              No hay contratos pendientes de escriturar para este filtro.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
