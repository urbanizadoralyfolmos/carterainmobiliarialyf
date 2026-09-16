"use client";

/**
 * Casilla "seleccionar todas" reutilizable para listados con selección
 * múltiple (Propiedades, Contratos): al marcarla o desmarcarla, marca/
 * desmarca todas las casillas con el `name` indicado dentro del mismo
 * formulario, para poder elegir varios registros de una vez antes de
 * aplicarles una acción en bloque (eliminar, cambiar estado, etc.).
 */
export function SeleccionarTodasCheckbox({ name = "propiedad_ids" }: { name?: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Seleccionar todas"
      className="h-4 w-4 rounded border-slate-300"
      onChange={(e) => {
        const form = e.currentTarget.closest("form");
        const casillas =
          form?.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`) ?? [];
        casillas.forEach((casilla) => {
          casilla.checked = e.currentTarget.checked;
        });
      }}
    />
  );
}
