import { calcularMora } from "./mora";

export type CuotaResumen = {
  id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto: number;
  monto_pagado: number;
  estado: string;
  fecha_pago: string | null;
  referencia?: string | null;
  numero_recibo?: string | null;
};

export type CuotaConMora = CuotaResumen & { diasMora: number };

/**
 * Calcula totales (monto, pagado, pendiente) de un conjunto de cuotas.
 * No aplica ninguna tasa de mora ni calcula recargos en dinero: `diasMora`
 * es solo informativo, para saber hace cuánto está vencida una cuota.
 */
export function resumenCuotas(cuotas: CuotaResumen[]) {
  let totalMonto = 0;
  let totalPagado = 0;

  const detalle: CuotaConMora[] = cuotas.map((c) => {
    const { diasMora } = calcularMora({
      fecha_vencimiento: c.fecha_vencimiento,
      estado: c.estado,
    });
    totalMonto += c.monto;
    totalPagado += c.monto_pagado;
    return { ...c, diasMora };
  });

  return {
    detalle,
    totalMonto,
    totalPagado,
    totalPendiente: Math.max(0, totalMonto - totalPagado),
  };
}
