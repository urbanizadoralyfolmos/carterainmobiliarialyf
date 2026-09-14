import { createClient } from "@/lib/supabase/server";

type ProyectoRel = { nombre: string } | { nombre: string }[] | null | undefined;

function nombreProyecto(rel: ProyectoRel) {
  if (Array.isArray(rel)) return rel[0]?.nombre ?? "";
  return rel?.nombre ?? "";
}

type ClienteRel = {
  id: string;
  nombre: string;
  apellido: string;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  tipo_persona: "natural" | "juridica";
  razon_social: string | null;
  nit: string | null;
} | null;

type PropiedadRel = { direccion: string; proyectos?: ProyectoRel } | null;

type ContratoRow = {
  id: string;
  numero: number;
  clientes: ClienteRel;
  contrato_propiedades?: { propiedades: PropiedadRel }[];
};

export type ClienteProyectoFila = {
  clienteId: string;
  nombreCliente: string;
  tipoPersona: "natural" | "juridica";
  documento: string;
  email: string;
  telefono: string;
  direccion: string;
  contratos: string;
  propiedadesTexto: string;
};

export type ClientesPorProyecto = {
  proyecto: string;
  clientes: ClienteProyectoFila[];
};

function nombreClienteDe(c: NonNullable<ClienteRel>) {
  if (c.tipo_persona === "juridica" && c.razon_social) return c.razon_social;
  return `${c.apellido}, ${c.nombre}`;
}

function documentoDe(c: NonNullable<ClienteRel>) {
  return (c.tipo_persona === "juridica" ? c.nit : c.documento) ?? "-";
}

/**
 * Arma el listado de clientes con sus datos de contacto, agrupados por el
 * proyecto de las propiedades que tienen contratadas. Un mismo cliente puede
 * aparecer en más de un proyecto si tiene contratos en varios; dentro de un
 * mismo proyecto se agrupan todos sus contratos/propiedades en una sola fila
 * para no repetir sus datos de contacto varias veces. Las propiedades sin
 * proyecto asignado quedan en el grupo "Sin proyecto".
 */
export async function getClientesPorProyecto(): Promise<ClientesPorProyecto[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("contratos")
    .select(
      "id, numero, clientes(id, nombre, apellido, documento, email, telefono, direccion, tipo_persona, razon_social, nit), contrato_propiedades(propiedades(direccion, proyectos(nombre)))"
    )
    .order("numero", { ascending: true });

  type Acumulado = {
    cliente: NonNullable<ClienteRel>;
    contratos: Set<string>;
    propiedades: Set<string>;
  };

  const porProyecto = new Map<string, Map<string, Acumulado>>();

  for (const row of (data ?? []) as unknown as ContratoRow[]) {
    const cliente = row.clientes;
    if (!cliente) continue;

    // Las propiedades de un mismo contrato pueden pertenecer a distintos
    // proyectos (caso poco común, pero posible); se agrupan por proyecto.
    const direccionesPorProyecto = new Map<string, string[]>();
    for (const cp of row.contrato_propiedades ?? []) {
      const prop = cp.propiedades;
      if (!prop) continue;
      const nombreProy = nombreProyecto(prop.proyectos) || "Sin proyecto";
      if (!direccionesPorProyecto.has(nombreProy)) direccionesPorProyecto.set(nombreProy, []);
      direccionesPorProyecto.get(nombreProy)?.push(prop.direccion);
    }

    for (const [proyecto, direcciones] of direccionesPorProyecto) {
      if (!porProyecto.has(proyecto)) porProyecto.set(proyecto, new Map());
      const clientesDelProyecto = porProyecto.get(proyecto)!;
      if (!clientesDelProyecto.has(cliente.id)) {
        clientesDelProyecto.set(cliente.id, {
          cliente,
          contratos: new Set(),
          propiedades: new Set(),
        });
      }
      const entry = clientesDelProyecto.get(cliente.id)!;
      entry.contratos.add(`N.º ${row.numero}`);
      direcciones.forEach((d) => entry.propiedades.add(d));
    }
  }

  const proyectos = Array.from(porProyecto.keys()).sort((a, b) => {
    if (a === "Sin proyecto") return 1;
    if (b === "Sin proyecto") return -1;
    return a.localeCompare(b);
  });

  return proyectos.map((proyecto) => {
    const clientesMap = porProyecto.get(proyecto)!;
    const clientes: ClienteProyectoFila[] = Array.from(clientesMap.values())
      .map(({ cliente, contratos, propiedades }) => ({
        clienteId: cliente.id,
        nombreCliente: nombreClienteDe(cliente),
        tipoPersona: cliente.tipo_persona,
        documento: documentoDe(cliente),
        email: cliente.email ?? "-",
        telefono: cliente.telefono ?? "-",
        direccion: cliente.direccion ?? "-",
        contratos: Array.from(contratos).join(", "),
        propiedadesTexto: Array.from(propiedades).join(", "),
      }))
      .sort((a, b) => a.nombreCliente.localeCompare(b.nombreCliente));
    return { proyecto, clientes };
  });
}
