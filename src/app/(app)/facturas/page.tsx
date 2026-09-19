import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";
import { esAdmin } from "@/lib/auth/rol";
import { SearchInput } from "@/components/SearchInput";
import { guardarFactura } from "./actions";

type ProyectoRel = { nombre: string } | { nombre: string }[] | null | undefined;

function nombreProyecto(rel: ProyectoRel) {
  if (Array.isArray(rel)) return rel[0]?.nombre ?? "";
  return rel?.nombre ?? "";
}

const VISTAS = [
  { value: "pendientes", label: "Pendientes de facturar" },
  { value: "facturadas", label: "Facturadas" },
];

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; vista?: string; error?: string; ok?: string }>;
}) {
  const { q, vista = "pendientes", error: errorParam, ok } = await searchParams;
  const supabase = await createClient();
  const admin = await esAdmin();

  const { data: contratos, error } = await supabase
    .from("contratos")
    .select(
      "id, numero, estado, numero_factura, fecha_factura, clientes(nombre, apellido, razon_social, tipo_persona, documento, nit), contrato_propiedades(propiedades(direccion, proyectos(nombre)))"
    )
    .neq("estado", "anulado")
    .order("numero", { ascending: false });

  type PropiedadRel = { direccion: string; proyectos?: ProyectoRel } | null;

  function unoDeMuchos<T>(rel: T | T[] | null | undefined): T | undefined {
    if (Array.isArray(rel)) return rel[0];
    return rel ?? undefined;
  }

  const enriquecidos = (contratos ?? []).map((c) => {
    const cliente = unoDeMuchos(c.clientes);
    const nombreCliente =
      cliente?.tipo_persona === "juridica" && cliente?.razon_social
        ? cliente.razon_social
        : cliente
        ? `${cliente.apellido}, ${cliente.nombre}`
        : "";
    const documento = cliente?.tipo_persona === "juridica" ? cliente?.nit : cliente?.documento;
    const propiedadesRel = (c.contrato_propiedades ?? []) as unknown as {
      propiedades: PropiedadRel | PropiedadRel[];
    }[];
    const propiedadesTexto = propiedadesRel
      .map((cp) => unoDeMuchos(cp.propiedades)?.direccion)
      .filter(Boolean)
      .join(", ");
    const proyectosTexto = propiedadesRel
      .map((cp) => nombreProyecto(unoDeMuchos(cp.propiedades)?.proyectos))
      .filter(Boolean)
      .join(", ");
    return {
      ...c,
      nombreCliente,
      documento: documento ?? "",
      propiedadesTexto,
      proyectosTexto,
    };
  });

  const porVista = enriquecidos.filter((c) =>
    vista === "facturadas" ? c.estado === "facturado" : c.estado !== "facturado"
  );

  const termino = (q ?? "").trim().toLowerCase();

  const filtrados = porVista.filter((c) => {
    if (!termino) return true;
    return (
      c.nombreCliente.toLowerCase().includes(termino) ||
      c.documento.toLowerCase().includes(termino) ||
      c.propiedadesTexto.toLowerCase().includes(termino) ||
      c.proyectosTexto.toLowerCase().includes(termino) ||
      String(c.numero).includes(termino) ||
      (c.numero_factura ?? "").toLowerCase().includes(termino)
    );
  });

  function buildHref(v: string) {
    const params = new URLSearchParams();
    params.set("vista", v);
    if (q) params.set("q", q);
    return `/facturas?${params.toString()}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Facturas</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Registra el número de factura de un contrato. Al guardarlo, el contrato pasa
        automáticamente a estado &quot;Facturado&quot; y las propiedades vinculadas a él
        también quedan en &quot;Facturado&quot;.
      </p>

      {errorParam && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorParam}</p>
      )}
      {ok && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Factura guardada correctamente.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {VISTAS.map((v) => (
          <Link
            key={v.value}
            href={buildHref(v.value)}
            className={`rounded-full px-3 py-1 text-sm ${
              vista === v.value
                ? "bg-brand-light text-brand-dark font-medium"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Buscar por cliente, documento, propiedad, proyecto, N.º de contrato o de factura..." />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-2">Contrato</th>
              <th className="whitespace-nowrap px-4 py-2">Cliente</th>
              <th className="whitespace-nowrap px-4 py-2">Propiedad(es)</th>
              <th className="whitespace-nowrap px-4 py-2">Proyecto</th>
              {vista === "facturadas" ? (
                <>
                  <th className="whitespace-nowrap px-4 py-2">N.º de factura</th>
                  <th className="whitespace-nowrap px-4 py-2">Fecha de factura</th>
                </>
              ) : (
                <th className="whitespace-nowrap px-4 py-2">Estado actual</th>
              )}
              {admin && (
                <th className="whitespace-nowrap px-4 py-2 text-right">
                  {vista === "facturadas" ? "Corregir factura" : "Facturar"}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 font-medium text-slate-900">
                  <Link href={`/contratos/${c.id}`} className="hover:underline">
                    N.º {c.numero}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{c.nombreCliente || "-"}</td>
                <td className="px-4 py-2 text-slate-600">{c.propiedadesTexto || "-"}</td>
                <td className="px-4 py-2 text-slate-600">{c.proyectosTexto || "-"}</td>
                {vista === "facturadas" ? (
                  <>
                    <td className="px-4 py-2 text-slate-600">{c.numero_factura || "-"}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(c.fecha_factura)}</td>
                  </>
                ) : (
                  <td className="px-4 py-2 text-slate-600 capitalize">
                    {c.estado.replaceAll("_", " ")}
                  </td>
                )}
                {admin && (
                  <td className="px-4 py-2">
                    <form
                      action={guardarFactura}
                      className="flex flex-wrap items-center justify-end gap-2"
                    >
                      <input type="hidden" name="contrato_id" value={c.id} />
                      <input
                        type="text"
                        name="numero_factura"
                        defaultValue={c.numero_factura ?? ""}
                        placeholder="N.º de factura"
                        required
                        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="date"
                        name="fecha_factura"
                        defaultValue={c.fecha_factura ?? ""}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-brand px-3 py-1 text-sm font-medium text-white hover:bg-brand-dark"
                      >
                        Guardar
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={admin ? 6 : 5} className="px-4 py-6 text-center text-slate-400">
                  {porVista.length === 0
                    ? vista === "facturadas"
                      ? "Todavía no hay contratos facturados."
                      : "No hay contratos pendientes de facturar."
                    : "Ningún contrato coincide con la búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
