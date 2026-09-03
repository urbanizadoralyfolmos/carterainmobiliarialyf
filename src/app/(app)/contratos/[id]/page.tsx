import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContratoForm } from "@/components/ContratoForm";
import { nombreCliente } from "@/lib/utils/format";
import { actualizarContrato } from "../actions";

export default async function EditarContratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: contrato }, { data: clientes }, { data: propiedades }, { data: vinculos }] =
    await Promise.all([
      supabase.from("contratos").select("*").eq("id", id).single(),
      supabase.from("clientes").select("id, nombre, apellido, tipo_persona, razon_social"),
      supabase
        .from("propiedades")
        .select("id, direccion, proyectos(nombre)")
        .order("direccion"),
      supabase.from("contrato_propiedades").select("propiedad_id").eq("contrato_id", id),
    ]);

  if (!contrato) notFound();

  const clientesOrdenados = (clientes ?? []).sort((a, b) =>
    nombreCliente(a).localeCompare(nombreCliente(b), "es")
  );
  const propiedadIdsSeleccionadas = (vinculos ?? []).map((v) => v.propiedad_id as string);
  const actualizarConId = actualizarContrato.bind(null, id);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Editar contrato</h1>
      <ContratoForm
        contrato={contrato}
        clientes={clientesOrdenados}
        propiedades={propiedades ?? []}
        propiedadIdsSeleccionadas={propiedadIdsSeleccionadas}
        action={actualizarConId}
        error={error}
        esNuevo={false}
      />
    </div>
  );
}
