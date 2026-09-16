import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContratoForm } from "@/components/ContratoForm";
import { actualizarContrato } from "../actions";
import { esAdmin } from "@/lib/auth/rol";

export default async function EditarContratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  // Editar contratos es solo para administradores.
  if (!(await esAdmin())) {
    redirect(
      `/contratos?error=${encodeURIComponent(
        "No tienes permisos para editar contratos. Consulta a un administrador."
      )}`
    );
  }

  const supabase = await createClient();

  const [{ data: contrato }, { data: clientes }, { data: propiedades }, { data: vinculos }] =
    await Promise.all([
      supabase.from("contratos").select("*").eq("id", id).single(),
      supabase.from("clientes").select("id, nombre, apellido").order("apellido"),
      supabase
        .from("propiedades")
        .select("id, direccion, manzana, numero_lote, proyectos(id, nombre)")
        .order("direccion"),
      supabase.from("contrato_propiedades").select("propiedad_id").eq("contrato_id", id),
    ]);

  if (!contrato) notFound();

  const actualizarConId = actualizarContrato.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">
          Editar contrato N.º {contrato.numero}
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/contratos" className="text-sm text-slate-500 hover:underline">
            ← Volver a contratos
          </Link>
          <Link
            href={`/contratos/${id}/estado-cuenta`}
            className="text-sm text-slate-500 hover:underline"
          >
            Ver estado de cuenta
          </Link>
        </div>
      </div>
      <ContratoForm
        contrato={contrato}
        clientes={clientes ?? []}
        propiedades={propiedades ?? []}
        propiedadIdsSeleccionadas={(vinculos ?? []).map((v) => v.propiedad_id)}
        action={actualizarConId}
        error={error}
        esNuevo={false}
      />
    </div>
  );
}
