import { createClient } from "@/lib/supabase/server";

/** Clave interna usada para agrupar los contratos sin proyecto asignado. */
export const SIN_PROYECTO_ID = "sin-proyecto";

type ProyectoRel =
  | { id: string; nombre: string }
  | { id: string; nombre: string }[]
  | null
  | undefined;

function proyectoDe(rel: ProyectoRel): { id: string | null; nombre: string } {
  const p = Array.isArray(rel) ? rel[0] : rel;
  return { id: p?.id ?? null, nombre: p?.nombre ?? "" };
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
  /** null cuando es el grupo "Sin proyecto". */
  proyectoId: string | null;
  proyecto: string;
  clientes: ClienteProyectoFila[];
};

export type ProyectoOpcion = { id: string; nombre: string };

function nombreClienteDe(c: NonNullable<ClienteRel>) {
  if (c.tipo_persona === "juridica" && c.razon_social) return c.razon_social;
  return `${c.apellido}, ${c.nombre}`;
}

function documentoDe(c: NonNullable<ClienteRel>) {
  return (c.tipo_persona === "juridica" ? c.nit : c.documento) ?? "-";
}

/** Proyectos disponibles para el selector de filtro antes de exportar. */
export async function getProyectosDisponibles(): Promise<ProyectoOpcion[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("proyectos").select("id, nombre").order("nombre");
  return data ?? [];
}

/**
 * Arma el listado de clientes con sus datos de contacto, agrupados por el
 * proyecto de las propiedades que tienen contratadas. Un mismo cliente puede
 * aparecer en más de un proyecto si tiene contratos en varios; dentro de un
 * mismo proyecto se agrupan todos sus contratos/propiedades en una sola fila
 * para no repetir sus datos de contacto varias veces. Las propiedades sin
 * proyecto asignado quedan en el grupo "Sin proyecto" (id `SIN_PROYECTO_ID`).
 *
 * `proyectoIdsSeleccionados`, si se indica, limita el resultado solo a esos
 * proyectos (usar `SIN_PROYECTO_ID` para incluir el grupo "Sin proyecto").
 * Si se omite, se devuelven todos los proyectos.
 */
export async function getClientesPorProyecto(
  proyectoIdsSeleccionados?: string[]
): Promise<ClientesPorProyecto[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("contratos")
    .select(
      "id, numero, clientes(id, nombre, apellido, documento, email, telefono, direccion, tipo_persona, razon_social, nit), contrato_propiedades(propiedades(direccion, proyectos(id, nombre)))"
    )
    .order("numero", { ascending: true });

  type Acumulado = {
    cliente: NonNullable<ClienteRel>;
    contratos: Set<string>;
    propiedades: Set<string>;
  };

  // clave de proyecto (id real o SIN_PROYECTO_ID) -> clienteId -> acumulado
  const porProyecto = new Map<string, Map<string, Acumulado>>();
  const nombresPorClave = new Map<string, string>();

  for (const row of (data ?? []) as unknown as ContratoRow[]) {
    const cliente = row.clientes;
    if (!cliente) continue;

    // Las propiedades de un mismo contrato pueden pertenecer a distintos
    // proyectos (caso poco común, pero posible); se agrupan por proyecto.
    const porClaveDelContrato = new Map<string, string[]>();
    for (const cp of row.contrato_propiedades ?? []) {
      const prop = cp.propiedades;
      if (!prop) continue;
      const { id: proyectoId, nombre } = proyectoDe(prop.proyectos);
      const clave = proyectoId ?? SIN_PROYECTO_ID;
      nombresPorClave.set(clave, proyectoId ? nombre : "Sin proyecto");
      if (!porClaveDelContrato.has(clave)) porClaveDelContrato.set(clave, []);
      porClaveDelContrato.get(clave)?.push(prop.direccion);
    }

    for (const [clave, direcciones] of porClaveDelContrato) {
      if (!porProyecto.has(clave)) porProyecto.set(clave, new Map());
      const clientesDelProyecto = porProyecto.get(clave)!;
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

  let claves = Array.from(porProyecto.keys());

  if (proyectoIdsSeleccionados) {
    const permitidas = new Set(proyectoIdsSeleccionados);
    claves = claves.filter((clave) => permitidas.has(clave));
  }

  claves.sort((a, b) => {
    if (a === SIN_PROYECTO_ID) return 1;
    if (b === SIN_PROYECTO_ID) return -1;
    return (nombresPorClave.get(a) ?? "").localeCompare(nombresPorClave.get(b) ?? "");
  });

  return claves.map((clave) => {
    const clientesMap = porProyecto.get(clave)!;
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
    return {
      proyectoId: clave === SIN_PROYECTO_ID ? null : clave,
      proyecto: nombresPorClave.get(clave) ?? "Sin proyecto",
      clientes,
    };
  });
}
