import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { calcularMora } from "@/lib/utils/mora";

type ProyectoRel = { nombre: string } | { nombre: string }[] | null | undefined;

function nombreProyecto(rel: ProyectoRel) {
  if (Array.isArray(rel)) return rel[0]?.nombre ?? "";
  return rel?.nombre ?? "";
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

type ClienteRel = {
  nombre: string;
  apellido: string;
  razon_social: string | null;
  tipo_persona: string;
} | null;

type ContratoConPropiedadesRel = {
  numero: number;
  moneda?: string;
  clientes?: ClienteRel;
  contrato_propiedades?: { propiedades: { direccion: string; proyectos?: ProyectoRel } | null }[];
} | null;

type RecibosPorMesRow = {
  monto: number;
  fecha_pago: string;
  cuotas: { contratos: ContratoConPropiedadesRel } | null;
};

type CuotaReporteRow = {
  id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto: number;
  monto_pagado: number;
  estado: string;
  contratos: ContratoConPropiedadesRel;
};

type PropiedadEscrituradaRow = {
  id: string;
  direccion: string;
  manzana: string | null;
  numero_lote: string | null;
  numero_escritura: string | null;
  fecha_escritura: string | null;
  proyectos?: ProyectoRel;
};

function nombreClienteDe(cliente: ClienteRel) {
  if (!cliente) return "-";
  if (cliente.tipo_persona === "juridica" && cliente.razon_social) return cliente.razon_social;
  return `${cliente.apellido}, ${cliente.nombre}`;
}

function propiedadesTextoDe(contrato: ContratoConPropiedadesRel) {
  return (contrato?.contrato_propiedades ?? [])
    .map((cp) => cp.propiedades?.direccion)
    .filter(Boolean)
    .join(", ");
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const { anio: anioParam } = await searchParams;
  const supabase = await createClient();

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const anioParseado = anioParam ? Number(anioParam) : anioActual;
  const anio = Number.isFinite(anioParseado) && anioParseado > 2000 ? anioParseado : anioActual;

  const hoyStr = hoy.toISOString().slice(0, 10);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [{ data: recibosData }, { data: cuotasData }, { data: escrituradasData }] =
    await Promise.all([
      supabase
        .from("recibos")
        .select(
          "monto, fecha_pago, cuotas(contratos(contrato_propiedades(propiedades(direccion, proyectos(nombre)))))"
        )
        .gte("fecha_pago", `${anio}-01-01`)
        .lte("fecha_pago", `${anio}-12-31`),
      supabase
        .from("cuotas")
        .select(
          "id, numero_cuota, fecha_vencimiento, monto, monto_pagado, estado, contratos(numero, moneda, clientes(nombre, apellido, razon_social, tipo_persona), contrato_propiedades(propiedades(direccion, proyectos(nombre))))"
        )
        .neq("estado", "pagada")
        .order("fecha_vencimiento", { ascending: true }),
      supabase
        .from("propiedades")
        .select(
          "id, direccion, manzana, numero_lote, numero_escritura, fecha_escritura, proyectos(nombre)"
        )
        .eq("estado", "escriturado")
        .order("direccion"),
    ]);

  // --- 1) Dinero recaudado por mes y proyecto ---
  const proyectosSet = new Set<string>();
  const porMesProyecto = new Map<number, Map<string, number>>();
  for (let m = 1; m <= 12; m++) porMesProyecto.set(m, new Map());

  for (const r of (recibosData ?? []) as unknown as RecibosPorMesRow[]) {
    const mes = Number(r.fecha_pago.slice(5, 7));
    const contrato = r.cuotas?.contratos ?? null;
    const nombresProyectos = (contrato?.contrato_propiedades ?? [])
      .map((cp) => nombreProyecto(cp.propiedades?.proyectos))
      .filter(Boolean);
    const proyectosDelRecibo =
      nombresProyectos.length > 0 ? Array.from(new Set(nombresProyectos)) : ["Sin proyecto"];

    for (const nombre of proyectosDelRecibo) {
      proyectosSet.add(nombre);
      const fila = porMesProyecto.get(mes);
      if (fila) fila.set(nombre, (fila.get(nombre) ?? 0) + Number(r.monto));
    }
  }

  const proyectosOrdenados = Array.from(proyectosSet).sort((a, b) => {
    if (a === "Sin proyecto") return 1;
    if (b === "Sin proyecto") return -1;
    return a.localeCompare(b);
  });

  const totalesPorProyecto = new Map<string, number>();
  let totalGeneralAnio = 0;
  const totalesPorMes = new Map<number, number>();
  for (let m = 1; m <= 12; m++) {
    const fila = porMesProyecto.get(m) ?? new Map<string, number>();
    let totalMes = 0;
    for (const p of proyectosOrdenados) {
      const v = fila.get(p) ?? 0;
      totalesPorProyecto.set(p, (totalesPorProyecto.get(p) ?? 0) + v);
      totalMes += v;
    }
    totalesPorMes.set(m, totalMes);
    totalGeneralAnio += totalMes;
  }

  const aniosDisponibles = Array.from(
    new Set([anioActual, anioActual - 1, anioActual - 2, anioActual - 3, anio])
  ).sort((a, b) => b - a);

  // --- 2) Cuotas que vencen este mes (de hoy en adelante) ---
  const cuotasBase = ((cuotasData ?? []) as unknown as CuotaReporteRow[]).map((c) => ({
    ...c,
    nombreCliente: nombreClienteDe(c.contratos?.clientes ?? null),
    propiedadesTexto: propiedadesTextoDe(c.contratos),
    saldo: Math.max(0, c.monto - c.monto_pagado),
  }));

  const cuotasVencenEsteMes = cuotasBase
    .filter((c) => c.fecha_vencimiento >= hoyStr && c.fecha_vencimiento <= finMes)
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
  const totalVencenEsteMes = cuotasVencenEsteMes.reduce((acc, c) => acc + c.saldo, 0);

  // --- 3) Cuotas ya vencidas (cualquier mes anterior a hoy) ---
  const cuotasVencidas = cuotasBase
    .filter((c) => c.fecha_vencimiento < hoyStr)
    .map((c) => ({
      ...c,
      diasMora: calcularMora({ fecha_vencimiento: c.fecha_vencimiento, estado: c.estado })
        .diasMora,
    }))
    .sort((a, b) => b.diasMora - a.diasMora);
  const totalVencidas = cuotasVencidas.reduce((acc, c) => acc + c.saldo, 0);

  // --- 4) Lotes escriturados por proyecto ---
  const escrituradasPorProyecto = new Map<string, PropiedadEscrituradaRow[]>();
  for (const p of (escrituradasData ?? []) as unknown as PropiedadEscrituradaRow[]) {
    const nombre = nombreProyecto(p.proyectos) || "Sin proyecto";
    if (!escrituradasPorProyecto.has(nombre)) escrituradasPorProyecto.set(nombre, []);
    escrituradasPorProyecto.get(nombre)?.push(p);
  }
  const proyectosEscriturados = Array.from(escrituradasPorProyecto.keys()).sort((a, b) => {
    if (a === "Sin proyecto") return 1;
    if (b === "Sin proyecto") return -1;
    return a.localeCompare(b);
  });
  const totalEscrituradas = escrituradasData?.length ?? 0;

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Reportes</h1>

      {/* 1. Recaudo por mes y proyecto */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Dinero recaudado por mes y proyecto
          </h2>
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
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Suma de recibos de pago por fecha de pago. Montos en COP (sin distinguir moneda del
          contrato).
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap py-1 pr-3">Mes</th>
                {proyectosOrdenados.map((p) => (
                  <th key={p} className="whitespace-nowrap py-1 pr-3 text-right">
                    {p}
                  </th>
                ))}
                <th className="whitespace-nowrap py-1 pr-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MESES.map((nombreMes, idx) => {
                const m = idx + 1;
                const fila = porMesProyecto.get(m) ?? new Map<string, number>();
                return (
                  <tr key={m}>
                    <td className="whitespace-nowrap py-1 pr-3 text-slate-700">{nombreMes}</td>
                    {proyectosOrdenados.map((p) => (
                      <td key={p} className="whitespace-nowrap py-1 pr-3 text-right text-slate-600">
                        {formatMoney(fila.get(p) ?? 0)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap py-1 pr-3 text-right font-medium text-slate-900">
                      {formatMoney(totalesPorMes.get(m) ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="whitespace-nowrap py-1 pr-3 font-semibold text-slate-900">
                  Total {anio}
                </td>
                {proyectosOrdenados.map((p) => (
                  <td
                    key={p}
                    className="whitespace-nowrap py-1 pr-3 text-right font-semibold text-slate-900"
                  >
                    {formatMoney(totalesPorProyecto.get(p) ?? 0)}
                  </td>
                ))}
                <td className="whitespace-nowrap py-1 pr-3 text-right font-semibold text-amber-800">
                  {formatMoney(totalGeneralAnio)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2. Cuotas que vencen este mes */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Cuotas que vencen este mes ({cuotasVencenEsteMes.length})
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Cuotas no pagadas con vencimiento entre hoy y fin de mes.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap py-1 pr-3">Cliente</th>
                <th className="whitespace-nowrap py-1 pr-3">Propiedad</th>
                <th className="whitespace-nowrap py-1 pr-3">Contrato</th>
                <th className="whitespace-nowrap py-1 pr-3">Cuota</th>
                <th className="whitespace-nowrap py-1 pr-3">Vencimiento</th>
                <th className="whitespace-nowrap py-1 pr-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cuotasVencenEsteMes.map((c) => (
                <tr key={c.id}>
                  <td className="py-1 pr-3 font-medium text-slate-900">{c.nombreCliente}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.propiedadesTexto || "-"}</td>
                  <td className="py-1 pr-3 text-slate-600">
                    {c.contratos?.numero ? `N.º ${c.contratos.numero}` : "-"}
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
              {cuotasVencenEsteMes.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    No hay cuotas por vencer en lo que queda del mes.
                  </td>
                </tr>
              )}
            </tbody>
            {cuotasVencenEsteMes.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="py-1 pr-3 font-semibold text-slate-900" colSpan={5}>
                    Total
                  </td>
                  <td className="py-1 pr-3 text-right font-semibold text-slate-900">
                    {formatMoney(totalVencenEsteMes)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 3. Cuotas vencidas */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Cuotas vencidas ({cuotasVencidas.length})
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Cuotas no pagadas con fecha de vencimiento anterior a hoy, sin importar el mes.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap py-1 pr-3">Cliente</th>
                <th className="whitespace-nowrap py-1 pr-3">Propiedad</th>
                <th className="whitespace-nowrap py-1 pr-3">Contrato</th>
                <th className="whitespace-nowrap py-1 pr-3">Cuota</th>
                <th className="whitespace-nowrap py-1 pr-3">Vencimiento</th>
                <th className="whitespace-nowrap py-1 pr-3">Días vencida</th>
                <th className="whitespace-nowrap py-1 pr-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cuotasVencidas.map((c) => (
                <tr key={c.id} className="bg-red-50/40">
                  <td className="py-1 pr-3 font-medium text-slate-900">{c.nombreCliente}</td>
                  <td className="py-1 pr-3 text-slate-600">{c.propiedadesTexto || "-"}</td>
                  <td className="py-1 pr-3 text-slate-600">
                    {c.contratos?.numero ? `N.º ${c.contratos.numero}` : "-"}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">
                    {c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`}
                  </td>
                  <td className="py-1 pr-3 text-slate-600">{formatDate(c.fecha_vencimiento)}</td>
                  <td className="py-1 pr-3 text-red-700">{c.diasMora} días</td>
                  <td className="py-1 pr-3 text-right font-medium text-slate-900">
                    {formatMoney(c.saldo)}
                  </td>
                </tr>
              ))}
              {cuotasVencidas.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-400">
                    No hay cuotas vencidas. 🎉
                  </td>
                </tr>
              )}
            </tbody>
            {cuotasVencidas.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td className="py-1 pr-3 font-semibold text-slate-900" colSpan={6}>
                    Total
                  </td>
                  <td className="py-1 pr-3 text-right font-semibold text-amber-800">
                    {formatMoney(totalVencidas)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 4. Lotes escriturados por proyecto */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Lotes escriturados por proyecto ({totalEscrituradas})
        </h2>
        <div className="mt-3 space-y-4">
          {proyectosEscriturados.map((nombreProy) => {
            const items = escrituradasPorProyecto.get(nombreProy) ?? [];
            return (
              <div key={nombreProy}>
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {nombreProy} ({items.length})
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
                      {items.map((p) => (
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
            );
          })}
          {proyectosEscriturados.length === 0 && (
            <p className="text-sm text-slate-400">Todavía no hay lotes escriturados.</p>
          )}
        </div>
      </div>
    </div>
  );
}
