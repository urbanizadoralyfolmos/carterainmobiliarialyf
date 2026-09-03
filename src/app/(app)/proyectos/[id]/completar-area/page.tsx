import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompletarAreaForm } from "@/components/CompletarAreaForm";
import { guardarAreasLotes } from "../../actions";

export default async function CompletarAreaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cantidad?: string; error?: string }>;
}) {
  const { id } = await params;
  const { cantidad: cantidadParam, error } = await searchParams;
  const supabase = await createClient();

  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .single();

  if (!proyecto) notFound();

  const cantidad = Math.max(1, Math.min(1000, Number(cantidadParam ?? 0) || 0));
  if (!cantidad) {
    redirect(`/proyectos/${id}`);
  }

  // Tomamos los últimos `cantidad` lotes creados para este proyecto: son
  // justo los que se acaban de generar en bloque.
  const { data: recientes } = await supabase
    .from("propiedades")
    .select("id, direccion, manzana, numero_lote, superficie_m2, valor_referencia, created_at")
    .eq("proyecto_id", id)
    .order("created_at", { ascending: false })
    .limit(cantidad);

  const lotes = (recientes ?? [])
    .slice()
    .sort((a, b) => {
      if (a.manzana !== b.manzana) return (a.manzana ?? "").localeCompare(b.manzana ?? "");
      return (a.numero_lote ?? "").localeCompare(b.numero_lote ?? "", undefined, { numeric: true });
    });

  const guardarConId = guardarAreasLotes.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Completar áreas — {proyecto.nombre}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Se generaron {lotes.length} lotes. Cargá el área (m²) de cada uno; el valor
            se recalcula solo.
          </p>
        </div>
        <Link href={`/proyectos/${id}`} className="text-sm text-slate-500 hover:underline">
          Omitir por ahora →
        </Link>
      </div>

      <div className="mt-6">
        {lotes.length === 0 ? (
          <p className="text-sm text-slate-400">
            No se encontraron los lotes recién creados. Volvé al{" "}
            <Link href={`/proyectos/${id}`} className="text-brand hover:underline">
              detalle del proyecto
            </Link>{" "}
            para verlos y editarlos uno a uno.
          </p>
        ) : (
          <CompletarAreaForm
            lotes={lotes}
            valorM2={proyecto.valor_m2}
            action={guardarConId}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
