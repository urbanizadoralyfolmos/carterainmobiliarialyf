import { createClient } from "@/lib/supabase/server";
import { resumenCuotas } from "@/lib/utils/estado-cuenta";

export type PropiedadResumen = {
  direccion: string;
  manzana: string | null;
  numero_lote: string | null;
  proyecto: string | null;
};

/**
 * Carga toda la información necesaria para el estado de cuenta de un
 * contrato (cliente, propiedades vinculadas y detalle/resumen de cuotas
 * con mora calculada). Se usa tanto en la página de pantalla como en los
 * endpoints de exportación a Excel y PDF, para no duplicar la consulta.
 */
export async function getEstadoCuentaContrato(id: string) {
  const supabase = await createClient();

  const { data: contrato } = await supabase
    .from("contratos")
    .select(
      "*, clientes(*), contrato_propiedades(propiedades(direccion, manzana, numero_lote, proyectos(nombre))), cuotas(id, numero_cuota, fecha_vencimiento, monto, monto_pagado, estado, fecha_pago, referencia)"
    )
    .eq("id", id)
    .single();

  if (!contrato) return null;

  type PropiedadRel = {
    direccion: string;
    manzana: string | null;
    numero_lote: string | null;
    proyectos?: { nombre: string } | { nombre: string }[] | null;
  };

  const propiedades: PropiedadResumen[] = (
    (contrato.contrato_propiedades ?? []) as { propiedades: PropiedadRel | null }[]
  )
    .map((cp) => cp.propiedades)
    .filter((p): p is PropiedadRel => Boolean(p))
    .map((p) => {
      const proyectoRel = p.proyectos;
      const proyecto = Array.isArray(proyectoRel)
        ? proyectoRel[0]?.nombre ?? null
        : proyectoRel?.nombre ?? null;
      return {
        direccion: p.direccion,
        manzana: p.manzana ?? null,
        numero_lote: p.numero_lote ?? null,
        proyecto,
      };
    });

  const cliente = contrato.clientes ?? null;
  const nombreCliente =
    cliente?.tipo_persona === "juridica" && cliente?.razon_social
      ? cliente.razon_social
      : cliente
      ? `${cliente.apellido}, ${cliente.nombre}`
      : "Cliente sin datos";

  const resumen = resumenCuotas(contrato.cuotas ?? [], contrato.tasa_mora_mensual);

  return { contrato, cliente, nombreCliente, propiedades, resumen };
}

export type EstadoCuentaContrato = NonNullable<
  Awaited<ReturnType<typeof getEstadoCuentaContrato>>
>;
