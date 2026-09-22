import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { calcularMora } from "@/lib/utils/mora";
import { CuotaAccion } from "@/components/CuotaAccion";
import { SearchInput } from "@/components/SearchInput";
import { esAdmin } from "@/lib/auth/rol";

const FILTROS = [
  { value: "todas", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "vencida", label: "En mora" },
  { value: "pagada", label: "Pagadas" },
];

type ProyectoRel = { nombre: string } | { nombre: string }[] | null | undefined;

function nombreProyecto(rel: ProyectoRel) {
  if (Array.isArray(rel)) return rel[0]?.nombre ?? "";
  return rel?.nombre ?? "";
}

export default async function CuotasPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; proyecto?: string; q?: string; error?: string }>;
}) {
  const { filtro = "todas", proyecto: proyectoFiltro, q, error: errorParam } = await searchParams;
  const supabase = await createClient();
  const admin = await esAdmin();

  const [{ data: cuotas, error }, { data: proyectos }] = await Promise.all([
    supabase
      .from("cuotas")
      .select(
        "*, contratos(numero, moneda, clientes(nombre, apellido, razon_social, tipo_persona, documento, nit), contrato_propiedades(propiedades(direccion, proyecto_id, proyectos(nombre))))"
      )
      .order("fecha_vencimiento", { ascending: true }),
    supabase.from("proyectos").select("id, nombre").order("nombre"),
  ]);

  const hoy = new Date().toISOString().slice(0, 10);

  const enriquecidas = (cuotas ?? []).map((cuota) => {
    const { diasMora } = calcularMora({
      fecha_vencimiento: cuota.fecha_vencimiento,
      estado: cuota.estado,
    });
    const enMora = cuota.estado !== "pagada" && cuota.fecha_vencimiento < hoy;
    const propiedadesRel = (cuota.contratos?.contrato_propiedades ?? []) as {
      propiedades: { direccion: string; proyecto_id: string | null; proyectos?: ProyectoRel } | null;
    }[];
    const propiedadesTexto = propiedadesRel
      .map((cp) => cp.propiedades?.direccion)
      .filter(Boolean)
      .join(", ");
    const proyectosTexto = propiedadesRel
      .map((cp) => nombreProyecto(cp.propiedades?.proyectos))
      .filter(Boolean)
      .join(", ");
    const proyectoIds = Array.from(
      new Set(
        propiedadesRel
          .map((cp) => cp.propiedades?.proyecto_id)
          .filter((v): v is string => Boolean(v))
      )
    );
    const cliente = cuota.contratos?.clientes;
    const nombreCliente =
      cliente?.tipo_persona === "juridica" && cliente?.razon_social
        ? cliente.razon_social
        : cliente
        ? `${cliente.apellido}, ${cliente.nombre}`
        : "";
    const documento = cliente?.tipo_persona === "juridica" ? cliente?.nit : cliente?.documento;
    const numeroContrato = cuota.contratos?.numero;
    return {
      ...cuota,
      diasMora,
      enMora,
      propiedadesTexto,
      proyectosTexto,
      proyectoIds,
      nombreCliente,
      documento,
      numeroContrato,
    };
  });

  const termino = (q ?? "").trim().toLowerCase();

  const filtradas = enriquecidas
    .filter((c) => {
      if (filtro === "todas") return true;
      if (filtro === "vencida") return c.enMora;
      if (filtro === "pendiente") return c.estado === "pendiente" && !c.enMora;
      return c.estado === filtro;
    })
    .filter((c) => {
      if (!proyectoFiltro) return true;
      if (proyectoFiltro === "sin-proyecto") return c.proyectoIds.length === 0;
      return c.proyectoIds.includes(proyectoFiltro);
    })
    .filter((c) => {
      if (!termino) return true;
      return (
        c.nombreCliente.toLowerCase().includes(termino) ||
        (c.documento ?? "").toLowerCase().includes(termino) ||
        c.propiedadesTexto.toLowerCase().includes(termino) ||
        c.proyectosTexto.toLowerCase().includes(termino) ||
        String(c.numeroContrato ?? "").includes(termino) ||
        (c.referencia ?? "").toLowerCase().includes(termino)
      );
    });

  const buildHref = (overrides: { filtro?: string; proyecto?: string }) => {
    const params = new URLSearchParams();
    const filtroValor = overrides.filtro ?? filtro;
    const proyectoValor = "proyecto" in overrides ? overrides.proyecto : proyectoFiltro;
    params.set("filtro", filtroValor);
    if (proyectoValor) params.set("proyecto", proyectoValor);
    if (q) params.set("q", q);
    return `/cuotas?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Cuotas</h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SearchInput placeholder="Buscar por cliente, documento, propiedad, proyecto, N.º de contrato o referencia..." />
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <Link
              key={f.value}
              href={buildHref({ filtro: f.value })}
              className={`rounded-md px-3 py-1.5 text-sm ${
                filtro === f.value
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Link
          href={buildHref({ proyecto: undefined })}
          className={`rounded-md px-3 py-1.5 text-sm ${
            !proyectoFiltro ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Todos los proyectos
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
              <th className="whitespace-nowrap px-4 py-2">Cliente</th>
              <th className="whitespace-nowrap px-4 py-2">Propiedad</th>
              <th className="whitespace-nowrap px-4 py-2">Proyecto</th>
              <th className="whitespace-nowrap px-4 py-2">Contrato</th>
              <th className="whitespace-nowrap px-4 py-2">Cuota</th>
              <th className="whitespace-nowrap px-4 py-2">Vencimiento</th>
              <th className="whitespace-nowrap px-4 py-2">Monto</th>
              <th className="whitespace-nowrap px-4 py-2">Días vencida</th>
              <th className="whitespace-nowrap px-4 py-2">Estado</th>
              <th className="whitespace-nowrap px-4 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtradas.map((c) => {
              const moneda = c.contratos?.moneda ?? "COP";
              const etiquetaCuota = c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`;
              const resumen = `${c.nombreCliente || "Cliente sin nombre"} — Contrato N.º ${
                c.numeroContrato ?? "-"
              } — Cuota ${etiquetaCuota} — ${formatMoney(c.monto, moneda)}`;
              return (
                <tr key={c.id} className={c.enMora ? "bg-red-50/50" : ""}>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {c.nombreCliente || "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.propiedadesTexto || "-"}</td>
                  <td className="px-4 py-2 text-slate-600">{c.proyectosTexto || "-"}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {c.numeroContrato ? `N.º ${c.numeroContrato}` : "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{etiquetaCuota}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatDate(c.fecha_vencimiento)}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatMoney(c.monto, moneda)}
                    {c.monto_pagado > 0 && c.estado !== "pagada" && (
                      <span className="block text-xs text-slate-400">
                        pagado: {formatMoney(c.monto_pagado, moneda)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {c.enMora ? (
                      <span className="text-red-700">{c.diasMora} días</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.estado === "pagada"
                          ? "bg-green-100 text-green-800"
                          : c.enMora
                          ? "bg-red-100 text-red-800"
                          : c.estado === "parcial"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {c.enMora ? "vencida" : c.estado}
                    </span>
                    {c.referencia && (
                      <span className="block text-[10px] text-slate-400">
                        ref. {c.referencia}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <CuotaAccion
                      cuotaId={c.id}
                      estado={c.estado}
                      montoCuota={c.monto}
                      montoPagado={c.monto_pagado}
                      referencia={c.referencia}
                      admin={admin}
                      resumen={resumen}
                    />
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                  No hay cuotas para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
