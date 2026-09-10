export type CuotaMora = {
  fecha_vencimiento: string;
  monto: number;
  monto_pagado: number;
  estado: string;
  tasa_mora_mensual: number;
};

/** Calcula días de mora y recargo al día de hoy para una cuota. */
export function calcularMora(cuota: CuotaMora) {
  if (cuota.estado === "pagada") {
    return { diasMora: 0, recargo: 0 };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(cuota.fecha_vencimiento + "T00:00:00");

  const diffMs = hoy.getTime() - vencimiento.getTime();
  const diasMora = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diasMora === 0) {
    return { diasMora: 0, recargo: 0 };
  }

  const saldo = cuota.monto - (cuota.monto_pagado ?? 0);
  const tasaDiaria = cuota.tasa_mora_mensual / 100 / 30;
  const recargo = Math.round(saldo * tasaDiaria * diasMora * 100) / 100;

  return { diasMora, recargo };
}

/**
 * Genera las fechas de vencimiento de un plan de cuotas mensual.
 * `offsetMeses` desplaza el inicio del plan (por defecto 1: la primera
 * cuota diferida vence un mes después de la fecha de inicio del contrato,
 * ya que la cuota inicial se paga en la firma).
 */
export function generarFechasCuotas(
  fechaInicio: string,
  cantidadCuotas: number,
  diaVencimiento: number,
  offsetMeses = 1
) {
  const fechas: string[] = [];
  const inicio = new Date(fechaInicio + "T00:00:00");

  for (let i = 0; i < cantidadCuotas; i++) {
    const fecha = new Date(
      inicio.getFullYear(),
      inicio.getMonth() + offsetMeses + i,
      diaVencimiento
    );
    fechas.push(fecha.toISOString().slice(0, 10));
  }

  return fechas;
}
