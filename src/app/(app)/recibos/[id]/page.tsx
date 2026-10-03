import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { PrintButton } from "@/components/PrintButton";
import { ENCABEZADO_RECIBO_URI } from "@/lib/encabezadoRecibo";

type DetalleCuota = { cuota_id: string; numero_cuota: number; monto: number };

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recibo } = await supabase
    .from("recibos")
    .select(
      "*, cuotas(numero_cuota, monto, referencia, contratos(id, numero, moneda, clientes(nombre, apellido, documento), contrato_propiedades(propiedades(direccion, proyectos(nombre)))))"
    )
    .eq("id", id)
    .single();

  if (!recibo) notFound();

  const cuota = recibo.cuotas;
  const contrato = cuota?.contratos;
  const cliente = contrato?.clientes;
  const propiedades = (contrato?.contrato_propiedades ?? [])
    .map(
      (cp: {
        propiedades: {
          direccion: string;
          proyectos?: { nombre: string } | { nombre: string }[] | null;
        } | null;
      }) => cp.propiedades
    )
    .filter(Boolean) as {
    direccion: string;
    proyectos?: { nombre: string } | { nombre: string }[] | null;
  }[];
  const moneda = contrato?.moneda ?? "COP";
  const hrefCuotas = contrato?.id ? `/cuotas?contrato=${contrato.id}` : "/cuotas";

  const detalleCuotas = ((recibo.detalle_cuotas ?? []) as DetalleCuota[])
    .slice()
    .sort((a, b) => a.numero_cuota - b.numero_cuota);

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={hrefCuotas} className="text-sm text-slate-500 hover:underline">
          ← Volver a cuotas
        </Link>
        <div className="flex items-center gap-2">
          <a href={`/api/recibos/${id}/pdf`} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            Descargar PDF
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-xl rounded-lg border border-slate-200 bg-white p-8 print:border-0 print:p-0 print:shadow-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ENCABEZADO_RECIBO_URI}
          alt="Urbanizadora LYF Olmos"
          className="mb-6 w-full"
        />

        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Recibo de pago</h1>
            <p className="text-sm text-slate-500">N.º {recibo.numero}</p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>Fecha de pago</p>
            <p className="font-medium text-slate-900">{formatDate(recibo.fecha_pago)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Cliente</p>
            <p className="font-medium text-slate-900">
              {cliente ? `${cliente.nombre} ${cliente.apellido}` : "-"}
            </p>
            {cliente?.documento && (
              <p className="text-xs text-slate-400">Doc. {cliente.documento}</p>
            )}
          </div>
          <div>
            <p className="text-slate-500">Contrato</p>
            <p className="font-medium text-slate-900">
              {contrato?.numero ? `N.º ${contrato.numero}` : "-"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-slate-500">Propiedad{propiedades.length > 1 ? "es" : ""}</p>
            {propiedades.length > 0 ? (
              propiedades.map((p, i) => {
                const proyectoRel = p.proyectos as
                  | { nombre: string }
                  | { nombre: string }[]
                  | null
                  | undefined;
                const proyecto = Array.isArray(proyectoRel) ? proyectoRel[0] : proyectoRel;
                return (
                  <p key={i} className="font-medium text-slate-900">
                    {proyecto?.nombre ? `${proyecto.nombre} - ` : ""}
                    {p.direccion}
                  </p>
                );
              })
            ) : (
              <p className="font-medium text-slate-900">-</p>
            )}
          </div>
          <div className="col-span-2">
            <p className="text-slate-500">Cuota{detalleCuotas.length > 1 ? "s cubiertas" : ""}</p>
            {detalleCuotas.length > 0 ? (
              detalleCuotas.map((d) => (
                <p key={d.cuota_id} className="font-medium text-slate-900">
                  {d.numero_cuota === 0 ? "Cuota inicial" : `Cuota #${d.numero_cuota}`}
                  {detalleCuotas.length > 1 && (
                    <span className="ml-2 font-normal text-slate-500">
                      {formatMoney(d.monto, moneda)}
                    </span>
                  )}
                </p>
              ))
            ) : (
              <p className="font-medium text-slate-900">
                {cuota?.numero_cuota === 0 ? "Cuota inicial" : `Cuota #${cuota?.numero_cuota}`}
              </p>
            )}
          </div>
          {cuota?.referencia && (
            <div>
              <p className="text-slate-500">Referencia de pago</p>
              <p className="font-medium text-slate-900">{cuota.referencia}</p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-md bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Valor pagado</span>
            <span className="text-lg font-semibold text-slate-900">
              {formatMoney(recibo.monto, moneda)}
            </span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Recibo generado automáticamente por el sistema de cartera inmobiliaria.
        </p>
      </div>
    </div>
  );
}
