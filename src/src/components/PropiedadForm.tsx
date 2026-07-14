"use client";

import { useState } from "react";
import type { Propiedad } from "@/lib/types";

export function PropiedadForm({
  propiedad,
  contratoVinculado,
  action,
  error,
}: {
  propiedad?: Partial<Propiedad>;
  contratoVinculado?: { numero: number; estado: string } | null;
  action: (formData: FormData) => void;
  error?: string;
}) {
  const [estado, setEstado] = useState(propiedad?.estado ?? "disponible");

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
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="disponible">Disponible</option>
          <option value="prometido_en_venta">Prometido en venta</option>
          <option value="escriturado">Escriturado</option>
          <option value="facturado">Facturado</option>
        </select>
      </div>

      {estado === "prometido_en_venta" && (
        <div className="col-span-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {contratoVinculado ? (
            <>
              Vinculada al <strong>Contrato N.º {contratoVinculado.numero}</strong> (estado:{" "}
              {contratoVinculado.estado}).
            </>
          ) : (
            "Todavía no hay un contrato vinculado a esta propiedad. El vínculo se crea automáticamente al registrar un contrato para ella."
          )}
        </div>
      )}

      {estado === "escriturado" && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Número de escritura
            </label>
            <input
              name="numero_escritura"
              defaultValue={propiedad?.numero_escritura ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Fecha de escritura
            </label>
            <input
              type="date"
              name="fecha_escritura"
              defaultValue={propiedad?.fecha_escritura ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </>
      )}

      {estado === "facturado" && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Número de factura</label>
          <input
            name="numero_factura"
            defaultValue={propiedad?.numero_factura ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}

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
