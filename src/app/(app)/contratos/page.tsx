import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { eliminarContrato } from "./actions";
import { SearchInput } from "@/components/SearchInput";
import { esAdmin } from "@/lib/auth/rol";

const ESTADO_STYLES: Record<string, string> = {
  activo: "bg-green-100 text-green-800",
  escriturado: "bg-blue-100 text-blue-800",
  cedido: "bg-amber-100 text-amber-800",
  cancelado: "bg-red-100 text-red-800",
};

const ESTADOS = [
  { value: "todos", label: "Todos" },
  { value: "activo", label: "Activos" },
  { value: "cedido", label: "Cedidos" },
  { value: "escriturado", label: "Escriturados" },
  { value: "cancelado", label: "Cancelados" },
];

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; error?: string }>;
}) {
  const { q, estado = "todos", error: errorParam } = await searchParams;
  const supabase = await createClient();
  const admin = await esAdmin();
  const { data: contratos, error } = await supabase
    .from("contratos")
    .select(
      "*, clientes(nombre, apellido, razon_social, tipo_persona, documento, nit), contrato_propiedades(propiedades(direccion, manzana, numero_lote, proyectos(nombre)))"
    )
    .order("created_at", { ascending: false });

  const termino = (q ?? "").trim().toLowerCase();

  type PropiedadRelContrato = {
    direccion: string;
    manzana: string | null;
    numero_lote: string | null;
    proyectos?: { nombre: string } | { nombre: string }[] | null;
  };

  const filtrados = (contratos ?? [])
    .map((c) => {
      const propiedades = (
        (c.contrato_propiedades ?? []) as { propiedades: PropiedadRelContrato | null }[]
      )
        .map((cp) => cp.propiedades)
        .filter((p): p is PropiedadRelContrato => Boolean(p));
      const nombreCliente =
        c.clientes?.tipo_persona === "juridica" && c.clientes?.razon_social
          ? c.clientes.razon_social
          : c.clientes
          ? `${c.clientes.apellido}, ${c.clientes.nombre}`
          : "";
      const documento =
        c.clientes?.tipo_persona === "juridica" ? c.clientes?.nit : c.clientes?.documento;
      return { ...c, propiedades, nombreCliente, documento };
    })
    .filter((c) => estado === "todos" || c.estado === estado)
    .filter((c) => {
      if (!termino) return true;
      const enPropiedad = c.propiedades.some((p: PropiedadRelContrato) => {
        const proyectoRel = p.proyectos;
        const proyectoNombre = Array.isArray(proyectoRel)
          ? proyectoRel[0]?.nombre
          : proyectoRel?.nombre;
        return (
          p.direccion.toLowerCase().includes(termino) ||
          (p.manzana ?? "").toLowerCase().includes(termino) ||
          (p.numero_lote ?? "").toLowerCase().includes(termino) ||
          (proyectoNombre ?? "").toLowerCase().includes(termino)
        );
      });
      return (
        c.nombreCliente.toLowerCase().includes(termino) ||
        (c.documento ?? "").toLowerCase().includes(termino) ||
        String(c.numero).includes(termino) ||
        enPropiedad
      );
    });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Contratos</h1>
        <div className="flex gap-2">
          <Link
            href="/contratos/nueva-promesa"
            className="rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-light"
          >
            Cargar desde promesa (PDF)
          </Link>
          <Link
            href="/contratos/nuevo"
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            + Nuevo contrato
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Buscar por cliente, documento, N.º de contrato, proyecto o lote..." />
        <div className="flex flex-wrap gap-1">
          {ESTADOS.map((e) => (
            <Link
              key={e.value}
              href={
                e.value === "todos"
                  ? `/contratos${q ? `?q=${encodeURIComponent(q)}` : ""}`
                  : `/contratos?estado=${e.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`
              }
              className={`rounded-md px-3 py-1.5 text-sm ${
                estado === e.value
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {e.label}
            </Link>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}
      {errorParam && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorParam}</p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-2">N.º</th>
              <th className="whitespace-nowrap px-4 py-2">Cliente</th>
              <th className="whitespace-nowrap px-4 py-2">Propiedad(es)</th>
              <th className="whitespace-nowrap px-4 py-2">Tipo</th>
              <th className="whitespace-nowrap px-4 py-2">Valor total</th>
              <th className="whitespace-nowrap px-4 py-2">Cuotas</th>
              <th className="whitespace-nowrap px-4 py-2">Inicio</th>
              <th className="whitespace-nowrap px-4 py-2">Estado</th>
              <th className="whitespace-nowrap px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((c) => {
              const primera = c.propiedades[0];
              const proyectoPrimera = primera
                ? Array.isArray(primera.proyectos)
                  ? primera.proyectos[0]
                  : primera.proyectos
                : null;
              return (
                <tr key={c.id}>
                  <td className="px-4 py-2 text-slate-500">{c.numero}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {c.nombreCliente || "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {primera
                      ? `${proyectoPrimera?.nombre ? `${proyectoPrimera.nombre} - ` : ""}${primera.direccion}`
                      : "-"}
                    {c.propiedades.length > 1 && (
                      <span className="ml-1 text-xs text-slate-400">
                        +{c.propiedades.length - 1} más
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600 capitalize">{c.tipo}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatMoney(c.monto_total, c.moneda)}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.cantidad_cuotas}</td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(c.fecha_inicio)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ESTADO_STYLES[c.estado] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <Link
                      href={`/contratos/${c.id}/estado-cuenta`}
                      className="text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Estado de cuenta
                    </Link>
                    {admin && (
                      <>
                        <Link
                          href={`/contratos/${c.id}`}
                          className="ml-3 text-slate-600 hover:text-slate-900 hover:underline"
                        >
                          Editar
                        </Link>
                        <form action={eliminarContrato.bind(null, c.id)} className="inline">
                          <button
                            type="submit"
                            className="ml-3 text-red-600 hover:text-red-800 hover:underline"
                          >
                            Eliminar
                          </button>
                        </form>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                  {contratos?.length === 0
                    ? "Todavía no hay contratos cargados."
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
