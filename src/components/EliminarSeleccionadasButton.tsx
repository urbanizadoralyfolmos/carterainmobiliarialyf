
"use client";

/**
 * Botón "Eliminar seleccionadas" para el listado de Propiedades. Antes de
 * enviar el formulario cuenta cuántas casillas `propiedad_ids` están
 * marcadas: si no hay ninguna, avisa y no envía nada; si hay una o más,
 * pide confirmación indicando cuántas se van a eliminar.
 */
export function EliminarSeleccionadasButton({ className }: { className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        const form = e.currentTarget.closest("form");
        const marcadas =
          form?.querySelectorAll<HTMLInputElement>('input[name="propiedad_ids"]:checked') ?? [];

        if (marcadas.length === 0) {
          e.preventDefault();
          alert("Selecciona al menos una propiedad para eliminar.");
          return;
        }

        const mensaje =
          marcadas.length === 1
            ? "¿Eliminar la propiedad seleccionada? Esta acción no se puede deshacer."
            : `¿Eliminar las ${marcadas.length} propiedades seleccionadas? Esta acción no se puede deshacer.`;

        if (!confirm(mensaje)) {
          e.preventDefault();
        }
      }}
    >
      Eliminar seleccionadas
    </button>
  );
}
