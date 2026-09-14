import Link from "next/link";
import { getProyectosDisponibles, SIN_PROYECTO_ID } from "@/lib/clientes-por-proyecto";

export default async function ExportarClientesExcelPage() {
  const proyectos = await getProyectosDisponibles();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Exportar clientes por proyecto</h1>
        <Link href="/clientes" className="text-sm text-slate-500 hover:underline">
          ← Volver a clientes
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Elige qué proyectos incluir en el Excel (cada uno se exporta en su propia hoja). Por
        defecto están todos marcados.
      </p>

      <form
        method="GET"
        action="/api/clientes/por-proyecto/excel"
        className="mt-4 max-w-md rounded-lg border border-slate-200 bg-white p-4"
      >
        <input type="hidden" name="filtrado" value="1" />
        <div className="space-y-2">
          {proyectos.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="proyecto" value={p.id} defaultChecked />
              {p.nombre}
            </label>
          ))}
          <label className="flex items-center gap-2 border-t border-slate-100 pt-2 text-sm text-slate-700">
            <input type="checkbox" name="proyecto" value={SIN_PROYECTO_ID} defaultChecked />
            Sin proyecto
          </label>
          {proyectos.length === 0 && (
            <p className="text-sm text-slate-400">Todavía no hay proyectos cargados.</p>
          )}
        </div>

        <button
          type="submit"
          className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Exportar seleccionados (Excel)
        </button>
      </form>
    </div>
  );
}
