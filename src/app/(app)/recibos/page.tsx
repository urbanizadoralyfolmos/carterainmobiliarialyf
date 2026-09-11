import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { SearchInput } from "@/components/SearchInput";

type ProyectoRel = { nombre: string } | { nombre: string }[] | null | undefined;

function nombreProyecto(rel: ProyectoRel) {
  if (Array.isArray(rel)) return rel[0]?.nombre ?? "";
  return rel?.nombre ?? "";
}

export default async function RecibosPage({
  searchParams,
}: {
  searchParams: Promise<{ cuota?: string; q?: string }>;
}) {
  const { cuota, q } = await searchParams;
  const supabase = await createClient();import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { SearchInput } from "@/components/SearchInput";

type ProyectoRel = { nombre: string } | { nombre: string }[] | null | undefined;

function nombreProyecto(rel: ProyectoRel) {
  if (Array.isArray(rel)) return rel[0]?.nombre ?? "";
  return rel?.nombre ?? "";
}

export default async function RecibosPage({
  searchParams,
}: {
  searchParams: Promise<{ cuota?: string; q?: string }>;
}) {
  const { cuota, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("recibos")
    .select(
      "*, cuotas(numero_cuota, contratos(numero, moneda, clientes(nombre, apellido, razon_social, tipo_persona, documento, nit), contrato_propiedades(propiedades(direccion, proyectos(nombre)))))"
    )
    .order("created_at", { ascending: false });

  if (cuota) {
    query = query.eq("cuota_id", cuota);
  }

  const { data: recibos, error } = await query;

  const enriquecidos = (recibos ?? []).map((r) => {
    const c = r.cuotas;
    const contrato = c?.contratos;
    const cliente = contrato?.clientes;
    const nombreCliente =
      cliente?.tipo_persona === "juridica" && cliente?.razon_social
        ? cliente.razon_social
        : cliente
        ? `${cliente.apellido}, ${cliente.nombre}`
        : "";
    const documento = cliente?.tipo_persona === "juridica" ? cliente?.nit : cliente?.documento;
    const propiedadesRel = (contrato?.contrato_propiedades ?? []) as {
      propiedades: { direccion: string; proyectos?: ProyectoRel } | null;
    }[];
    const propiedadesTexto = propiedadesRel
      .map((cp) => cp.propiedades?.direccion)
      .filter(Boolean)
      .join(", ");
    const proyectosTexto = propiedadesRel
      .map((cp) => nombreProyecto(cp.propiedades?.proyectos))
      .filter(Boolean)
      .join(", ");
    return {
      ...r,
      nombreCliente,
      documento,
      propiedadesTexto,
      proyectosTexto,
      numeroContrato: contrato?.numero,
    };
  });

  const termino = (q ?? "").trim().toLowerCase();

  const filtrados = enriquecidos.filter((r) => {
    if (!termino) return true;
    return (
      r.nombreCliente.toLowerCase().includes(termino) ||
      (r.documento ?? "").toLowerCase().includes(termino) ||
      r.propiedadesTexto.toLowerCase().includes(termino) ||
      r.proyectosTexto.toLowerCase().includes(termino) ||
      String(r.numeroContrato ?? "").includes(termino) ||
      String(r.numero).includes(termino)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Recibos de pago</h1>
        {cuota && (
          <Link href="/recibos" className="text-sm text-slate-500 hover:underline">
            Ver todos
          </Link>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Buscar por cliente, documento, propiedad, proyecto, N.º de contrato o de recibo..." />
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">N.º</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Propiedad</th>
              <th className="px-4 py-2">Proyecto</th>
              <th className="px-4 py-2">Cuota</th>
              <th className="px-4 py-2">Fecha de pago</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((r) => {
              const c = r.cuotas;
              const contrato = c?.contratos;
              const moneda = contrato?.moneda ?? "COP";
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{r.numero}</td>
                  <td className="px-4 py-2 text-slate-600">{r.nombreCliente || "-"}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {r.propiedadesTexto || "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {r.proyectosTexto || "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {c?.numero_cuota === 0 ? "Inicial" : `#${c?.numero_cuota}`}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(r.fecha_pago)}</td>
                  <td className="px-4 py-2 text-slate-600">{formatMoney(r.monto, moneda)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/recibos/${r.id}`}
                      className="text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Ver / imprimir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  {recibos?.length === 0
                    ? "Todavía no hay recibos registrados."
                    : "Ningún recibo coincide con la búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


  let query = supabase
    .from("recibos")
    .select(
      "*, cuotas(numero_cuota, contratos(numero, moneda, clientes(nombre, apellido, razon_social, tipo_persona, documento, nit), contrato_propiedades(propiedades(direccion, proyectos(nombre)))))"
    )
    .order("created_at", { ascending: false });

  if (cuota) {
    query = query.eq("cuota_id", cuota);
  }

  const { data: recibos, error } = await query;

  const enriquecidos = (recibos ?? []).map((r) => {
    const c = r.cuotas;
    const contrato = c?.contratos;
    const cliente = contrato?.clientes;
    const nombreCliente =
      cliente?.tipo_persona === "juridica" && cliente?.razon_social
        ? cliente.razon_social
        : cliente
        ? `${cliente.apellido}, ${cliente.nombre}`
        : "";
    const documento = cliente?.tipo_persona === "juridica" ? cliente?.nit : cliente?.documento;
    const propiedadesRel = (contrato?.contrato_propiedades ?? []) as {
      propiedades: { direccion: string; proyectos?: ProyectoRel } | null;
    }[];
    const propiedadesTexto = propiedadesRel
      .map((cp) => cp.propiedades?.direccion)
      .filter(Boolean)
      .join(", ");
    const proyectosTexto = propiedadesRel
      .map((cp) => nombreProyecto(cp.propiedades?.proyectos))
      .filter(Boolean)
      .join(", ");
    return {
      ...r,
      nombreCliente,
      documento,
      propiedadesTexto,
      proyectosTexto,
      numeroContrato: contrato?.numero,
    };
  });

  const termino = (q ?? "").trim().toLowerCase();

  const filtrados = enriquecidos.filter((r) => {
    if (!termino) return true;
    return (
      r.nombreCliente.toLowerCase().includes(termino) ||
      (r.documento ?? "").toLowerCase().includes(termino) ||
      r.propiedadesTexto.toLowerCase().includes(termino) ||
      r.proyectosTexto.toLowerCase().includes(termino) ||
      String(r.numeroContrato ?? "").includes(termino) ||
      String(r.numero).includes(termino)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Recibos de pago</h1>
        {cuota && (
          <Link href="/recibos" className="text-sm text-slate-500 hover:underline">
            Ver todos
          </Link>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Buscar por cliente, documento, propiedad, proyecto, N.º de contrato o de recibo..." />
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">N.º</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Propiedad</th>
              <th className="px-4 py-2">Cuota</th>
              <th className="px-4 py-2">Fecha de pago</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((r) => {
              const c = r.cuotas;
              const contrato = c?.contratos;
              const moneda = contrato?.moneda ?? "COP";
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{r.numero}</td>
                  <td className="px-4 py-2 text-slate-600">{r.nombreCliente || "-"}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {r.propiedadesTexto || "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {c?.numero_cuota === 0 ? "Inicial" : `#${c?.numero_cuota}`}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(r.fecha_pago)}</td>
                  <td className="px-4 py-2 text-slate-600">{formatMoney(r.monto, moneda)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/recibos/${r.id}`}
                      className="text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Ver / imprimir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  {recibos?.length === 0
                    ? "Todavía no hay recibos registrados."
                    : "Ningún recibo coincide con la búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
