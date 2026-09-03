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

export type PropiedadParaEtiqueta = {
  direccion: string;
  proyectos?: { nombre: string } | { nombre: string }[] | null;
};

export function etiquetaPropiedad(p: PropiedadParaEtiqueta) {
  const proyecto = Array.isArray(p.proyectos) ? p.proyectos[0] : p.proyectos;
  return proyecto?.nombre ? `${proyecto.nombre} - ${p.direccion}` : p.direccion;
}

// Un contrato ahora puede tener varias propiedades asociadas; esto arma
// una etiqueta legible tipo "Proyecto X - Lote 1, Lote 2".
export function formatPropiedadesLabel(
  propiedades: PropiedadParaEtiqueta[] | null | undefined
) {
  if (!propiedades || propiedades.length === 0) return "-";
  return propiedades.map(etiquetaPropiedad).join(", ");
}

export type ClienteParaEtiqueta = {
  tipo_persona?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  razon_social?: string | null;
};

// Un cliente puede ser persona natural o jurídica (sociedad); esto arma
// el nombre a mostrar en cada caso: "Apellido, Nombre" o la razón social.
export function nombreCliente(c: ClienteParaEtiqueta) {
  if (c.tipo_persona === "juridica") return c.razon_social || "-";
  return [c.apellido, c.nombre].filter(Boolean).join(", ") || "-";
}

// Igual que nombreCliente pero en orden "Nombre Apellido" (para los
// lugares del código que ya usaban ese orden).
export function nombreClienteDirecto(c: ClienteParaEtiqueta) {
  if (c.tipo_persona === "juridica") return c.razon_social || "-";
  return [c.nombre, c.apellido].filter(Boolean).join(" ") || "-";
}
