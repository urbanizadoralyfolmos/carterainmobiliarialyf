"use client";

/**
 * Casilla "seleccionar todas" para el listado de Propiedades: al marcarla o
 * desmarcarla, marca/desmarca todas las casillas `propiedad_ids` del mismo
 * formulario, para poder elegir varias propiedades de una vez antes de
 * eliminarlas.
 */
export function SeleccionarTodasCheckbox() {
  return (
    <input
      type="checkbox"
      aria-label="Seleccionar todas"
      className="h-4 w-4 rounded border-slate-300"
      onChange={(e) => {
        const form = e.currentTarget.closest("form");
        const casillas =
          form?.querySelectorAll<HTMLInputElement>('input[name="propiedad_ids"]') ?? [];
        casillas.forEach((casilla) => {
          casilla.checked = e.currentTarget.checked;
        });
      }}
    />
  );
}
