import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { calcularMora } from "@/lib/utils/mora";

function Card({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-700"
      : tone === "success"
      ? "text-green-700"
      : "text-slate-900";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalClientes },
    { count: totalPropiedades },
    { count: contratosActivosCount },
    { data: cuotas },
  ] = await Promise.all([
    supabase.from("clientes").select("*", { count: "exact", head: true }),
    supabase.from("propiedades").select("*", { count: "exact", head: true }),
    supabase
      .from("contratos")
      .select("*", { count: "exact", head: true })
      .eq("estado", "activo"),
    supabase
      .from("cuotas")
      .select(
        "*, contratos(tasa_mora_mensual, moneda, clientes(nombre, apellido))"
      ),
  ]);

  const hoy = new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);
  const en7dias = new Date(hoy.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const cuotasEnriquecidas = (cuotas ?? []).map((c) => {
    const tasa = c.contratos?.tasa_mora_mensual ?? 0;
    const { diasMora, recargo } = calcularMora({
      fecha_vencimiento: c.fecha_vencimiento,
      monto: c.monto,
      monto_pagado: c.monto_pagado,
      estado: c.estado,
      tasa_mora_mensual: tasa,
    });
    const enMora = c.estado !== "pagada" && c.fecha_vencimiento < hoyStr;
    return { ...c, diasMora, recargo, enMora };
  });

  const cuotasVencidas = cuotasEnriquecidas.filter((c) => c.enMora);
  const montoVencido = cuotasVencidas.reduce(
    (acc, c) => acc + (c.monto - c.monto_pagado) + c.recargo,
    0
  );

  const proximosVencimientos = cuotasEnriquecidas
    .filter(
      (c) =>
        c.estado !== "pagada" &&
        c.fecha_vencimiento >= hoyStr &&
        c.fecha_vencimiento <= en7dias
    )
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));

  const clientesEnMora = new Set(
    cuotasVencidas.map((c) => c.contratos?.clientes?.nombre + c.contratos?.clientes?.apellido)
  ).size;

  const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10);
  const carteraMensual = cuotasEnriquecidas
    .filter(
      (c) =>
        c.estado !== "pagada" &&
        c.fecha_vencimiento >= inicioMes &&
        c.fecha_vencimiento <= finMes
    )
    .reduce((acc, c) => acc + (c.monto - c.monto_pagado), 0);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Clientes" value={String(totalClientes ?? 0)} />
        <Card label="Propiedades" value={String(totalPropiedades ?? 0)} />
        <Card
          label="Cartera del mes (cuotas por cobrar)"
          value={formatMoney(carteraMensual)}
          sub={`${contratosActivosCount ?? 0} contratos activos`}
        />
        <Card
          label="Cuotas en mora"
          value={String(cuotasVencidas.length)}
          sub={`${clientesEnMora} cliente(s) afectados`}
          tone={cuotasVencidas.length > 0 ? "danger" : "success"}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          label="Monto total vencido (con recargo)"
          value={formatMoney(montoVencido)}
          tone={montoVencido > 0 ? "danger" : "success"}
        />
        <Card
          label="Próximos vencimientos (7 días)"
          value={String(proximosVencimientos.length)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Cuotas en mora</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {cuotasVencidas.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">
                  {c.contratos?.clientes
                    ? `${c.contratos.clientes.apellido}, ${c.contratos.clientes.nombre}`
                    : "-"}{" "}
                  · cuota #{c.numero_cuota}
                </span>
                <span className="text-red-700">{c.diasMora} días</span>
              </li>
            ))}
            {cuotasVencidas.length === 0 && (
              <li className="py-2 text-sm text-slate-400">Sin cuotas en mora 🎉</li>
            )}
          </ul>
          <Link
            href="/cuotas?filtro=vencida"
            className="mt-2 inline-block text-xs text-slate-500 hover:underline"
          >
            Ver todas →
          </Link>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Próximos vencimientos (7 días)
          </h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {proximosVencimientos.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">
                  {c.contratos?.clientes
                    ? `${c.contratos.clientes.apellido}, ${c.contratos.clientes.nombre}`
                    : "-"}{" "}
                  · cuota #{c.numero_cuota}
                </span>
                <span className="text-slate-500">{formatDate(c.fecha_vencimiento)}</span>
              </li>
            ))}
            {proximosVencimientos.length === 0 && (
              <li className="py-2 text-sm text-slate-400">Nada por vencer esta semana.</li>
            )}
          </ul>
          <Link href="/cuotas" className="mt-2 inline-block text-xs text-slate-500 hover:underline">
            Ver todas →
          </Link>
        </div>
      </div>
    </div>
  );
}
