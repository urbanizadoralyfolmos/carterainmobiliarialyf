"use client";

import type { ReactNode } from "react";

/**
 * Botón de submit que primero pide confirmación al usuario (con el diálogo
 * nativo del navegador). Si cancela, no se envía el formulario. Pensado para
 * usarse dentro de un <form action={...}> que llama a un Server Action, por
 * ejemplo para pedir confirmación antes de eliminar algo.
 */
export function ConfirmSubmitButton({
  mensaje,
  className,
  children,
}: {
  mensaje: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(mensaje)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
