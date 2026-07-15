import { ClienteForm } from "@/components/ClienteForm";
import { crearCliente } from "../actions";

export default async function NuevoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Nuevo cliente</h1>
      <ClienteForm action={crearCliente} error={error} />
    </div>
  );
}
