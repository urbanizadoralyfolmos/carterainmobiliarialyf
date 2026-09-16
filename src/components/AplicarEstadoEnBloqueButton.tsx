"use client";

/**
 * Botón "Aplicar" de la barra de edición de estado en bloque (Contratos).
 * Antes de enviar el formulario, valida que haya al menos un contrato
 * marcado y un nuevo estado elegido, y pide confirmación indicando cuántos
 * contratos se van a modificar y a qué estado (avisando además que un
 * contrato que quede "Anulado" libera automáticamente sus propiedades).
 */
export function AplicarEstadoEnBloqueButton({
  className,
  checkboxName = "contrato_ids",
}: {
  className?: string;
  checkboxName?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        const form = e.currentTarget.closest("form");
        const marcados =
          form?.querySelectorAll<HTMLInputElement>(`input[name="${checkboxName}"]:checked`) ?? [];
        const select = form?.querySelector<HTMLSelectElement>('select[name="nuevo_estado"]');
        const nuevoEstadoTexto = select?.selectedOptions[0]?.text;

        if (marcados.length === 0) {
          e.preventDefault();
          alert("Selecciona al menos un contrato.");
          return;
        }
        if (!select?.value) {
          e.preventDefault();
          alert("Selecciona el nuevo estado a aplicar.");
          return;
        }

        const mensaje =
          `¿Cambiar el estado de ${marcados.length} contrato${marcados.length === 1 ? "" : "s"} ` +
          `a "${nuevoEstadoTexto}"? Si alguno queda "Anulado", sus propiedades/lotes vinculados ` +
          `se liberarán automáticamente.`;

        if (!confirm(mensaje)) {
          e.preventDefault();
        }
      }}
    >
      Aplicar a seleccionados
    </button>
  );
}
