"use client";

import { useEffect, useState } from "react";
import type { Cliente, Contrato, Propiedad } from "@/lib/types";
import { fechaCuota } from "@/lib/utils/plan";
import { formatMoney } from "@/lib/utils/format";

export function ContratoForm({
  contrato,
  clientes,
  propiedades,
  propiedadIdsSeleccionadas = [],
  action,
  error,
  esNuevo,
}: {
  contrato?: Partial<Contrato>;
  clientes: Pick<Cliente, "id" | "nombre" | "apellido">[];
  propiedades: (Pick<Propiedad, "id" | "direccion" | "manzana" | "numero_lote"> & {
    proyectos?: { id: string; nombre: string } | { id: string; nombre: string }[] | null;
  })[];
  /** ids de las propiedades ya vinculadas a este contrato (para editar). */
  propiedadIdsSeleccionadas?: string[];
  action: (formData: FormData) => void;
  error?: string;
  esNuevo: boolean;
}) {
  const [fechaInicio, setFechaInicio] = useState(contrato?.fecha_inicio ?? "");
  const [moneda, setMoneda] = useState(contrato?.moneda ?? "COP");
  const [cantidadCuotas, setCantidadCuotas] = useState(contrato?.cantidad_cuotas ?? 12);
  const [montos, setMontos] = useState<number[]>(
    Array.from({ length: contrato?.cantidad_cuotas ?? 12 }, () => 0)
  );
  // Fechas de cada cuota del plan generado: por defecto se calculan a
  // partir de la fecha de inicio (mismo día del mes, mensual), pero quedan
  // editables una por una. Solo se guarda aquí la fecha de las cuotas que
  // el usuario tocó manualmente; las que no se tocaron siguen calculándose
  // en vivo a partir de la fecha de inicio actual.
  const [fechasEditadas, setFechasEditadas] = useState<Record<number, string>>({});
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(
    new Set(propiedadIdsSeleccionadas)
  );
  const [proyectoFiltro, setProyectoFiltro] = useState("todos");
  const [busquedaPropiedad, setBusquedaPropiedad] = useState("");

  function toggleSeleccionada(id: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    setMontos((prev) => {
      const next = prev.slice(0, cantidadCuotas);
      while (next.length < cantidadCuotas) next.push(0);
      return next;
    });
  }, [cantidadCuotas]);

  // Ya no hay un campo de "día de vencimiento" separado: el día por defecto
  // para las cuotas generadas es simplemente el mismo día del mes de la
  // fecha de inicio del contrato.
  const diaVencimientoDefecto = fechaInicio ? Number(fechaInicio.slice(8, 10)) || 1 : 1;

  function fechaCuotaPorDefecto(i: number) {
    return fechaCuota(fechaInicio, i + 1, diaVencimientoDefecto);
  }

  function actualizarFechaCuota(i: number, valor: string) {
    setFechasEditadas((prev) => ({ ...prev, [i]: valor }));
  }

  const totalCuotas = montos.reduce((acc, m) => acc + (Number(m) || 0), 0);
  const clienteActual = clientes.find((c) => c.id === contrato?.cliente_id);

  // Lista de proyectos con al menos una propiedad disponible para elegir, para
  // poder filtrar por proyecto y encontrar el lote más rápido en vez de
  // recorrer una lista larga con todos los lotes de todos los proyectos.
  const proyectosDisponibles = Array.from(
    new Map(
      propiedades
        .map((p) => (Array.isArray(p.proyectos) ? p.proyectos[0] : p.proyectos))
        .filter((pr): pr is { id: string; nombre: string } => Boolean(pr))
        .map((pr) => [pr.id, pr])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const terminoPropiedad = busquedaPropiedad.trim().toLowerCase();
  const propiedadesFiltradas = propiedades.filter((p) => {
    const proyecto = Array.isArray(p.proyectos) ? p.proyectos[0] : p.proyectos;
    if (proyectoFiltro !== "todos" && proyecto?.id !== proyectoFiltro) return false;
    if (!terminoPropiedad) return true;
    return (
      p.direccion.toLowerCase().includes(terminoPropiedad) ||
      (p.manzana ?? "").toLowerCase().includes(terminoPropiedad) ||
      (p.numero_lote ?? "").toLowerCase().includes(terminoPropiedad) ||
      (proyecto?.nombre ?? "").toLowerCase().includes(terminoPropiedad)
    );
  });

  return (
    <form action={action} className="mt-4 max-w-3xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Cliente</label>
          {esNuevo ? (
            <select
              name="cliente_id"
              defaultValue={contrato?.cliente_id}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.apellido}, {c.nombre}
                </option>
              ))}
            </select>
          ) : (
            <>
              <p className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {clienteActual ? `${clienteActual.apellido}, ${clienteActual.nombre}` : "-"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Para cambiar el titular de este contrato, usa &quot;Ceder contrato&quot; en el
                estado de cuenta (queda registrado en el historial de cesiones).
              </p>
            </>
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Propiedades / lotes ({seleccionadas.size} seleccionada
            {seleccionadas.size === 1 ? "" : "s"})
          </label>
          <p className="mt-0.5 text-xs text-slate-400">
            Un contrato puede incluir uno o varios lotes (por ejemplo, varios lotes de la
            misma manzana vendidos juntos).
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <select
              value={proyectoFiltro}
              onChange={(e) => setProyectoFiltro(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="todos">Todos los proyectos</option>
              {proyectosDisponibles.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.nombre}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={busquedaPropiedad}
              onChange={(e) => setBusquedaPropiedad(e.target.value)}
              placeholder="Buscar por dirección, manzana o lote..."
              className="min-w-[16rem] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-slate-300 p-2">
            {propiedadesFiltradas.map((p) => {
              const proyecto = Array.isArray(p.proyectos) ? p.proyectos[0] : p.proyectos;
              const detalle = [
                proyecto?.nombre,
                p.manzana ? `Mz. ${p.manzana}` : null,
                p.numero_lote ? `Lote ${p.numero_lote}` : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    name="propiedad_ids"
                    value={p.id}
                    checked={seleccionadas.has(p.id)}
                    onChange={() => toggleSeleccionada(p.id)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-slate-700">
                    {p.direccion}
                    {detalle ? <span className="text-slate-400"> · {detalle}</span> : null}
                  </span>
                </label>
              );
            })}
            {propiedadesFiltradas.length === 0 && propiedades.length > 0 && (
              <p className="px-1.5 py-1 text-sm text-slate-400">
                Ningún lote coincide con el proyecto o la búsqueda.
              </p>
            )}
            {propiedades.length === 0 && (
              <p className="px-1.5 py-1 text-sm text-slate-400">
                No hay propiedades cargadas todavía.
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Tipo</label>
          <select
            name="tipo"
            defaultValue={contrato?.tipo ?? "alquiler"}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="alquiler">Alquiler</option>
            <option value="venta">Venta</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Estado</label>
          <select
            name="estado"
            defaultValue={contrato?.estado ?? "activo"}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="activo">Activo</option>
            <option value="paz_y_salvo_sin_escritura">Paz y salvo sin escritura</option>
            <option value="escriturado">Escriturado</option>
            <option value="facturado">Facturado</option>
            <option value="anulado">Anulado</option>
          </select>
          {contrato?.estado === "anulado" ? null : (
            <p className="mt-1 text-xs text-slate-400">
              &quot;Paz y salvo sin escritura&quot; se marca solo cuando se pagan todas las
              cuotas. &quot;Facturado&quot; normalmente se marca solo desde el módulo de
              Facturas (al registrar el número de factura). Al marcar &quot;Anulado&quot;,
              las propiedades/lotes de este contrato vuelven a quedar disponibles para la
              venta; con &quot;Escriturado&quot; o &quot;Facturado&quot; pasan al estado
              correspondiente.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Fecha de inicio</label>
          <input
            type="date"
            name="fecha_inicio"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Fecha de escrituración</label>
          <input
            type="date"
            name="fecha_fin"
            defaultValue={contrato?.fecha_fin ?? ""}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Moneda</label>
          <select
            name="moneda"
            value={moneda}
            onChange={(e) => setMoneda(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Valor total del contrato
          </label>
          <input
            type="number"
            step="0.01"
            name="monto_total"
            defaultValue={contrato?.monto_total ?? ""}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Cuota inicial</label>
          <input
            type="number"
            step="0.01"
            name="cuota_inicial"
            defaultValue={contrato?.cuota_inicial ?? 0}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-400">
            Se registra como pago inicial con vencimiento en la fecha de inicio.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Cantidad de cuotas restantes {esNuevo ? "" : "(no editable)"}
          </label>
          <input
            type="number"
            min={1}
            name="cantidad_cuotas"
            value={cantidadCuotas}
            readOnly={!esNuevo}
            onChange={(e) => setCantidadCuotas(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </div>
        <input
          type="hidden"
          name="dia_vencimiento"
          value={esNuevo ? diaVencimientoDefecto : contrato?.dia_vencimiento ?? 10}
        />
        <input
          type="hidden"
          name="tasa_mora_mensual"
          value={contrato?.tasa_mora_mensual ?? 5}
        />
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700">Notas</label>
          <textarea
            name="notas"
            defaultValue={contrato?.notas ?? ""}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {esNuevo ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Plan de cuotas ({cantidadCuotas} cuotas, cada una con su propio monto)
          </h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Cuota</th>
                  <th className="px-4 py-2">Vencimiento</th>
                  <th className="px-4 py-2">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: cantidadCuotas }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-slate-600">#{i + 1}</td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        name={`fecha_cuota_${i + 1}`}
                        value={fechasEditadas[i] ?? fechaCuotaPorDefecto(i)}
                        onChange={(e) => actualizarFechaCuota(i, e.target.value)}
                        required
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        name={`monto_cuota_${i + 1}`}
                        value={montos[i] ?? 0}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0;
                          setMontos((prev) => {
                            const next = [...prev];
                            next[i] = v;
                            return next;
                          });
                        }}
                        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Total de las cuotas: <span className="font-medium text-slate-700">{formatMoney(totalCuotas, moneda)}</span>
          </p>
        </div>
      ) : (
        <p className="mt-6 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
          El plan de cuotas ya generado no se modifica desde aquí. Para editar, agregar o
          eliminar cuotas puntuales, hazlo desde el estado de cuenta de este contrato
          (sección &quot;Detalle de cuotas&quot;).
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}
