import { createClient } from "@/lib/supabase/server";
import { calcularMora } from "@/lib/utils/mora";

type ProyectoRel = { nombre: string } | { nombre: string }[] | null | undefined;

function nombreProyecto(rel: ProyectoRel) {
  if (Array.isArray(rel)) return rel[0]?.nombre ?? "";
  return rel?.nombre ?? "";
}

export const REPORTE_TIPOS = [
  { tipo: "recaudo", etiqueta: "Recaudo real por mes y proyecto" },
  { tipo: "recaudo-esperado", etiqueta: "Recaudo esperado por mes y proyecto" },
  { tipo: "recaudo-esperado-por-anio", etiqueta: "Recaudo esperado por año y proyecto" },
  { tipo: "vencen-este-mes", etiqueta: "Cuotas que vencen este mes" },
  { tipo: "vencidas", etiqueta: "Cuotas vencidas" },
  { tipo: "escrituradas", etiqueta: "Lotes escriturados por proyecto" },
  { tipo: "lotes-disponibles", etiqueta: "Lotes disponibles para venta" },
] as const;

export type ReporteTipo = (typeof REPORTE_TIPOS)[number]["tipo"];

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
  telefono: string | null;
  email: string | null;
} | null;

type PropiedadRel = {
  direccion: string;
  proyecto_id: string | null;
  proyectos?: ProyectoRel;
} | null;

type ContratoPropiedadesRel = {
  propiedades: PropiedadRel;
}[];

type ContratoConPropiedadesRel = {
  numero: number;
  moneda?: string;
  clientes?: ClienteRel;
  contrato_propiedades?: ContratoPropiedadesRel;
} | null;

type ContratoSoloProyectosRel = {
  contrato_propiedades?: ContratoPropiedadesRel;
} | null;

type RecibosPorMesRow = {
  monto: number;
  fecha_pago: string;
  cuotas: { contratos: ContratoConPropiedadesRel } | null;
};

