export function formatMoney(amount: number | null | undefined, moneda = "ARS") {
  const value = amount ?? 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "USD" ? "USD" : "ARS",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
    new Date(date + "T00:00:00")
  );
}
