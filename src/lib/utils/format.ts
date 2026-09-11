export function formatMoney(amount: number | null | undefined, moneda = "COP") {
  const value = amount ?? 0;
  const currency = moneda === "USD" ? "USD" : "COP";

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "COP" ? 0 : 2,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(value);
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    new Date(date + "T00:00:00")
  );
}
