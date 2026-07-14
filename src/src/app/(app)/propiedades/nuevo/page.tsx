import { PropiedadForm } from "@/components/PropiedadForm";
import { crearPropiedad } from "../actions";

export default async function NuevaPropiedadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Nueva propiedad</h1>
      <PropiedadForm action={crearPropiedad} error={error} />
    </div>
  );
}
