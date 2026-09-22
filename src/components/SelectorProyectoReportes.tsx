"use client";

import { useRouter } from "next/navigation";

/**
 * Selector de proyecto que se muestra arriba de todo en la pantalla de
 * Reportes. Al elegir un proyecto, filtra TODOS los reportes de la página
 * (recarga la página con el parámetro `proyecto` en la URL, conservando el
 * año seleccionado). Se implementa con `useRouter` + un <select> normal en
 * vez de `useSearchParams` para no requerir un Suspense boundary.
 */
export function SelectorProyectoReportes({
  anio,
  proyectoSeleccionado,
  proyectos,
}: {
  anio: number;
  proyectoSeleccionado: string | null;
  proyectos: { id: string; nombre: string }[];
}) {
  const router = useRouter();

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <label htmlFor="selector-proyecto-reportes" className="text-sm font-medium text-slate-700">
        Proyecto:
      </label>
      <select
        id="selector-proyecto-reportes"
        defaultValue={proyectoSeleccionado ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams();
          params.set("anio", String(anio));
          if (e.target.value) params.set("proyecto", e.target.value);
          router.push(`/reportes?${params.toString()}`);
        }}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
      >
        <option value="">Todos los proyectos</option>
        <option value="sin-proyecto">Sin proyecto</option>
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
      <span className="text-xs text-slate-400">
        Filtra todos los reportes de esta página por el proyecto elegido.
      </span>
    </div>
  );
}
