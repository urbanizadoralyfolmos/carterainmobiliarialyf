import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { eliminarContrato } from "./actions";

const ESTADO_STYLES: Record<string, string> = {
  activo: "bg-green-100 text-green-800",
  escriturado: "bg-blue-100 text-blue-800",
  cedido: "bg-amber-100 text-amber-800",
  cancelado: "bg-red-100 text-red-800",
};

export default async function ContratosPage() {
  const supabase = await createClient();
  const { data: contratos, error } = await supabase
    .from("contratos")
    .select("*, clientes(nombre, apellido), propiedades(direccion)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Contratos</h1>
        <Link
          href="/contratos/nuevo"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Nuevo contrato
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
              <th className="px-4 py-2">N.º</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Propiedad</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Cuota inicial</th>
              <th className="px-4 py-2">Cuotas</th>
              <th className="px-4 py-2">Inicio</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contratos?.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 text-slate-500">{c.numero}</td>
                <td className="px-4 py-2 font-medium text-slate-900">
                  {c.clientes ? `${c.clientes.apellido}, ${c.clientes.nombre}` : "-"}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {c.propiedades?.direccion ?? "-"}
                </td>
                <td className="px-4 py-2 text-slate-600 capitalize">{c.tipo}</td>
                <td className="px-4 py-2 text-slate-600">
                  {formatMoney(c.cuota_inicial, c.moneda)}
                </td>
                <td className="px-4 py-2 text-slate-600">{c.cantidad_cuotas}</td>
                <td className="px-4 py-2 text-slate-600">{formatDate(c.fecha_inicio)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      ESTADO_STYLES[c.estado] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {c.estado}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/contratos/${c.id}`}
                    className="text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    Editar
                  </Link>
                  <form action={eliminarContrato.bind(null, c.id)} className="inline">
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
            {contratos?.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                  Todavía no hay contratos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
