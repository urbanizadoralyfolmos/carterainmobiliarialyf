import { calcularMora } from "./mora";

export type CuotaResumen = {
  id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto: number;
  monto_pagado: number;
  estado: string;
  fecha_pago: string | null;
};

export type CuotaConMora = CuotaResumen & { diasMora: number; recargo: number };

/** Calcula totales (monto, pagado, pendiente, mora) de un conjunto de cuotas. */
export function resumenCuotas(cuotas: CuotaResumen[], tasaMoraMensual: number) {
  let totalMonto = 0;
  let totalPagado = 0;
  let totalMora = 0;

  const detalle: CuotaConMora[] = cuotas.map((c) => {
    const { diasMora, recargo } = calcularMora({
      fecha_vencimiento: c.fecha_vencimiento,
      monto: c.monto,
      monto_pagado: c.monto_pagado,
      estado: c.estado,
      tasa_mora_mensual: tasaMoraMensual,
    });
    totalMonto += c.monto;
    totalPagado += c.monto_pagado;
    totalMora += recargo;
    return { ...c, diasMora, recargo };
  });

  return {
    detalle,
    totalMonto,
    totalPagado,
    totalPendiente: Math.max(0, totalMonto - totalPagado),
    totalMora,
  };
}
