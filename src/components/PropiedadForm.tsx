import type { Propiedad } from "@/lib/types";

export function PropiedadForm({
  propiedad,
  action,
  error,
}: {
  propiedad?: Partial<Propiedad>;
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="mt-4 grid max-w-2xl grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="block text-sm font-medium text-slate-700">Dirección</label>
        <input
          name="direccion"
          defaultValue={propiedad?.direccion}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Ciudad</label>
        <input
          name="ciudad"
          defaultValue={propiedad?.ciudad ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Tipo</label>
        <select
          name="tipo"
          defaultValue={propiedad?.tipo ?? "departamento"}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="departamento">Departamento</option>
          <option value="casa">Casa</option>
          <option value="local">Local</option>
          <option value="oficina">Oficina</option>
          <option value="terreno">Terreno</option>
          <option value="otro">Otro</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Superficie (m²)</label>
        <input
          type="number"
          step="0.01"
          name="superficie_m2"
          defaultValue={propiedad?.superficie_m2 ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Valor de referencia</label>
        <input
          type="number"
          step="0.01"
          name="valor_referencia"
          defaultValue={propiedad?.valor_referencia ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Estado</label>
        <select
          name="estado"
          defaultValue={propiedad?.estado ?? "disponible"}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="disponible">Disponible</option>
          <option value="reservada">Reservada</option>
          <option value="alquilada">Alquilada</option>
          <option value="vendida">Vendida</option>
        </select>
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-slate-700">Descripción</label>
        <textarea
          name="descripcion"
          defaultValue={propiedad?.descripcion ?? ""}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

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
