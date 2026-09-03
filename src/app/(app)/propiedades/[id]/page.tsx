import Link from "next/link";
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

  const [{ data: vinculos }, { data: proyectos }] = await Promise.all([
    supabase
      .from("contrato_propiedades")
      .select("contratos(numero, estado, created_at)")
      .eq("propiedad_id", id),
    supabase.from("proyectos").select("id, nombre, valor_m2").order("nombre"),
  ]);

  const contratoVinculado = (vinculos ?? [])
    .map(
      (v) =>
        v.contratos as unknown as { numero: number; estado: string; created_at: string } | null
    )
    .filter((c): c is { numero: number; estado: string; created_at: string } => !!c)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ??
    null;

  const actualizarConId = actualizarPropiedad.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">
          Editar propiedad: {propiedad.direccion}
        </h1>
        <Link
          href={`/propiedades/${id}/estado-cuenta`}
          className="text-sm text-slate-500 hover:underline"
        >
          Ver estado de cuenta
        </Link>
      </div>
      <PropiedadForm
        propiedad={propiedad}
        proyectos={proyectos ?? []}
        contratoVinculado={contratoVinculado}
        action={actualizarConId}
        error={error}
      />
    </div>
  );
}
