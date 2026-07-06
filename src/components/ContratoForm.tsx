import type { Cliente, Contrato, Propiedad } from "@/lib/types";

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
  propiedades: Pick<Propiedad, "id" | "direccion">[];
  action: (formData: FormData) => void;
  error?: string;
  esNuevo: boolean;
}) {
  return (
    <form action={action} className="mt-4 grid max-w-3xl grid-cols-2 gap-4">
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
          {propiedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.direccion}
            </option>
          ))}
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
          <option value="finalizado">Finalizado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Fecha de inicio</label>
        <input
          type="date"
          name="fecha_inicio"
          defaultValue={contrato?.fecha_inicio ?? ""}
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
        <label className="block text-sm font-medium text-slate-700">Monto de cuota</label>
        <input
          type="number"
          step="0.01"
          name="monto_cuota"
          defaultValue={contrato?.monto_cuota ?? ""}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Moneda</label>
        <select
          name="moneda"
          defaultValue={contrato?.moneda ?? "ARS"}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Cantidad de cuotas {esNuevo ? "" : "(no editable)"}
        </label>
        <input
          type="number"
          name="cantidad_cuotas"
          defaultValue={contrato?.cantidad_cuotas ?? 12}
          disabled={!esNuevo}
          required
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
          defaultValue={contrato?.dia_vencimiento ?? 10}
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

      {esNuevo && (
        <p className="col-span-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Al guardar se genera automáticamente el plan de cuotas mensuales.
        </p>
      )}

      {error && (
        <p className="col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="col-span-2 flex gap-2">
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
