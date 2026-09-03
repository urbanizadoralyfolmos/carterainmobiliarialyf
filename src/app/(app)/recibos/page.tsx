import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";

export default async function RecibosPage({
  searchParams,
}: {
  searchParams: Promise<{ cuota?: string }>;
}) {
  const { cuota } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("recibos")
    .select(
      "*, cuotas(numero_cuota, contratos(numero, moneda, clientes(nombre, apellido), propiedades(direccion)))"
    )
    .order("created_at", { ascending: false });

  if (cuota) {
    query = query.eq("cuota_id", cuota);
  }

  const { data: recibos } = await query;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Recibos de pago</h1>
        {cuota && (
          <Link href="/recibos" className="text-sm text-slate-500 hover:underline">
            Ver todos
          </Link>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">N.º</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Propiedad</th>
              <th className="px-4 py-2">Cuota</th>
              <th className="px-4 py-2">Fecha de pago</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recibos?.map((r) => {
              const c = r.cuotas;
              const contrato = c?.contratos;
              const moneda = contrato?.moneda ?? "COP";
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{r.numero}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {contrato?.clientes
                      ? `${contrato.clientes.apellido}, ${contrato.clientes.nombre}`
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {contrato?.propiedades?.direccion ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {c?.numero_cuota === 0 ? "Inicial" : `#${c?.numero_cuota}`}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(r.fecha_pago)}</td>
                  <td className="px-4 py-2 text-slate-600">{formatMoney(r.monto, moneda)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/recibos/${r.id}`}
                      className="text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Ver / imprimir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(!recibos || recibos.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Todavía no hay recibos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
