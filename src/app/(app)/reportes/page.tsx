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
      
        href={`/api/reportes/${tipo}/excel?anio=${anio}${sufijo}`}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
      >
        Excel
      </a>
      
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
          
            key={r.id}
            href={`#${r.id}`}
            className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600
