"use client";

import { useEffect, useState } from "react";
import type { Cliente, Contrato, Propiedad } from "@/lib/types";
import { fechaCuota } from "@/lib/utils/plan";
import { formatMoney, formatDate } from "@/lib/utils/format";

export function ContratoForm({
  contrato,
  clientes,
  propiedades,
  action,
  error,
  esNuevo,
}: {
  contrato?: Partial<Contrato>;
  clientes: Pick<Cliente, "id" | "nombre" | "apellido">[];
  propiedades: (Pick<Propiedad, "id" | "direccion"> & {
    proyectos?: { nombre: string } | { nombre: string }[] | null;
  })[];
  action: (formData: FormData) => void;
  error?: string;
  esNuevo: boolean;
}) {
  const [fechaInicio, setFechaInicio] = useState(contrato?.fecha_inicio ?? "");
  const [diaVencimiento, setDiaVencimiento] = useState(contrato?.dia_vencimiento ?? 10);
  const [moneda, setMoneda] = useState(contrato?.moneda ?? "COP");
  const [cantidadCuotas, setCantidadCuotas] = useState(contrato?.cantidad_cuotas ?? 12);
  const [montos, setMontos] = useState<number[]>(
    Array.from({ length: contrato?.cantidad_cuotas ?? 12 }, () => 0)
  );

  useEffect(() => {
    setMontos((prev) => {
      const next = prev.slice(0, cantidadCuotas);
      while (next.length < cantidadCuotas) next.push(0);
      return next;
    });
  }, [cantidadCuotas]);

  const totalCuotas = montos.reduce((acc, m) => acc + (Number(m) || 0), 0);

  return (
    <form action={action} className="mt-4 max-w-3xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Cliente</label>
          <select
            name="cliente_id"
            defaultValue={contrato?.cliente_id}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.apellido}, {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Propiedad</label>
          <select
            name="propiedad_id"
            defaultValue={contrato?.propiedad_id}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {propiedades.map((p) => {
              const proyecto = Array.isArray(p.proyectos) ? p.proyectos[0] : p.proyectos;
              return (
                <option key={p.id} value={p.id}>
                  {proyecto?.nombre ? `${proyecto.nombre} - ${p.direccion}` : p.direccion}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Tipo</label>
          <select
            name="tipo"
            defaultValue={contrato?.tipo ?? "alquiler"}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="alquiler">Alquiler</option>
            <option value="venta">Venta</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Estado</label>
          <select
            name="estado"
            defaultValue={contrato?.estado ?? "activo"}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="activo">Activo</option>
            <option value="cedido">Cedido</option>
            <option value="escriturado">Escriturado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Fecha de inicio</label>
          <input
            type="date"
            name="fecha_inicio"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Fecha de fin (opcional)</label>
          <input
            type="date"
            name="fecha_fin"
            defaultValue={contrato?.fecha_fin ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Moneda</label>
          <select
            name="moneda"
            value={moneda}
            onChange={(e) => setMoneda(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Valor total del contrato (opcional)
          </label>
          <input
            type="number"
            step="0.01"
            name="monto_total"
            defaultValue={contrato?.monto_total ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Cuota inicial</label>
          <input
            type="number"
            step="0.01"
            name="cuota_inicial"
            defaultValue={contrato?.cuota_inicial ?? 0}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-400">
            Se registra como pago inicial con vencimiento en la fecha de inicio.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Cantidad de cuotas restantes {esNuevo ? "" : "(no editable)"}
          </label>
          <input
            type="number"
            min={1}
            name="cantidad_cuotas"
            value={cantidadCuotas}
            readOnly={!esNuevo}
            onChange={(e) => setCantidadCuotas(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Día de vencimiento</label>
          <input
            type="number"
            min={1}
            max={28}
            name="dia_vencimiento"
            value={diaVencimiento}
            onChange={(e) => setDiaVencimiento(Number(e.target.value) || 1)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Tasa de mora mensual (%)
          </label>
          <input
            type="number"
            step="0.01"
            name="tasa_mora_mensual"
            defaultValue={contrato?.tasa_mora_mensual ?? 5}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700">Notas</label>
          <textarea
            name="notas"
            defaultValue={contrato?.notas ?? ""}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {esNuevo ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Plan de cuotas ({cantidadCuotas} cuotas, cada una con su propio monto)
          </h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Cuota</th>
                  <th className="px-4 py-2">Vencimiento</th>
                  <th className="px-4 py-2">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: cantidadCuotas }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-slate-600">#{i + 1}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {fechaInicio ? formatDate(fechaCuota(fechaInicio, i + 1, diaVencimiento)) : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        name={`monto_cuota_${i + 1}`}
                        value={montos[i] ?? 0}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0;
                          setMontos((prev) => {
                            const next = [...prev];
                            next[i] = v;
                            return next;
                          });
                        }}
                        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Total de las cuotas: <span className="font-medium text-slate-700">{formatMoney(totalCuotas, moneda)}</span>
          </p>
        </div>
      ) : (
        <p className="mt-6 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
          El plan de cuotas ya generado no se modifica desde aquí. Para ajustar montos
          de cuotas puntuales, hazlo desde la sección "Cuotas".
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}
