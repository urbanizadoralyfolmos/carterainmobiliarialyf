"use client";

import { useState } from "react";
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
  const [tipoPersona, setTipoPersona] = useState<"natural" | "juridica">(
    cliente?.tipo_persona ?? "natural"
  );
  const esJuridica = tipoPersona === "juridica";

  return (
    <form action={action} className="mt-4 grid max-w-2xl grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="block text-sm font-medium text-slate-700">Tipo de cliente</label>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setTipoPersona("natural")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              !esJuridica
                ? "bg-brand text-white"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Persona natural
          </button>
          <button
            type="button"
            onClick={() => setTipoPersona("juridica")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              esJuridica
                ? "bg-brand text-white"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Persona jurídica
          </button>
        </div>
        {/* El backend decide qué campos guardar según este valor. */}
        <input type="hidden" name="tipo_persona" value={tipoPersona} />
      </div>

      {esJuridica ? (
        <>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Nombre de la sociedad (razón social)
            </label>
            <input
              name="razon_social"
              defaultValue={cliente?.razon_social ?? ""}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">NIT</label>
            <input
              name="nit"
              defaultValue={cliente?.nit ?? ""}
              placeholder="Ej: 900123456-7"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div />
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Representante legal
            </label>
            <input
              name="representante_nombre"
              defaultValue={cliente?.representante_nombre ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Documento del representante
            </label>
            <input
              name="representante_documento"
              defaultValue={cliente?.representante_documento ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700">Nombre</label>
            <input
              name="nombre"
              defaultValue={cliente?.nombre ?? ""}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Apellido</label>
            <input
              name="apellido"
              defaultValue={cliente?.apellido ?? ""}
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
          <div />
        </>
      )}

      <div className="col-span-2 mt-2 border-t border-slate-200 pt-4">
        <p className="text-xs font-medium uppercase text-slate-400">
          {esJuridica ? "Datos de contacto de la sociedad" : "Datos de contacto"}
        </p>
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
      <div className="col-span-2">
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
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}
