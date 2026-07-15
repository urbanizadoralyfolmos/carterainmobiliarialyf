import type { Proyecto } from "@/lib/types";

export function ProyectoForm({
  proyecto,
  action,
  error,
}: {
  proyecto?: Partial<Proyecto>;
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="mt-4 grid max-w-xl grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="block text-sm font-medium text-slate-700">Nombre del proyecto</label>
        <input
          name="nombre"
          defaultValue={proyecto?.nombre}
          required
          placeholder="Ej: Urbanización Villa del Sol"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Ciudad</label>
        <input
          name="ciudad"
          defaultValue={proyecto?.ciudad ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-slate-700">Descripción</label>
        <textarea
          name="descripcion"
          defaultValue={proyecto?.descripcion ?? ""}
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
