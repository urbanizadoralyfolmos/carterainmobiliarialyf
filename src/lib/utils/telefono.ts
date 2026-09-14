/**
 * Normaliza un número de contacto al formato internacional (+57...) que
 * requieren envíos por WhatsApp/SMS más adelante. Si el número ya viene con
 * un "+" (por ejemplo un cliente extranjero cargado con su propio código de
 * país) se deja tal cual. Se usa cada vez que se guarda el teléfono de un
 * cliente, para no depender de que se escriba siempre con el mismo formato.
 *
 * Devuelve `null` si no hay nada que normalizar (campo vacío).
 */
export function normalizarTelefonoCO(valor: string | null | undefined): string | null {
  if (!valor) return null;

  // Quita espacios, guiones, puntos y paréntesis usados al escribir el número.
  const limpio = valor.replace(/[\s\-().]/g, "");
  if (limpio === "") return null;

  if (limpio.startsWith("+")) return limpio;
  if (limpio.startsWith("57")) return `+${limpio}`;
  return `+57${limpio}`;
}
