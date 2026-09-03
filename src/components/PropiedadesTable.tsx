"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/utils/format";

const ESTADO_LABELS: Record<string, string> = {
  disponible: "Disponible",
  prometido_en_venta: "Prometido en venta",
  escriturado: "Escriturado",
  facturado: "Facturado",
};

const ESTADO_STYLES: Record<string, string> = {
  disponible: "bg-green-100 text-green-800",
  prometido_en_venta: "bg-amber-100 text-amber-800",
  escriturado: "bg-blue-100 text-blue-800",
  facturado: "bg-purple-100 text-purple-800",
};

type PropiedadItem = {
  id: string;
  direccion: string;
  estado: string;
  tipo: string;
  ciudad: string | null;
  manzana: string | null;
  numero_lote: string | null;
  superficie_m2: number | null;
  valor_referencia: number | null;
  numero_escritura: string | null;
  fecha_escritura: string | null;
  numero_factura: string | null;
  proyectos?: { nombre: string } | null;
  contrato?: { numero: number; estado: string } | null;
};

export function PropiedadesTable({
  propiedades,
  eliminarUna,
  eliminarVarias,
  redirectTo,
}: {
  propiedades: PropiedadItem[];
  eliminarUna: (id: string, formData: FormData) => void;
  eliminarVarias: (formData: FormData) => void;
  redirectTo: string;
}) {
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

  const todasSeleccionadas =
    propiedades.length > 0 && seleccionadas.size === propiedades.length;

  function toggle(id: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodas() {
    setSeleccionadas((prev) =>
      prev.size === propiedades.length ? new Set() : new Set(propiedades.map((p) => p.id))
    );
  }

  function detalle(p: PropiedadItem) {
    if (p.estado === "prometido_en_venta" && p.contrato) {
      return `Contrato N.º ${p.contrato.numero} (${p.contrato.estado})`;
    }
    if (p.estado === "escriturado") {
      const escritura = p.numero_escritura ? `Escritura N.º ${p.numero_escritura}` : "Sin N.º de escritura";
      return p.fecha_escritura ? `${escritura} · ${formatDate(p.fecha_escritura)}` : escritura;
    }
    if (p.estado === "facturado") {
      return p.numero_factura ? `Factura N.º ${p.numero_factura}` : "Sin N.º de factura";
    }
    return null;
  }

  return (
    <div>
      {propiedades.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              checked={todasSeleccionadas}
              onChange={toggleTodas}
              className="h-4 w-4 rounded border-slate-300"
            />
            {seleccionadas.size > 0
              ? `${seleccionadas.size} seleccionada${seleccionadas.size > 1 ? "s" : ""}`
              : "Seleccionar todas"}
          </label>

          <form
            action={eliminarVarias}
            onSubmit={(e) => {
              if (
                !confirm(
                  `¿Eliminar ${seleccionadas.size} propiedad${
                    seleccionadas.size > 1 ? "es" : ""
                  }? Esta acción no se puede deshacer.`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="redirect_to" value={redirectTo} />
            {Array.from(seleccionadas).map((id) => (
              <input key={id} type="hidden" name="ids" value={id} />
            ))}
            <button
              type="submit"
              disabled={seleccionadas.size === 0}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Eliminar seleccionadas
            </button>
          </form>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="w-10 px-4 py-2">
                <input
                  type="checkbox"
                  checked={todasSeleccionadas}
                  onChange={toggleTodas}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-2">Dirección / Lote</th>
              <th className="px-4 py-2">Proyecto</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Ciudad</th>
              <th className="px-4 py-2">Superficie</th>
              <th className="px-4 py-2">Valor</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Detalle</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {propiedades.map((p) => (
              <tr
                key={p.id}
                className={seleccionadas.has(p.id) ? "bg-brand-light/40" : "hover:bg-slate-50"}
              >
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={seleccionadas.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </td>
                <td className="px-4 py-2 font-medium text-slate-900">
                  {p.direccion}
                  {p.manzana || p.numero_lote ? (
                    <div className="text-xs font-normal text-slate-400">
                      {p.manzana ? `Mz ${p.manzana}` : ""}
                      {p.manzana && p.numero_lote ? " · " : ""}
                      {p.numero_lote ? `Lote ${p.numero_lote}` : ""}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-2 text-slate-600">{p.proyectos?.nombre ?? "-"}</td>
                <td className="px-4 py-2 text-slate-600 capitalize">{p.tipo}</td>
                <td className="px-4 py-2 text-slate-600">{p.ciudad ?? "-"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {p.superficie_m2 ? `${p.superficie_m2} m²` : "-"}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {p.valor_referencia ? formatMoney(p.valor_referencia) : "-"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      ESTADO_STYLES[p.estado] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {ESTADO_LABELS[p.estado] ?? p.estado}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-slate-500">{detalle(p) ?? "-"}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-3 text-sm">
                    <Link
                      href={`/propiedades/${p.id}`}
                      className="text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={eliminarUna.bind(null, p.id)}>
                      <button
                        type="submit"
                        className="text-red-600 hover:text-red-800 hover:underline"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {propiedades.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                  Todavía no hay propiedades cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
