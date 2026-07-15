import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProyectosPage() {
  const supabase = await createClient();
  const [{ data: proyectos, error }, { data: propiedades }] = await Promise.all([
    supabase.from("proyectos").select("*").order("nombre"),
    supabase.from("propiedades").select("id, proyecto_id, estado"),
  ]);

  const conteoPorProyecto = new Map<string, { total: number; disponibles: number }>();
  for (const p of propiedades ?? []) {
    if (!p.proyecto_id) continue;
    const actual = conteoPorProyecto.get(p.proyecto_id) ?? { total: 0, disponibles: 0 };
    actual.total += 1;
    if (p.estado === "disponible") actual.disponibles += 1;
    conteoPorProyecto.set(p.proyecto_id, actual);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Proyectos</h1>
        <Link
          href="/proyectos/nuevo"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Nuevo proyecto
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {proyectos?.map((p) => {
          const conteo = conteoPorProyecto.get(p.id) ?? { total: 0, disponibles: 0 };
          return (
            <Link
              key={p.id}
              href={`/proyectos/${p.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm"
            >
              <h2 className="font-medium text-slate-900">{p.nombre}</h2>
              <p className="mt-1 text-sm text-slate-500">{p.ciudad ?? "sin ciudad"}</p>
              <p className="mt-2 text-sm text-slate-600">
                {conteo.total} lote{conteo.total === 1 ? "" : "s"} · {conteo.disponibles} disponible
                {conteo.disponibles === 1 ? "" : "s"}
              </p>
            </Link>
          );
        })}
        {proyectos?.length === 0 && (
          <p className="col-span-full py-6 text-center text-slate-400">
            Todavía no hay proyectos cargados.
          </p>
        )}
      </div>
    </div>
  );
}
