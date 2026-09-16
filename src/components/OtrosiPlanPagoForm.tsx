"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/utils/format";

/**
 * Formulario del otrosí "cambiar forma de pago": toma el saldo pendiente
 * (solo cuotas sin ningún abono) y lo deja redistribuir en una nueva
 * cantidad de cuotas, con nuevas fechas y montos. Muestra en vivo el total
 * de las cuotas nuevas comparado con el saldo pendiente, para que quede
 * claro si cuadra o no (no bloquea el envío si no cuadra exacto, por si el
 * otrosí incluye un descuento o un recargo acordado).
 */
export function OtrosiPlanPagoForm({
  action,
  saldoPendiente,
  moneda,
  diaVencimientoActual,
}: {
  action: (formData: FormData) => void;
  saldoPendiente: number;
  moneda: string;
  diaVencimientoActual: number;
}) {
  const [cantidad, setCantidad] = useState(1);
  const [montos, setMontos] = useState<number[]>([saldoPendiente]);

  function actualizarCantidad(nuevaCantidadRaw: number) {
    const nuevaCantidad = Math.max(1, Math.min(120, nuevaCantidadRaw || 1));
    setCantidad(nuevaCantidad);
    setMontos((prev) => {
      const base = Math.round((saldoPendiente / nuevaCantidad) * 100) / 100;
      return Array.from({ length: nuevaCantidad }, (_, i) => prev[i] ?? base);
    });
  }

  function actualizarMonto(indice: number, valor: number) {
    setMontos((prev) => prev.map((m, i) => (i === indice ? valor : m)));
  }

  const total = montos.reduce((acc, m) => acc + (Number(m) || 0), 0);
  const diferencia = Math.round((total - saldoPendiente) * 100) / 100;

  return (
    <form action={action} className="mt-2 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Nueva cantidad de cuotas
          </label>
          <input
            type="number"
            name="cantidad_cuotas"
            min={1}
            max={120}
            value={cantidad}
            onChange={(e) => actualizarCantidad(Number(e.target.value))}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Fecha de la primera cuota nueva
          </label>
          <input
            type="date"
            name="fecha_primera_cuota"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <p className="mt-1 text-xs text-slate-400">
            Las siguientes vencen mensual, el día {diaVencimientoActual} (igual que el contrato).
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700">Motivo del otrosí</label>
        <textarea
          name="motivo"
          rows={2}
          required
          placeholder="Ej: a solicitud del cliente se amplía el plazo de pago..."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-1.5">Cuota nueva</th>
              <th className="px-3 py-1.5">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {montos.map((monto, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5 text-slate-600">#{i + 1}</td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="monto_nueva_cuota"
                    value={monto}
                    onChange={(e) => actualizarMonto(i, Number(e.target.value) || 0)}
                    className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={`text-xs ${diferencia === 0 ? "text-slate-500" : "text-amber-700"}`}>
        Saldo pendiente a reestructurar: {formatMoney(saldoPendiente, moneda)} · Total de las
        cuotas nuevas: {formatMoney(total, moneda)}
        {diferencia !== 0 &&
          ` (diferencia de ${formatMoney(Math.abs(diferencia), moneda)} ${
            diferencia > 0 ? "de más" : "de menos"
          })`}
      </p>

      <button
        type="submit"
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
      >
        Guardar otrosí y reestructurar cuotas
      </button>
    </form>
  );
}
