import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchInput } from "@/components/SearchInput";
import { PropiedadesTable } from "@/components/PropiedadesTable";
import { esAdmin } from "@/lib/auth/rol";

const ESTADO_LABELS: Record<string, string> = {
  disponible: "Disponible",
  prometido_en_venta: "Prometido en venta",
  escriturado: "Escriturado",
  facturado: "Facturado",
};

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string; estado?: string; q?: string; error?: string }>;
}) {
  const { proyecto: proyectoFiltro, estado: estadoFiltro, q, error: errorParam } = await searchParams;
  const supabase = await createClient();
  const admin = await esAdmin();

  let query = supabase
    .from("propiedades")
    .select("*, proyectos(nombre)")
    .order("created_at", { ascending: false });

  if (proyectoFiltro === "sin-proyecto") {
    query = query.is("proyecto_id", null);
  } else if (proyectoFiltro) {
    query = query.eq("proyecto_id", proyectoFiltro);
  }

  if (estadoFiltro) {
    query = query.eq("estado", estadoFiltro);
  }

  const [{ data: propiedadesData, error }, { data: vinculos }, { data: proyectos }] =
    await Promise.all([
      query,
      supabase
        .from("contrato_propiedades")
        .select("propiedad_id, contratos(numero, estado, numero_factura, created_at)")
        .order("created_at", { ascending: false }),
      supabase.from("proyectos").select("id, nombre").order("nombre"),
    ]);

  type ContratoRelPropiedad = {
    numero: number;
    estado: string;
    numero_factura: string | null;
  };

  // Contrato más reciente por propiedad (para mostrar el vínculo, y el N.º
  // de factura cuando corresponda: la factura se registra a nivel del
  // contrato, no de la propiedad). Una propiedad puede, en teoría, pasar
  // por más de un contrato en el tiempo.
  const contratoPorPropiedad = new Map<string, ContratoRelPropiedad>();
  for (const v of vinculos ?? []) {
    const c = v.contratos as ContratoRelPropiedad | ContratoRelPropiedad[] | null;
    const contrato = Array.isArray(c) ? c[0] : c;
    if (contrato && !contratoPorPropiedad.has(v.propiedad_id)) {
      contratoPorPropiedad.set(v.propiedad_id, contrato);
    }
  }

  const termino = (q ?? "").trim().toLowerCase();
  const propiedades = (propiedadesData ?? []).filter((p) => {
    if (!termino) return true;
    return (
      p.direccion.toLowerCase().includes(termino) ||
      (p.manzana ?? "").toLowerCase().includes(termino) ||
      (p.numero_lote ?? "").toLowerCase().includes(termino) ||
      (p.ciudad ?? "").toLowerCase().includes(termino)
    );
  });

  const buildHref = (overrides: { proyecto?: string; estado?: string }) => {
    const params = new URLSearchParams();
    const proyectoValor = "proyecto" in overrides ? overrides.proyecto : proyectoFiltro;
    const estadoValor = "estado" in overrides ? overrides.estado : estadoFiltro;
    if (proyectoValor) params.set("proyecto", proyectoValor);
    if (estadoValor) params.set("estado", estadoValor);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/propiedades${qs ? `?${qs}` : ""}`;
  };

  // URL del listado con el filtro actual (proyecto/estado/búsqueda) tal cual
  // está ahora, para volver aquí mismo después de eliminar una propiedad.
  const currentHref = buildHref({});

  const filas = propiedades.map((p) => {
    const contrato = contratoPorPropiedad.get(p.id);
    return {
      id: p.id,
      direccion: p.direccion,
      proyectoNombre: p.proyectos?.nombre ?? null,
      tipo: p.tipo,
      ciudad: p.ciudad,
      superficie_m2: p.superficie_m2,
      valor_referencia: p.valor_referencia,
      estado: p.estado,
      contratoNumero: contrato?.numero ?? null,
      contratoEstado: contrato?.estado ?? null,
      numeroFactura: contrato?.numero_factura ?? null,
      numeroEscritura: p.numero_escritura,
      fechaEscritura: p.fecha_escritura,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Propiedades</h1>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Buscar por dirección, manzana, lote o ciudad..." />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Link
          href={buildHref({ proyecto: undefined })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            !proyectoFiltro ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Todas
        </Link>
        <Link
          href={buildHref({ proyecto: "sin-proyecto" })}
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
            href={buildHref({ proyecto: pr.id })}
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

      <div className="mt-2 flex flex-wrap gap-1">
        <Link
          href={buildHref({ estado: undefined })}
          className={`rounded-md px-3 py-1 text-xs font-medium ${
            !estadoFiltro ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Todos los estados
        </Link>
        {Object.entries(ESTADO_LABELS).map(([valor, etiqueta]) => (
          <Link
            key={valor}
            href={buildHref({ estado: valor })}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              estadoFiltro === valor
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {etiqueta}
          </Link>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}
      {errorParam && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorParam}</p>
      )}

      <PropiedadesTable filas={filas} admin={admin} currentHref={currentHref} />
    </div>
  );
}
