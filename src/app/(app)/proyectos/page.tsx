import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils/format";
import { esAdmin } from "@/lib/auth/rol";

export default async function ProyectosPage() {
  const supabase = await createClient();
  const admin = await esAdmin();
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
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + Nuevo proyecto
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Ciudad</th>
              <th className="px-4 py-2">Valor m²</th>
              <th className="px-4 py-2">Lotes</th>
              <th className="px-4 py-2">Disponibles</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proyectos?.map((p) => {
              const conteo = conteoPorProyecto.get(p.id) ?? { total: 0, disponibles: 0 };
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">
                    <Link href={`/proyectos/${p.id}`} className="hover:underline">
                      {p.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{p.ciudad ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {p.valor_m2 ? formatMoney(p.valor_m2) : "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{conteo.total}</td>
                  <td className="px-4 py-2 text-slate-600">{conteo.disponibles}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/proyectos/${p.id}/estado-cuenta`}
                      className="text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Estado de cuenta
                    </Link>
                    <Link
                      href={`/proyectos/${p.id}`}
                      className="ml-3 text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      {admin ? "Editar" : "Ver"}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {proyectos?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Todavía no hay proyectos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
