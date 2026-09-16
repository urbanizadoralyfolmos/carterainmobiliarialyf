"use client";

/**
 * Botón que activa/desactiva el "modo edición en bloque" en un listado (por
 * ejemplo, Contratos): mientras está apagado, se oculta la columna de
 * casillas de selección y la barra con la acción en bloque, para no
 * complicar la vista normal. Al presionarlo, se muestran ambas cosas y el
 * usuario puede marcar varios registros y aplicarles el cambio de una vez.
 *
 * Se implementa manipulando directamente las clases de los elementos
 * marcados con los atributos `data-bloque-col` / `data-bloque-barra` dentro
 * del contenedor más cercano marcado con `data-bloque-contenedor`, en vez de
 * levantar el estado a un componente de cliente más grande: así el resto de
 * la tabla (con sus enlaces y botones de servidor) se puede seguir
 * renderizando desde el Server Component de la página.
 */
export function ToggleEdicionEnBloque({
  textoInicial = "Editar estado en bloque",
  textoActivo = "Cancelar edición en bloque",
  className,
}: {
  textoInicial?: string;
  textoActivo?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        const contenedor = e.currentTarget.closest<HTMLElement>("[data-bloque-contenedor]");
        if (!contenedor) return;
        const activo = contenedor.getAttribute("data-bloque-activo") === "1";
        const nuevoActivo = !activo;
        contenedor.setAttribute("data-bloque-activo", nuevoActivo ? "1" : "0");

        // Las columnas de checkbox (th/td) solo necesitan quitar/poner
        // "hidden": su display por defecto (table-cell) ya es el correcto.
        contenedor.querySelectorAll<HTMLElement>("[data-bloque-col]").forEach((el) => {
          el.classList.toggle("hidden", !nuevoActivo);
        });

        // La barra de acción en bloque usa layout flex, así que además de
        // "hidden" hay que alternar la clase "flex" (Tailwind genera ambas
        // utilidades sobre la propiedad "display", y el orden en el
        // classList no determina cuál gana).
        contenedor.querySelectorAll<HTMLElement>("[data-bloque-barra]").forEach((el) => {
          el.classList.toggle("hidden", !nuevoActivo);
          el.classList.toggle("flex", nuevoActivo);
        });

        if (!nuevoActivo) {
          // Al cancelar, se desmarcan todas las casillas para no dejar
          // seleccionados registros "invisibles".
          contenedor
            .querySelectorAll<HTMLInputElement>('[data-bloque-col] input[type="checkbox"]')
            .forEach((casilla) => {
              casilla.checked = false;
            });
        }

        e.currentTarget.textContent = nuevoActivo ? textoActivo : textoInicial;
      }}
    >
      {textoInicial}
    </button>
  );
}