type CuotasEsperadasRow = {
  monto: number;
  fecha_vencimiento: string;
  contratos: ContratoSoloProyectosRel;
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

export type LoteDisponibleRow = {
  id: string;
  direccion: string;
  manzana: string | null;
  numero_lote: string | null;
  superficie_m2: number | null;
  valor_referencia: number | null;
  proyecto: string;
};

function nombreClienteDe(cliente: ClienteRel) {
  if (!cliente) return "-";
  if (cliente.tipo_persona === "juridica" && cliente.razon_social) return cliente.razon_social;
  return `${cliente.apellido}, ${cliente.nombre}`;
}

/**
 * Texto de contacto del cliente (teléfono y/o correo) para los reportes de
 * cuotas por vencer y vencidas, así el que gestiona la cobranza no tiene que
 * ir a buscar el contrato o el cliente para llamar/escribir.
 */
function contactoClienteDe(cliente: ClienteRel) {
  if (!cliente) return "";
  return [cliente.telefono, cliente.email].filter(Boolean).join(" / ");
}

function propiedadesTextoDe(contrato: ContratoConPropiedadesRel | ContratoSoloProyectosRel) {
  return (contrato?.contrato_propiedades ?? [])
    .map((cp) => cp.propiedades?.direccion)
    .filter(Boolean)
    .join(", ");
}

function proyectosDe(contrato: ContratoConPropiedadesRel | ContratoSoloProyectosRel) {
  const nombres = (contrato?.contrato_propiedades ?? [])
    .map((cp) => nombreProyecto(cp.propiedades?.proyectos))
    .filter(Boolean);
  return Array.from(new Set(nombres));
}

function proyectoTextoDe(contrato: ContratoConPropiedadesRel | ContratoSoloProyectosRel) {
  const nombres = proyectosDe(contrato);
  return nombres.length > 0 ? nombres.join(", ") : "Sin proyecto";
}

/**
 * IDs (no nombres) de los proyectos vinculados a un contrato a través de sus
 * propiedades. Se usa para filtrar los reportes por proyecto de forma
 * confiable (por id, no por nombre, que en teoría podría repetirse).
 */
function proyectoIdsDe(contrato: ContratoConPropiedadesRel | ContratoSoloProyectosRel) {
  const ids = (contrato?.contrato_propiedades ?? [])
    .map((cp) => cp.propiedades?.proyecto_id)
    .filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
}

/**
 * true si el conjunto de ids de proyecto de una fila coincide con el filtro
 * seleccionado: sin filtro (todos), "sin-proyecto" (ningún proyecto
 * vinculado), o un id de proyecto puntual.
 */
function coincideProyecto(ids: string[], proyectoId?: string | null) {
  if (!proyectoId) return true;
  if (proyectoId === "sin-proyecto") return ids.length === 0;
  return ids.includes(proyectoId);
}

export type ReporteMesFila = {
  mes: number;
  nombreMes: string;
  porProyecto: Record<string, number>;
  total: number;
};

export type ReporteAnioFila = {
  anio: number;
  porProyecto: Record<string, number>;
  total: number;
};

export type ReporteCuota = {
  id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  nombreCliente: string;
  contactoCliente: string;
  propiedadesTexto: string;
  proyectoTexto: string;
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
  proyectoSeleccionado: string | null;
  proyectosDisponibles: { id: string; nombre: string }[];
  // 1) Recaudo real (recibos ya cobrados)
  proyectos: string[];
  filasPorMes: ReporteMesFila[];
  totalesPorProyecto: Record<string, number>;
  totalGeneralAnio: number;
  // 2) Recaudo esperado (según fecha de vencimiento de las cuotas)
  proyectosEsperado: string[];
  filasPorMesEsperado: ReporteMesFila[];
  totalesPorProyectoEsperado: Record<string, number>;
  totalGeneralAnioEsperado: number;
  // 2b) Recaudo esperado por año y proyecto (todas las cuotas programadas,
  // sin importar el año seleccionado en el reporte anterior)
  proyectosEsperadoPorAnio: string[];
  filasPorAnioEsperado: ReporteAnioFila[];
  totalesPorProyectoEsperadoPorAnio: Record<string, number>;
  totalGeneralEsperadoPorAnio: number;
  // 3) y 4) Cuotas por vencer / vencidas
  cuotasVencenEsteMes: ReporteCuota[];
  totalVencenEsteMes: number;
  cuotasVencidas: ReporteCuota[];
  totalVencidas: number;
  // 5) Lotes escriturados por proyecto
  escrituradasPorProyecto: ReporteEscrituraProyecto[];
  totalEscrituradas: number;
  // 6) Lotes disponibles para venta
  lotesDisponibles: LoteDisponibleRow[];
  totalLotesDisponibles: number;
  totalAreaLotesDisponibles: number;
  totalValorLotesDisponibles: number;
};

function agruparPorMesYProyecto<T extends { fecha: string; monto: number; proyectos: string[] }>(
  filas: T[]
) {
  const proyectosSet = new Set<string>();
  const porMesProyecto = new Map<number, Map<string, number>>();
  for (let m = 1; m <= 12; m++) porMesProyecto.set(m, new Map());

  for (const f of filas) {
    const mes = Number(f.fecha.slice(5, 7));
    const proyectosDeFila = f.proyectos.length > 0 ? f.proyectos : ["Sin proyecto"];
    for (const nombre of proyectosDeFila) {
      proyectosSet.add(nombre);
      const fila = porMesProyecto.get(mes);
      if (fila) fila.set(nombre, (fila.get(nombre) ?? 0) + f.monto);
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

  return { proyectos, filasPorMes, totalesPorProyecto, totalGeneralAnio };
}

/**
 * Igual que `agruparPorMesYProyecto` pero agrupando por año calendario en vez
 * de por mes, y sin limitarse a los 12 meses de un único año: recorre todos
 * los años que aparezcan en las filas recibidas (ideal para ver el recaudo
 * esperado de varios años a la vez, no solo el año seleccionado en pantalla).
 */
function agruparPorAnioYProyecto<T extends { fecha: string; monto: number; proyectos: string[] }>(
  filas: T[]
) {
  const proyectosSet = new Set<string>();
  const aniosSet = new Set<number>();
  const porAnioProyecto = new Map<number, Map<string, number>>();

  for (const f of filas) {
    const anio = Number(f.fecha.slice(0, 4));
    aniosSet.add(anio);
    if (!porAnioProyecto.has(anio)) porAnioProyecto.set(anio, new Map());
    const proyectosDeFila = f.proyectos.length > 0 ? f.proyectos : ["Sin proyecto"];
    for (const nombre of proyectosDeFila) {
      proyectosSet.add(nombre);
      const fila = porAnioProyecto.get(anio);
      if (fila) fila.set(nombre, (fila.get(nombre) ?? 0) + f.monto);
    }
  }

  const proyectos = Array.from(proyectosSet).sort((a, b) => {
    if (a === "Sin proyecto") return 1;
    if (b === "Sin proyecto") return -1;
    return a.localeCompare(b);
  });

  const anios = Array.from(aniosSet).sort((a, b) => a - b);

  const totalesPorProyecto: Record<string, number> = {};
  let totalGeneral = 0;
  const filasPorAnio: ReporteAnioFila[] = anios.map((anio) => {
    const fila = porAnioProyecto.get(anio) ?? new Map<string, number>();
    const porProyecto: Record<string, number> = {};
    let total = 0;
    for (const p of proyectos) {
      const v = fila.get(p) ?? 0;
      porProyecto[p] = v;
      totalesPorProyecto[p] = (totalesPorProyecto[p] ?? 0) + v;
      total += v;
    }
    totalGeneral += total;
    return { anio, porProyecto, total };
  });

  return { anios, proyectos, filasPorAnio, totalesPorProyecto, totalGeneral };
}

/**
 * Calcula todos los datos del módulo de Reportes (recaudo real y esperado por
 * mes/proyecto, cuotas por vencer este mes, cuotas vencidas, lotes
 * escriturados por proyecto y lotes disponibles para venta). Se usa tanto en
 * la página de pantalla como en los endpoints de exportación a Excel y PDF,
 * para no duplicar la consulta ni la lógica.
 *
 * `proyectoId` es opcional: si se indica, todos los reportes de esta función
 * quedan filtrados a ese proyecto puntual ("sin-proyecto" filtra los que no
 * tienen ningún proyecto vinculado). Sin indicarlo, se muestran todos.
 */
export async function getReportes(
  anio: number,
  proyectoId?: string | null
): Promise<ReportesData> {
  const supabase = await createClient();

  const hoy = new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10);

  let queryEscrituradas = supabase
    .from("propiedades")
    .select(
      "id, direccion, manzana, numero_lote, numero_escritura, fecha_escritura, proyectos(nombre)"
    )
    // Un lote sigue "escriturado" (tiene número/fecha de escritura) aunque
    // luego se facture: por eso este reporte incluye ambos estados.
    .in("estado", ["escriturado", "facturado"])
    .order("direccion");

  if (proyectoId === "sin-proyecto") {
    queryEscrituradas = queryEscrituradas.is("proyecto_id", null);
  } else if (proyectoId) {
    queryEscrituradas = queryEscrituradas.eq("proyecto_id", proyectoId);
  }

  let queryLotesDisponibles = supabase
    .from("propiedades")
    .select(
      "id, direccion, manzana, numero_lote, superficie_m2, valor_referencia, proyectos(nombre)"
    )
    .eq("tipo", "lote")
    .eq("estado", "disponible")
    .order("manzana")
    .order("numero_lote");

  if (proyectoId === "sin-proyecto") {
    queryLotesDisponibles = queryLotesDisponibles.is("proyecto_id", null);
  } else if (proyectoId) {
    queryLotesDisponibles = queryLotesDisponibles.eq("proyecto_id", proyectoId);
  }

  const [
    { data: recibosData },
    { data: cuotasEsperadasData },
    { data: cuotasEsperadasTodosAniosData },
    { data: cuotasData },
    { data: escrituradasData },
    { data: lotesDisponiblesData },
    { data: proyectosDisponiblesData },
  ] = await Promise.all([
    supabase
      .from("recibos")
      .select(
        "monto, fecha_pago, cuotas(contratos(contrato_propiedades(propiedades(direccion, proyecto_id, proyectos(nombre)))))"
      )
      .gte("fecha_pago", `${anio}-01-01`)
      .lte("fecha_pago", `${anio}-12-31`),
    supabase
      .from("cuotas")
      .select(
        "monto, fecha_vencimiento, contratos(contrato_propiedades(propiedades(direccion, proyecto_id, proyectos(nombre))))"
      )
      .gte("fecha_vencimiento", `${anio}-01-01`)
      .lte("fecha_vencimiento", `${anio}-12-31`),
    // Igual que la anterior pero sin filtrar por año: alimenta la tabla de
    // "recaudo esperado por año", que muestra todos los años con cuotas
    // programadas de una sola vez.
    supabase
      .from("cuotas")
      .select(
        "monto, fecha_vencimiento, contratos(contrato_propiedades(propiedades(direccion, proyecto_id, proyectos(nombre))))"
      ),
    supabase
      .from("cuotas")
      .select(
        "id, numero_cuota, fecha_vencimiento, monto, monto_pagado, estado, contratos(numero, moneda, clientes(nombre, apellido, razon_social, tipo_persona, telefono, email), contrato_propiedades(propiedades(direccion, proyecto_id, proyectos(nombre))))"
      )
      .neq("estado", "pagada")
      .order("fecha_vencimiento", { ascending: true }),
    queryEscrituradas,
    queryLotesDisponibles,
    supabase.from("proyectos").select("id, nombre").order("nombre"),
  ]);

  // --- 1) Dinero recaudado (real) por mes y proyecto ---
  const filasRecaudoReal = ((recibosData ?? []) as unknown as RecibosPorMesRow[])
    .filter((r) => coincideProyecto(proyectoIdsDe(r.cuotas?.contratos ?? null), proyectoId))
    .map((r) => ({
      fecha: r.fecha_pago,
      monto: Number(r.monto),
      proyectos: proyectosDe(r.cuotas?.contratos ?? null),
    }));
  const recaudoReal = agruparPorMesYProyecto(filasRecaudoReal);

  // --- 2) Dinero recaudado esperado (según vencimiento de cuota) por mes y proyecto ---
  const filasRecaudoEsperado = ((cuotasEsperadasData ?? []) as unknown as CuotasEsperadasRow[])
    .filter((c) => coincideProyecto(proyectoIdsDe(c.contratos), proyectoId))
    .map((c) => ({
      fecha: c.fecha_vencimiento,
      monto: Number(c.monto),
      proyectos: proyectosDe(c.contratos),
    }));
  const recaudoEsperado = agruparPorMesYProyecto(filasRecaudoEsperado);

  // --- 2b) Dinero recaudado esperado por año y proyecto (todos los años) ---
  const filasRecaudoEsperadoPorAnio = (
    (cuotasEsperadasTodosAniosData ?? []) as unknown as CuotasEsperadasRow[]
  )
    .filter((c) => coincideProyecto(proyectoIdsDe(c.contratos), proyectoId))
    .map((c) => ({
      fecha: c.fecha_vencimiento,
      monto: Number(c.monto),
      proyectos: proyectosDe(c.contratos),
    }));
  const recaudoEsperadoPorAnio = agruparPorAnioYProyecto(filasRecaudoEsperadoPorAnio);

  // --- 3) y 4) Cuotas por vencer este mes / ya vencidas ---
  const cuotasBase = ((cuotasData ?? []) as unknown as CuotaReporteRow[])
    .filter((c) => coincideProyecto(proyectoIdsDe(c.contratos), proyectoId))
    .map((c) => ({
      id: c.id,
      numero_cuota: c.numero_cuota,
      fecha_vencimiento: c.fecha_vencimiento,
      estado: c.estado,
      nombreCliente: nombreClienteDe(c.contratos?.clientes ?? null),
      contactoCliente: contactoClienteDe(c.contratos?.clientes ?? null),
      propiedadesTexto: propiedadesTextoDe(c.contratos),
      proyectoTexto: proyectoTextoDe(c.contratos),
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

  // --- 5) Lotes escriturados por proyecto ---
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

  // --- 6) Lotes disponibles para venta ---
  const lotesDisponibles: LoteDisponibleRow[] = (
    (lotesDisponiblesData ?? []) as unknown as {
      id: string;
      direccion: string;
      manzana: string | null;
      numero_lote: string | null;
      superficie_m2: number | null;
      valor_referencia: number | null;
      proyectos?: ProyectoRel;
    }[]
  ).map((p) => ({
    id: p.id,
    direccion: p.direccion,
    manzana: p.manzana,
    numero_lote: p.numero_lote,
    superficie_m2: p.superficie_m2,
    valor_referencia: p.valor_referencia,
    proyecto: nombreProyecto(p.proyectos) || "Sin proyecto",
  }));
  const totalAreaLotesDisponibles = lotesDisponibles.reduce(
    (acc, l) => acc + (l.superficie_m2 ?? 0),
    0
  );
  const totalValorLotesDisponibles = lotesDisponibles.reduce(
    (acc, l) => acc + (l.valor_referencia ?? 0),
    0
  );

  return {
    anio,
    proyectoSeleccionado: proyectoId ?? null,
    proyectosDisponibles: proyectosDisponiblesData ?? [],
    proyectos: recaudoReal.proyectos,
    filasPorMes: recaudoReal.filasPorMes,
    totalesPorProyecto: recaudoReal.totalesPorProyecto,
    totalGeneralAnio: recaudoReal.totalGeneralAnio,
    proyectosEsperado: recaudoEsperado.proyectos,
    filasPorMesEsperado: recaudoEsperado.filasPorMes,
    totalesPorProyectoEsperado: recaudoEsperado.totalesPorProyecto,
    totalGeneralAnioEsperado: recaudoEsperado.totalGeneralAnio,
    proyectosEsperadoPorAnio: recaudoEsperadoPorAnio.proyectos,
    filasPorAnioEsperado: recaudoEsperadoPorAnio.filasPorAnio,
    totalesPorProyectoEsperadoPorAnio: recaudoEsperadoPorAnio.totalesPorProyecto,
    totalGeneralEsperadoPorAnio: recaudoEsperadoPorAnio.totalGeneral,
    cuotasVencenEsteMes,
    totalVencenEsteMes,
    cuotasVencidas,
    totalVencidas,
    escrituradasPorProyecto,
    totalEscrituradas: escrituradasData?.length ?? 0,
    lotesDisponibles,
    totalLotesDisponibles: lotesDisponibles.length,
    totalAreaLotesDisponibles,
    totalValorLotesDisponibles,
  };
}
