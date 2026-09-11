export type CuotaMora = {
  fecha_vencimiento: string;
  estado: string;
};

/**
 * Calcula solo los días de atraso de una cuota (sin aplicar ninguna tasa ni
 * calcular recargo/mora en dinero). Se usa únicamente para saber si una
 * cuota está vencida y hace cuánto, no para modificar ningún saldo.
 */
export function calcularMora(cuota: CuotaMora) {
  if (cuota.estado === "pagada") {
    return { diasMora: 0 };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(cuota.fecha_vencimiento + "T00:00:00");

  const diffMs = hoy.getTime() - vencimiento.getTime();
  const diasMora = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  return { diasMora };
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
