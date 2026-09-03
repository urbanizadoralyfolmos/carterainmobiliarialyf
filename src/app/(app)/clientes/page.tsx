import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { nombreCliente } from "@/lib/utils/format";
import { eliminarCliente } from "./actions";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes").select("*");

  // Se ordena en JS por el nombre que realmente se muestra (razón social
  // para jurídicas, apellido+nombre para naturales), ya que son columnas
  // distintas según el tipo de cliente.
  const clientes = (data ?? []).sort((a, b) =>
    nombreCliente(a).localeCompare(nombreCliente(b), "es")
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Clientes</h1>
        <Link
          href="/clientes/nuevo"
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
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
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Documento</th>
              <th className="px-4 py-2">Contacto</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientes.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 font-medium text-slate-900">
                  {nombreCliente(c)}
                  {c.tipo_persona === "juridica" && c.representante_nombre && (
                    <div className="text-xs font-normal text-slate-400">
                      Rep. legal: {c.representante_nombre}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.tipo_persona === "juridica"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {c.tipo_persona === "juridica" ? "Jurídica" : "Natural"}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {c.tipo_persona === "juridica" ? c.nit ?? "-" : c.documento ?? "-"}
                </td>
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
            {clientes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
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
