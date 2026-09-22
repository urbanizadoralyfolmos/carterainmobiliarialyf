"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { eliminarPropiedad, eliminarPropiedades } from "@/app/(app)/propiedades/actions";
import { SeleccionarTodasCheckbox } from "@/components/SeleccionarTodasCheckbox";
import { EliminarSeleccionadasButton } from "@/components/EliminarSeleccionadasButton";

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

type FilaPropiedad = {
  id: string;
  direccion: string;
  proyectoNombre: string | null;
  tipo: string;
  ciudad: string | null;
  superficie_m2: number | null;
  valor_referencia: number | null;
  estado: string;
  contratoNumero: number | null;
  contratoEstado: string | null;
  numeroFactura: string | null;
  numeroEscritura: string | null;
  fechaEscritura: string | null;
};

export function PropiedadesTable({
  filas,
  admin,
  currentHref,
}: {
  filas: FilaPropiedad[];
  admin: boolean;
  currentHref: string;
}) {
  const [seleccionando, setSeleccionando] = useState(false);
  const mostrarCheckboxes = admin && seleccionando;

  return (
    <form action={eliminarPropiedades}>
      <input type="hidden" name="redirect_to" value={currentHref} />

      {admin && (
        <div className="mt-4 flex items-center justify-between">
          {seleccionando ? (
            <>
              <p className="text-xs text-slate-500">
                Marca las propiedades que quieras eliminar y usa el botón de abajo para borrarlas
                todas de una vez.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSeleccionando(false)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <EliminarSeleccionadasButton className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50" />
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSeleccionando(true)}
              className="ml-auto rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Eliminar por selección
            </button>
          )}
        </div>
      )}

      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                {mostrarCheckboxes && (
                  <th className="px-4 py-2">
                    <SeleccionarTodasCheckbox />
                  </th>
                )}
                <th className="px-4 py-2">Dirección</th>
                <th className="px-4 py-2">Proyecto</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Ciudad</th>
                <th className="px-4 py-2">m²</th>
                <th className="px-4 py-2">Valor</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Detalle</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  {mostrarCheckboxes && (
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        name="propiedad_ids"
                        value={p.id}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                  )}
                  <td className="px-4 py-2 font-medium text-slate-900">
                    <Link href={`/propiedades/${p.id}`} className="hover:underline">
                      {p.direccion}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{p.proyectoNombre ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-600 capitalize">{p.tipo}</td>
                  <td className="px-4 py-2 text-slate-600">{p.ciudad ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {p.superficie_m2 ? p.superficie_m2 : "-"}
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
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {p.estado === "prometido_en_venta" && p.contratoNumero && (
                      <span className="text-amber-700">
                        Contrato N.º {p.contratoNumero} ({p.contratoEstado})
                      </span>
                    )}
                    {p.estado === "escriturado" && (
                      <span className="text-blue-700">
                        {p.numeroEscritura
                          ? `Escritura N.º ${p.numeroEscritura}`
                          : "Sin número de escritura"}
                        {p.fechaEscritura ? ` · ${formatDate(p.fechaEscritura)}` : ""}
                      </span>
                    )}
                    {p.estado === "facturado" && (
                      <span className="text-purple-700">
                        {p.numeroFactura
                          ? `Factura N.º ${p.numeroFactura}`
                          : "Sin número de factura"}
                      </span>
                    )}
                    {p.estado === "disponible" && "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {admin ? (
                      <>
                        <Link
                          href={`/propiedades/${p.id}`}
                          className="text-slate-600 hover:text-slate-900 hover:underline"
                        >
                          Editar
                        </Link>
                        <button
                          type="submit"
                          formAction={eliminarPropiedad.bind(null, p.id)}
                          className="ml-3 text-red-600 hover:text-red-800 hover:underline"
                        >
                          Eliminar
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td
                    colSpan={mostrarCheckboxes ? 10 : 9}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    Todavía no hay propiedades cargadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}
