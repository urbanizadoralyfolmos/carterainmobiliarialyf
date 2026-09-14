import { createClient } from "@/lib/supabase/server";
import { calcularMora } from "@/lib/utils/mora";

type ProyectoRel = { nombre: string } | { nombre: string }[] | null | undefined;

function nombreProyecto(rel: ProyectoRel) {
  if (Array.isArray(rel)) return rel[0]?.nombre ?? "";
  return rel?.nombre ?? "";
}

export const MESES = [
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

export type PropiedadEscrituradaRow = {
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

export type ReporteMesFila = {
  mes: number;
  nombreMes: string;
  porProyecto: Record<string, number>;
  total: number;
};

export type ReporteCuota = {
  id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  nombreCliente: string;
  propiedadesTexto: string;
  numeroContrato: number | null;
  saldo: number;
  diasMora?: number;
};

export type ReporteEscrituraProyecto = {
  proyecto: string;
  lotes: PropiedadEscrituradaRow[];
};

export type ReportesData = {
  anio: number;
  proyectos: string[];
  filasPorMes: ReporteMesFila[];
  totalesPorProyecto: Record<string, number>;
  totalGeneralAnio: number;
  cuotasVencenEsteMes: ReporteCuota[];
  totalVencenEsteMes: number;
  cuotasVencidas: ReporteCuota[];
  totalVencidas: number;
  escrituradasPorProyecto: ReporteEscrituraProyecto[];
  totalEscrituradas: number;
};

/**
 * Calcula todos los datos del módulo de Reportes (recaudo por mes/proyecto,
 * cuotas por vencer este mes, cuotas vencidas y lotes escriturados por
 * proyecto). Se usa tanto en la página de pantalla como en los endpoints de
 * exportación a Excel y PDF, para no duplicar la consulta ni la lógica.
 */
export async function getReportes(anio: number): Promise<ReportesData> {
  const supabase = await createClient();

  const hoy = new Date();
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

  const proyectos = Array.from(proyectosSet).sort((a, b) => {
    if (a === "Sin proyecto") return 1;
    if (b === "Sin proyecto") return -1;
    return a.localeCompare(b);
  });

  const totalesPorProyecto: Record<string, number> = {};
  let totalGeneralAnio = 0;
  const filasPorMes: ReporteMesFila[] = [];
  for (let m = 1; m <= 12; m++) {
    const fila = porMesProyecto.get(m) ?? new Map<string, number>();
    const porProyecto: Record<string, number> = {};
    let total = 0;
    for (const p of proyectos) {
      const v = fila.get(p) ?? 0;
      porProyecto[p] = v;
      totalesPorProyecto[p] = (totalesPorProyecto[p] ?? 0) + v;
      total += v;
    }
    filasPorMes.push({ mes: m, nombreMes: MESES[m - 1], porProyecto, total });
    totalGeneralAnio += total;
  }

  // --- 2) y 3) Cuotas por vencer este mes / ya vencidas ---
  const cuotasBase = ((cuotasData ?? []) as unknown as CuotaReporteRow[]).map((c) => ({
    id: c.id,
    numero_cuota: c.numero_cuota,
    fecha_vencimiento: c.fecha_vencimiento,
    estado: c.estado,
    nombreCliente: nombreClienteDe(c.contratos?.clientes ?? null),
    propiedadesTexto: propiedadesTextoDe(c.contratos),
    numeroContrato: c.contratos?.numero ?? null,
    saldo: Math.max(0, c.monto - c.monto_pagado),
  }));

  const cuotasVencenEsteMes: ReporteCuota[] = cuotasBase
    .filter((c) => c.fecha_vencimiento >= hoyStr && c.fecha_vencimiento <= finMes)
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
  const totalVencenEsteMes = cuotasVencenEsteMes.reduce((acc, c) => acc + c.saldo, 0);

  const cuotasVencidas: ReporteCuota[] = cuotasBase
    .filter((c) => c.fecha_vencimiento < hoyStr)
    .map((c) => ({
      ...c,
      diasMora: calcularMora({ fecha_vencimiento: c.fecha_vencimiento, estado: c.estado })
        .diasMora,
    }))
    .sort((a, b) => (b.diasMora ?? 0) - (a.diasMora ?? 0));
  const totalVencidas = cuotasVencidas.reduce((acc, c) => acc + c.saldo, 0);

  // --- 4) Lotes escriturados por proyecto ---
  const escrituradasMap = new Map<string, PropiedadEscrituradaRow[]>();
  for (const p of (escrituradasData ?? []) as unknown as PropiedadEscrituradaRow[]) {
    const nombre = nombreProyecto(p.proyectos) || "Sin proyecto";
    if (!escrituradasMap.has(nombre)) escrituradasMap.set(nombre, []);
    escrituradasMap.get(nombre)?.push(p);
  }
  const proyectosEscriturados = Array.from(escrituradasMap.keys()).sort((a, b) => {
    if (a === "Sin proyecto") return 1;
    if (b === "Sin proyecto") return -1;
    return a.localeCompare(b);
  });
  const escrituradasPorProyecto: ReporteEscrituraProyecto[] = proyectosEscriturados.map(
    (proyecto) => ({ proyecto, lotes: escrituradasMap.get(proyecto) ?? [] })
  );

  return {
    anio,
    proyectos,
    filasPorMes,
    totalesPorProyecto,
    totalGeneralAnio,
    cuotasVencenEsteMes,
    totalVencenEsteMes,
    cuotasVencidas,
    totalVencidas,
    escrituradasPorProyecto,
    totalEscrituradas: escrituradasData?.length ?? 0,
  };
}
