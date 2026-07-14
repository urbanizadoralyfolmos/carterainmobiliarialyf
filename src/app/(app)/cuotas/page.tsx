import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { calcularMora } from "@/lib/utils/mora";
import { registrarPago, revertirPago } from "./actions";

const FILTROS = [
  { value: "todas", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "vencida", label: "En mora" },
  { value: "pagada", label: "Pagadas" },
];

export default async function CuotasPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro = "todas" } = await searchParams;
  const supabase = await createClient();

  const { data: cuotas, error } = await supabase
    .from("cuotas")
    .select(
      "*, contratos(tasa_mora_mensual, moneda, clientes(nombre, apellido), propiedades(direccion))"
    )
    .order("fecha_vencimiento", { ascending: true });

  const hoy = new Date().toISOString().slice(0, 10);

  const enriquecidas = (cuotas ?? []).map((cuota) => {
    const tasa = cuota.contratos?.tasa_mora_mensual ?? 0;
    const { diasMora, recargo } = calcularMora({
      fecha_vencimiento: cuota.fecha_vencimiento,
      monto: cuota.monto,
      monto_pagado: cuota.monto_pagado,
      estado: cuota.estado,
      tasa_mora_mensual: tasa,
    });
    const enMora = cuota.estado !== "pagada" && cuota.fecha_vencimiento < hoy;
    return { ...cuota, diasMora, recargo, enMora };
  });

  const filtradas = enriquecidas.filter((c) => {
    if (filtro === "todas") return true;
    if (filtro === "vencida") return c.enMora;
    if (filtro === "pendiente") return c.estado === "pendiente" && !c.enMora;
    return c.estado === filtro;
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Cuotas</h1>

      <div className="mt-3 flex gap-1">
        {FILTROS.map((f) => (
          <Link
            key={f.value}
            href={`/cuotas?filtro=${f.value}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              filtro === f.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f.label}
          </Link>
        ))}
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
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Propiedad</th>
              <th className="px-4 py-2">Cuota</th>
              <th className="px-4 py-2">Vencimiento</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2">Mora</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtradas.map((c) => {
              const moneda = c.contratos?.moneda ?? "COP";
              return (
                <tr key={c.id} className={c.enMora ? "bg-red-50/50" : ""}>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {c.contratos?.clientes
                      ? `${c.contratos.clientes.apellido}, ${c.contratos.clientes.nombre}`
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {c.contratos?.propiedades?.direccion ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatDate(c.fecha_vencimiento)}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatMoney(c.monto, moneda)}
                    {c.monto_pagado > 0 && c.estado !== "pagada" && (
                      <span className="block text-xs text-slate-400">
                        pagado: {formatMoney(c.monto_pagado, moneda)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {c.enMora ? (
                      <span className="text-red-700">
                        {c.diasMora} días · {formatMoney(c.recargo, moneda)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.estado === "pagada"
                          ? "bg-green-100 text-green-800"
                          : c.enMora
                          ? "bg-red-100 text-red-800"
                          : c.estado === "parcial"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {c.enMora ? "vencida" : c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {c.estado === "pagada" ? (
                      <form action={revertirPago.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
                        >
                          Revertir
                        </button>
                      </form>
                    ) : (
                      <form
                        action={registrarPago.bind(null, c.id)}
                        className="flex items-center justify-end gap-1"
                      >
                        <input type="hidden" name="monto_cuota" value={c.monto} />
                        <input
                          type="number"
                          step="0.01"
                          name="monto_pagado"
                          defaultValue={c.monto + c.recargo}
                          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800"
                        >
                          Pagar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  No hay cuotas para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
