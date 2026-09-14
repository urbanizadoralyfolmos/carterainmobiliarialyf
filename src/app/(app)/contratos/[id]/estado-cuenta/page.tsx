import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { PrintButton } from "@/components/PrintButton";
import { getEstadoCuentaContrato } from "@/lib/estado-cuenta-contrato";
import { agregarCuota, eliminarCuota } from "@/app/(app)/cuotas/actions";

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  cedido: "Cedido",
  escriturado: "Escriturado",
  cancelado: "Cancelado",
};

const DOWNLOAD_LINKS = [
  { tipo: "excel", etiqueta: "Descargar Excel" },
  { tipo: "pdf", etiqueta: "Descargar PDF" },
];

export default async function EstadoCuentaContratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const data = await getEstadoCuentaContrato(id);

  if (!data) notFound();

  const { contrato, cliente, nombreCliente, propiedades, resumen, cuotasPendientes } = data;
  const detalle = [...resumen.detalle].sort((a, b) => a.numero_cuota - b.numero_cuota);
  const totalSaldoPendiente = cuotasPendientes.reduce((acc, c) => acc + c.saldo, 0);

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/contratos/${id}`} className="text-sm text-slate-500 hover:underline">
          ← Volver al contrato
        </Link>
        <div className="flex gap-2">
          {DOWNLOAD_LINKS.map((link) => {
            const href = `/api/contratos/${id}/estado-cuenta/${link.tipo}`;
            return (
              
                key={link.tipo}
                href={href}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                {link.etiqueta}
              </a>
            );
          })}
          <PrintButton />
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">
          {error}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <h1 className="text-lg font-semibold text-slate-900">
          Estado de cuenta: Contrato N.º {contrato.numero}
        </h1>
        <p className="text-xs text-slate-400">
          Generado el {formatDate(new Date().toISOString().slice(0, 10))}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-4">
            <h2 className="text-xs font-semibold uppercase text-slate-500">Cliente</h2>
            <p className="mt-1 text-sm font-medium text-slate-900">{nombreCliente}</p>
            {cliente?.tipo_persona === "juridica" ? (
              <>
                <p className="text-sm text-slate-600">NIT {cliente.nit ?? "-"}</p>
                {(cliente.representante_nombre || cliente.representante_documento) && (
                  <p className="text-sm text-slate-600">
                    Repr. {cliente.representante_nombre ?? "-"}
                    {cliente.representante_documento
                      ? ` · Doc. ${cliente.representante_documento}`
                      : ""}
                  </p>
                )}
              </>
            ) : (
              cliente?.documento && (
                <p className="text-sm text-slate-600">Doc. {cliente.documento}</p>
              )
            )}
            {cliente?.email && <p className="text-sm text-slate-600">{cliente.email}</p>}
            {cliente?.telefono && <p className="text-sm text-slate-600">{cliente.telefono}</p>}
          </div>

          <div className="rounded-md bg-slate-50 p-4">
            <h2 className="text-xs font-semibold uppercase text-slate-500">
