import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { eliminarCliente } from "./actions";
import { SearchInput } from "@/components/SearchInput";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data: clientesData, error } = await supabase
    .from("clientes")
    .select("*")
    .order("apellido", { ascending: true });

  const termino = (q ?? "").trim().toLowerCase();
  const clientes = (clientesData ?? []).filter((c) => {
    if (!termino) return true;
    return (
      c.nombre.toLowerCase().includes(termino) ||
      c.apellido.toLowerCase().includes(termino) ||
      (c.documento ?? "").toLowerCase().includes(termino) ||
      (c.email ?? "").toLowerCase().includes(termino) ||
      (c.razon_social ?? "").toLowerCase().includes(termino) ||
      (c.nit ?? "").toLowerCase().includes(termino)
    );
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900">Clientes</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/clientes/exportar-excel"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Exportar por proyecto (Excel)
          </Link>
          <Link
            href="/clientes/nuevo"
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            + Nuevo cliente
          </Link>
        </div>
      </div>

      <div className="mt-3">
        <SearchInput placeholder="Buscar por nombre, documento, NIT o email..." />
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
            {clientes.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 font-medium text-slate-900">
                  {c.tipo_persona === "juridica" && c.razon_social ? (
                    <>
                      {c.razon_social}
                      <span className="block text-xs font-normal text-slate-400">
                        Repr. {c.apellido}, {c.nombre}
                      </span>
                    </>
                  ) : (
                    `${c.apellido}, ${c.nombre}`
                  )}
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
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  {clientesData?.length === 0
                    ? "Todavía no hay clientes cargados."
                    : "Ningún cliente coincide con la búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
