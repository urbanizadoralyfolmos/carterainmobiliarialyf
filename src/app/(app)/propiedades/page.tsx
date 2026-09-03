import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PropiedadesTable } from "@/components/PropiedadesTable";
import { eliminarPropiedad, eliminarPropiedades } from "./actions";

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string; error?: string }>;
}) {
  const { proyecto: proyectoFiltro, error: errorMsg } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("propiedades")
    .select("*, proyectos(nombre)")
    .order("created_at", { ascending: false });

  if (proyectoFiltro === "sin-proyecto") {
    query = query.is("proyecto_id", null);
  } else if (proyectoFiltro) {
    query = query.eq("proyecto_id", proyectoFiltro);
  }

  const [{ data: propiedades, error }, { data: vinculos }, { data: proyectos }] =
    await Promise.all([
      query,
      supabase.from("contrato_propiedades").select("propiedad_id, contratos(numero, estado, created_at)"),
      supabase.from("proyectos").select("id, nombre, valor_m2").order("nombre"),
    ]);

  // Contrato más reciente por propiedad (para mostrar el vínculo). Como un
  // contrato puede tener varias propiedades, el vínculo ahora sale de la
  // tabla puente contrato_propiedades en vez de una columna directa; nos
  // quedamos con el contrato de created_at más reciente por cada propiedad.
  const contratoPorPropiedad = new Map<
    string,
    { numero: number; estado: string; created_at: string }
  >();
  for (const v of vinculos ?? []) {
    const contrato = v.contratos as unknown as
      | { numero: number; estado: string; created_at: string }
      | null;
    if (!contrato) continue;
    const actual = contratoPorPropiedad.get(v.propiedad_id);
    if (!actual || new Date(contrato.created_at) > new Date(actual.created_at)) {
      contratoPorPropiedad.set(v.propiedad_id, contrato);
    }
  }

  const propiedadesConContrato = (propiedades ?? []).map((p) => ({
    ...p,
    contrato: contratoPorPropiedad.get(p.id) ?? null,
  }));

  const currentPath = proyectoFiltro
    ? `/propiedades?proyecto=${encodeURIComponent(proyectoFiltro)}`
    : "/propiedades";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Propiedades</h1>
        <Link
          href="/propiedades/nuevo"
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + Nueva propiedad
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        <Link
          href="/propiedades"
          className={`rounded-md px-3 py-1.5 text-sm ${
            !proyectoFiltro ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Todas
        </Link>
        <Link
          href="/propiedades?proyecto=sin-proyecto"
          className={`rounded-md px-3 py-1.5 text-sm ${
            proyectoFiltro === "sin-proyecto"
              ? "bg-brand text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Sin proyecto
        </Link>
        {proyectos?.map((pr) => (
          <Link
            key={pr.id}
            href={`/propiedades?proyecto=${pr.id}`}
            className={`rounded-md px-3 py-1.5 text-sm ${
              proyectoFiltro === pr.id
                ? "bg-brand text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {pr.nombre}
          </Link>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}
      {errorMsg && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <PropiedadesTable
        propiedades={propiedadesConContrato}
        eliminarUna={eliminarPropiedad}
        eliminarVarias={eliminarPropiedades}
        redirectTo={currentPath}
      />
    </div>
  );
}
