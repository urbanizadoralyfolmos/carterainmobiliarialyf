import { ProyectoForm } from "@/components/ProyectoForm";
import { crearProyecto } from "../actions";

export default async function NuevoProyectoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Nuevo proyecto</h1>
      <ProyectoForm action={crearProyecto} error={error} />
    </div>
  );
}
