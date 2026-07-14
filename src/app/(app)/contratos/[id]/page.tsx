import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContratoForm } from "@/components/ContratoForm";
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

  const [{ data: contrato }, { data: clientes }, { data: propiedades }] =
    await Promise.all([
      supabase.from("contratos").select("*").eq("id", id).single(),
      supabase.from("clientes").select("id, nombre, apellido").order("apellido"),
      supabase.from("propiedades").select("id, direccion").order("direccion"),
    ]);

  if (!contrato) notFound();

  const actualizarConId = actualizarContrato.bind(null, id);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Editar contrato</h1>
      <ContratoForm
        contrato={contrato}
        clientes={clientes ?? []}
        propiedades={propiedades ?? []}
        action={actualizarConId}
        error={error}
        esNuevo={false}
      />
    </div>
  );
}
