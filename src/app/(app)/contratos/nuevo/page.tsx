import { createClient } from "@/lib/supabase/server";
import { ContratoForm } from "@/components/ContratoForm";
import { nombreCliente } from "@/lib/utils/format";
import { crearContrato } from "../actions";

export default async function NuevoContratoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: clientes }, { data: propiedades }] = await Promise.all([
    supabase.from("clientes").select("id, nombre, apellido, tipo_persona, razon_social"),
    supabase
      .from("propiedades")
      .select("id, direccion, proyectos(nombre)")
      .eq("estado", "disponible")
      .order("direccion"),
  ]);

  const clientesOrdenados = (clientes ?? []).sort((a, b) =>
    nombreCliente(a).localeCompare(nombreCliente(b), "es")
  );

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Nuevo contrato</h1>
      <ContratoForm
        clientes={clientesOrdenados}
        propiedades={propiedades ?? []}
        action={crearContrato}
        error={error}
        esNuevo
      />
    </div>
  );
}
