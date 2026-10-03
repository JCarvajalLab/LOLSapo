import { FILTROS } from "../logica/filtros.js";

/**
 * Botones Todos / Rankeds / Normales / ARAM / Otros (RF-17).
 * `opciones` permite quitar categorías que no aplican (TFT usa FILTROS_TFT, sin ARAM).
 */
export function FiltroModos({ valor, onCambiar, opciones = FILTROS }) {
  return (
    <div role="group" aria-label="Filtrar por modo" className="flex flex-wrap gap-1">
      {opciones.map((f) => {
        const activo = f.clave === valor;
        return (
          <button
            key={f.clave}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiar(f.clave)}
            className={`min-h-10 rounded-md border px-3 py-1 text-sm ${
              activo
                ? "border-sapo bg-sapo-fondo font-semibold text-sapo"
                : "border-borde text-texto-suave hover:border-texto-suave hover:text-texto"
            }`}
          >
            {f.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
