import type { Cliente } from "@/lib/types";

export function ClienteForm({
  cliente,
  action,
  error,
}: {
  cliente?: Partial<Cliente>;
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="mt-4 grid max-w-2xl grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Nombre</label>
        <input
          name="nombre"
          defaultValue={cliente?.nombre}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Apellido</label>
        <input
          name="apellido"
          defaultValue={cliente?.apellido}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Documento</label>
        <input
          name="documento"
          defaultValue={cliente?.documento ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          name="email"
          defaultValue={cliente?.email ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Teléfono</label>
        <input
          name="telefono"
          defaultValue={cliente?.telefono ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Dirección</label>
        <input
          name="direccion"
          defaultValue={cliente?.direccion ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-slate-700">Notas</label>
        <textarea
          name="notas"
          defaultValue={cliente?.notas ?? ""}
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
