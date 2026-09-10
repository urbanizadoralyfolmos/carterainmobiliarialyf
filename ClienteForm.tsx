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
  const [tipoPersona, setTipoPersona] = useState(cliente?.tipo_persona ?? "natural");

  return (
    <form action={action} className="mt-4 grid max-w-2xl grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="block text-sm font-medium text-slate-700">Tipo de cliente</label>
        <div className="mt-1 flex gap-2">
          <label
            className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm ${
              tipoPersona === "natural"
                ? "border-brand bg-brand-light text-brand-dark"
                : "border-slate-300 text-slate-600"
            }`}
          >
            <input
              type="radio"
              name="tipo_persona"
              value="natural"
              checked={tipoPersona === "natural"}
              onChange={() => setTipoPersona("natural")}
              className="sr-only"
            />
            Persona natural
          </label>
          <label
            className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm ${
              tipoPersona === "juridica"
                ? "border-brand bg-brand-light text-brand-dark"
                : "border-slate-300 text-slate-600"
            }`}
          >
            <input
              type="radio"
              name="tipo_persona"
              value="juridica"
              checked={tipoPersona === "juridica"}
              onChange={() => setTipoPersona("juridica")}
              className="sr-only"
            />
            Persona jurídica
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          {tipoPersona === "juridica" ? "Nombre del representante" : "Nombre"}
        </label>
        <input
          name="nombre"
          defaultValue={cliente?.nombre}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          {tipoPersona === "juridica" ? "Apellido del representante" : "Apellido"}
        </label>
        <input
          name="apellido"
          defaultValue={cliente?.apellido}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {tipoPersona === "juridica" && (
        <>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700">Razón social</label>
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
              required
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
      )}

      {tipoPersona === "natural" && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Documento</label>
          <input
            name="documento"
            defaultValue={cliente?.documento ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}
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
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}
