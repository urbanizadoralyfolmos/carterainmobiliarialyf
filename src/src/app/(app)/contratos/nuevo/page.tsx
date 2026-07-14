import { createClient } from "@/lib/supabase/server";
import { ContratoForm } from "@/components/ContratoForm";
import { crearContrato } from "../actions";

export default async function NuevoContratoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: clientes }, { data: propiedades }] = await Promise.all([
    supabase.from("clientes").select("id, nombre, apellido").order("apellido"),
    supabase.from("propiedades").select("id, direccion").order("direccion"),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Nuevo contrato</h1>
      <ContratoForm
        clientes={clientes ?? []}
        propiedades={propiedades ?? []}
        action={crearContrato}
        error={error}
        esNuevo
      />
    </div>
  );
}
