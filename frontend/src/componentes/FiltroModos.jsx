import { FILTROS } from "../logica/filtros.js";

/**
 * Botones Todos / Rankeds / Normales / ARAM / Otros (RF-17).
 * `opciones` permite quitar categorías que no aplican (TFT usa FILTROS_TFT, sin ARAM).
 */
export function FiltroModos({ valor, onCambiar, opciones = FILTROS }) {
  return (
    <div role="group" aria-label="Filtrar por modo" className="segmentos flex w-full sm:inline-flex sm:w-auto">
      {opciones.map((f) => {
        const activo = f.clave === valor;
        return (
          <button
            key={f.clave}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiar(f.clave)}
            className="segmento min-h-10 flex-auto sm:flex-none"
          >
            {f.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
