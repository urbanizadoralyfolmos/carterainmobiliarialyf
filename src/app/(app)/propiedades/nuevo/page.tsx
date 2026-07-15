import { createClient } from "@/lib/supabase/server";
import { PropiedadForm } from "@/components/PropiedadForm";
import { crearPropiedad } from "../actions";

export default async function NuevaPropiedadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("id, nombre")
    .order("nombre");

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Nueva propiedad</h1>
      <PropiedadForm proyectos={proyectos ?? []} action={crearPropiedad} error={error} />
    </div>
  );
}
