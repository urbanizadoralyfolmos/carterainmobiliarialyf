import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropiedadForm } from "@/components/PropiedadForm";
import { actualizarPropiedad } from "../actions";

export default async function EditarPropiedadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: propiedad } = await supabase
    .from("propiedades")
    .select("*")
    .eq("id", id)
    .single();

  if (!propiedad) notFound();

  const { data: contratoVinculado } = await supabase
    .from("contratos")
    .select("numero, estado")
    .eq("propiedad_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const actualizarConId = actualizarPropiedad.bind(null, id);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">
        Editar propiedad: {propiedad.direccion}
      </h1>
      <PropiedadForm
        propiedad={propiedad}
        contratoVinculado={contratoVinculado}
        action={actualizarConId}
        error={error}
      />
    </div>
  );
}
