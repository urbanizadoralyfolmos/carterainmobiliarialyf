import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { eliminarContrato, actualizarEstadoEnBloque } from "./actions";
import { SearchInput } from "@/components/SearchInput";
import { SeleccionarTodasCheckbox } from "@/components/SeleccionarTodasCheckbox";
import { ToggleEdicionEnBloque } from "@/components/ToggleEdicionEnBloque";
import { AplicarEstadoEnBloqueButton } from "@/components/AplicarEstadoEnBloqueButton";
import { esAdmin } from "@/lib/auth/rol";

const ESTADO_STYLES: Record<string, string> = {
  activo: "bg-green-100 text-green-800",
  paz_y_salvo_sin_escritura: "bg-amber-100 text-amber-800",
  escriturado: "bg-blue-100 text-blue-800",
  anulado: "bg-red-100 text-red-800",
};

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  paz_y_salvo_sin_escritura: "Paz y salvo sin escritura",
  escriturado: "Escriturado",
  anulado: "Anulado",
};

const ESTADOS = [
  { value: "todos", label: "Todos" },
  { value: "activo", label: "Activos" },
  { value: "paz_y_salvo_sin_escritura", label: "Paz y salvo sin escritura" },
  { value: "escriturado", label: "Escriturados" },
  { value: "anulado", label: "Anulados" },
];

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; proyecto?: string; error?: string }>;
}) {
  const { q, estado = "todos", proyecto: proyectoFiltro, error: errorParam } = await searchParams;
  const supabase = await createClient();
  const admin = await esAdmin();
  const [{ data: contratos, error }, { data: proyectos }] = await Promise.all([
    supabase
      .from("contratos")
      .select(
        "*, clientes(nombre, apellido, razon_social, tipo_persona, documento, nit), contrato_propiedades(propiedades(direccion, manzana, numero_lote, proyecto_id, proyectos(nombre)))"
      )
      .order("created_at", { ascending: false }),
    supabase.from("proyectos").select("id, nombre").order("nombre"),
  ]);

  const termino = (q ?? "").trim().toLowerCase();

  type PropiedadRelContrato = {
    direccion: string;
    manzana: string | null;
    numero_lote: string | null;
    proyecto_id: string | null;
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
    .filter(
      (c) =>
        !proyectoFiltro ||
        c.propiedades.some((p: PropiedadRelContrato) => p.proyecto_id === proyectoFiltro)
    )
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

  const buildHref = (overrides: { estado?: string; proyecto?: string }) => {
    const params = new URLSearchParams();
    const estadoValor = "estado" in overrides ? overrides.estado : estado;
    const proyectoValor = "proyecto" in overrides ? overrides.proyecto : proyectoFiltro;
    if (estadoValor && estadoValor !== "todos") params.set("estado", estadoValor);
    if (proyectoValor) params.set("proyecto", proyectoValor);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/contratos${qs ? `?${qs}` : ""}`;
  };

  // URL del listado con el filtro actual (proyecto/estado/búsqueda) tal cual
  // está ahora, para volver aquí mismo después de eliminar un contrato o
  // aplicar un cambio de estado en bloque.
  const currentHref = buildHref({});

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
        {ESTADOS.map((e) => (
          <Link
            key={e.value}
            href={buildHref({ estado: e.value })}
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              estado === e.value
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {e.label}
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

      <div data-bloque-contenedor data-bloque-activo="0">
        {admin && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Marca varios contratos para cambiarles el estado de una sola vez.
            </p>
            <ToggleEdicionEnBloque className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50" />
          </div>
        )}

        <form action={actualizarEstadoEnBloque}>
          <input type="hidden" name="redirect_to" value={currentHref} />

          {admin && (
            <div
              data-bloque-barra
              className="mt-2 hidden flex-wrap items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2"
            >
              <span className="text-xs font-medium text-slate-600">Cambiar estado a:</span>
              <select
                name="nuevo_estado"
                defaultValue=""
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="" disabled>
                  Seleccionar...
                </option>
                {Object.entries(ESTADO_LABELS).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
              <AplicarEstadoEnBloqueButton className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark" />
            </div>
          )}

          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    {admin && (
                      <th data-bloque-col className="hidden px-4 py-2">
                        <SeleccionarTodasCheckbox name="contrato_ids" />
                      </th>
                    )}
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
                        {admin && (
                          <td data-bloque-col className="hidden px-4 py-2">
                            <input
                              type="checkbox"
                              name="contrato_ids"
                              value={c.id}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </td>
                        )}
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
                            {ESTADO_LABELS[c.estado] ?? c.estado}
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
                              <button
                                type="submit"
                                formAction={eliminarContrato.bind(null, c.id)}
                                className="ml-3 text-red-600 hover:text-red-800 hover:underline"
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtrados.length === 0 && (
                    <tr>
                      <td colSpan={admin ? 10 : 9} className="px-4 py-6 text-center text-slate-400">
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
        </form>
      </div>
    </div>
  );
}
