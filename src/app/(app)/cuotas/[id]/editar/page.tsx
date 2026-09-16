import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils/format";
import { actualizarCuota } from "../../actions";
import { esAdmin } from "@/lib/auth/rol";

export default async function EditarCuotaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  // Editar cuotas (fecha/monto) es solo para administradores; registrar un
  // pago se sigue haciendo desde /cuotas, que está abierto a todos.
  if (!(await esAdmin())) {
    redirect(
      `/cuotas?error=${encodeURIComponent(
        "No tienes permisos para editar cuotas. Consulta a un administrador."
      )}`
    );
  }

  const supabase = await createClient();

  const { data: cuota } = await supabase
    .from("cuotas")
    .select(
      "*, contratos(id, numero, moneda, clientes(nombre, apellido, razon_social, tipo_persona))"
    )
    .eq("id", id)
    .single();

  if (!cuota || !cuota.contratos) notFound();

  const contrato = cuota.contratos;
  const cliente = contrato.clientes;
  const nombreCliente =
    cliente?.tipo_persona === "juridica" && cliente?.razon_social
      ? cliente.razon_social
      : cliente
      ? `${cliente.apellido}, ${cliente.nombre}`
      : "";

  const actualizarConId = actualizarCuota.bind(null, id, contrato.id);

  return (
    <div>
      <Link
        href={`/contratos/${contrato.id}/estado-cuenta`}
        className="text-sm text-slate-500 hover:underline"
      >
        ← Volver al estado de cuenta
      </Link>

      <h1 className="mt-2 text-lg font-semibold text-slate-900">
        Editar {cuota.numero_cuota === 0 ? "cuota inicial" : `cuota #${cuota.numero_cuota}`}
      </h1>
      <p className="text-sm text-slate-500">
        Contrato N.º {contrato.numero} · {nombreCliente || "-"}
      </p>

      <form action={actualizarConId} className="mt-4 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Fecha de vencimiento
          </label>
          <input
            type="date"
            name="fecha_vencimiento"
            defaultValue={cuota.fecha_vencimiento}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">
            Monto ({contrato.moneda})
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="monto"
            defaultValue={cuota.monto}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {cuota.monto_pagado > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Esta cuota ya tiene {formatMoney(cuota.monto_pagado, contrato.moneda)} registrado
              como pagado; cambiar el monto no afecta lo ya pagado.
            </p>
          )}
        </div>

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
    </div>
  );
}
