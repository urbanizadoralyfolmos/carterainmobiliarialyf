import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { eliminarCliente } from "./actions";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("*")
    .order("apellido", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Clientes</h1>
        <Link
          href="/clientes/nuevo"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Nuevo cliente
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
              <th className="px-4 py-2">Documento</th>
              <th className="px-4 py-2">Contacto</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientes?.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 font-medium text-slate-900">
                  {c.apellido}, {c.nombre}
                </td>
                <td className="px-4 py-2 text-slate-600">{c.documento ?? "-"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {c.email ?? "-"} {c.telefono ? `· ${c.telefono}` : ""}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/clientes/${c.id}`}
                    className="text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    Editar
                  </Link>
                  <form action={eliminarCliente.bind(null, c.id)} className="inline">
                    <button
                      type="submit"
                      className="ml-3 text-red-600 hover:text-red-800 hover:underline"
                    >
                      Eliminar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {clientes?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Todavía no hay clientes cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
