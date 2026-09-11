import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "@/components/ClienteForm";
import { actualizarCliente } from "../actions";

export default async function EditarClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (!cliente) notFound();

  const actualizarConId = actualizarCliente.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">
          Editar cliente: {cliente.nombre} {cliente.apellido}
        </h1>
        <Link
          href={`/clientes/${id}/estado-cuenta`}
          className="text-sm text-slate-500 hover:underline"
        >
          Ver estado de cuenta
        </Link>
      </div>
      <ClienteForm cliente={cliente} action={actualizarConId} error={error} />
    </div>
  );
}
