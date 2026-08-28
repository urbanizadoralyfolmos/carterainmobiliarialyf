import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { PrintButton } from "@/components/PrintButton";

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
      "*, cuotas(numero_cuota, monto, contratos(numero, moneda, clientes(nombre, apellido, documento), propiedades(direccion, proyectos(nombre))))"
    )
    .eq("id", id)
    .single();

  if (!recibo) notFound();

  const cuota = recibo.cuotas;
  const contrato = cuota?.contratos;
  const cliente = contrato?.clientes;
  const propiedad = contrato?.propiedades;
  const proyectoRel = propiedad?.proyectos as
    | { nombre: string }
    | { nombre: string }[]
    | null
    | undefined;
  const proyecto = Array.isArray(proyectoRel) ? proyectoRel[0] : proyectoRel;
  const moneda = contrato?.moneda ?? "COP";

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/cuotas" className="text-sm text-slate-500 hover:underline">
          ← Volver a cuotas
        </Link>
        <PrintButton />
      </div>

      <div className="mx-auto mt-6 max-w-xl rounded-lg border border-slate-200 bg-white p-8 print:border-0 print:p-0 print:shadow-none">
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
            <p className="text-slate-500">Propiedad</p>
            <p className="font-medium text-slate-900">
              {proyecto?.nombre ? `${proyecto.nombre} - ` : ""}
              {propiedad?.direccion ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Cuota</p>
            <p className="font-medium text-slate-900">
              {cuota?.numero_cuota === 0 ? "Cuota inicial" : `Cuota #${cuota?.numero_cuota}`}
            </p>
          </div>
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
