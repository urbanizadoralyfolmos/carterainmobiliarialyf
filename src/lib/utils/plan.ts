/** Igual que generarFechasCuotas pero sin depender del servidor (uso en cliente). */
export function fechaCuota(
  fechaInicio: string,
  numero: number,
  diaVencimiento: number,
  offsetMeses = 1
) {
  if (!fechaInicio) return "";
  const inicio = new Date(fechaInicio + "T00:00:00");
  const fecha = new Date(
    inicio.getFullYear(),
    inicio.getMonth() + offsetMeses + (numero - 1),
    diaVencimiento
  );
  return fecha.toISOString().slice(0, 10);
}
