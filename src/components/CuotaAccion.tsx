"use client";

import { useState } from "react";
import Link from "next/link";
import { registrarPago, revertirPago } from "@/app/(app)/cuotas/actions";

export function CuotaAccion({
  cuotaId,
  estado,
  montoCuota,
  montoPagado,
  referencia,
  admin,
  resumen,
}: {
  cuotaId: string;
  estado: string;
  montoCuota: number;
  montoPagado: number;
  referencia: string | null;
  admin: boolean;
  resumen: string;
}) {
  const [modo, setModo] = useState<"ninguno" | "pagar" | "revertir">("ninguno");
  const hoy = new Date().toISOString().slice(0, 10);
  const tienePagoActivo = montoPagado > 0;

  return (
    <div className="flex flex-col items-end gap-1">
      {tienePagoActivo && (
        <Link
          href={`/recibos?cuota=${cuotaId}`}
          className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
        >
          Ver recibo(s)
        </Link>
      )}

      {modo === "ninguno" && (
        <div className="flex items-center gap-2">
          {estado !== "pagada" && (
            <button
              type="button"
              onClick={() => setModo("pagar")}
              className="rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-dark"
            >
              Pagar
            </button>
          )}
          {admin && tienePagoActivo && (
            <button
              type="button"
              onClick={() => setModo("revertir")}
              className="text-xs text-slate-500 hover:text-red-700 hover:underline"
            >
              Reversar pago
            </button>
          )}
        </div>
      )}

      {modo === "pagar" && (
        <form
          action={registrarPago.bind(null, cuotaId)}
          onSubmit={(e) => {
            if (
              !window.confirm(
                `Vas a registrar un pago para:\n\n${resumen}\n\n¿Confirmás que es la cuota correcta?`
              )
            ) {
              e.preventDefault();
            }
          }}
          className="flex flex-col items-end gap-1 rounded-md border border-slate-200 bg-slate-50 p-2"
        >
          <input type="hidden" name="monto_cuota" value={montoCuota} />
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.01"
              name="monto_pagado"
              defaultValue={montoCuota}
              title="Monto total pagado acumulado de esta cuota"
              className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
            <input
              type="date"
              name="fecha_pago"
              defaultValue={hoy}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
          </div>
          <input
            type="text"
            name="referencia"
            placeholder="Referencia"
            defaultValue={referencia ?? ""}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
          <input
            type="text"
            name="notas"
            placeholder="Notas (opcional)"
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModo("ninguno")}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-dark"
            >
              Confirmar pago
            </button>
          </div>
        </form>
      )}

      {modo === "revertir" && (
        <form
          action={revertirPago.bind(null, cuotaId)}
          onSubmit={(e) => {
            if (
              !window.confirm(
                `Vas a reversar el último pago de:\n\n${resumen}\n\nEsta acción queda registrada con el motivo indicado. ¿Confirmás?`
              )
            ) {
              e.preventDefault();
            }
          }}
          className="flex flex-col items-end gap-1 rounded-md border border-red-200 bg-red-50 p-2"
        >
          <input
            type="text"
            name="motivo"
            required
            placeholder="Motivo de la reversión (obligatorio)"
            className="w-56 rounded-md border border-red-300 px-2 py-1 text-xs"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModo("ninguno")}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
            >
              Confirmar reversión
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
