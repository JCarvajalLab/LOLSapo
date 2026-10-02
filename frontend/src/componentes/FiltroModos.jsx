import { FILTROS } from "../logica/filtros.js";

/** Botones Todos / Rankeds / Normales / ARAM / Otros (RF-17). */
export function FiltroModos({ valor, onCambiar }) {
  return (
    <div role="group" aria-label="Filtrar por modo" className="flex flex-wrap gap-1">
      {FILTROS.map((f) => {
        const activo = f.clave === valor;
        return (
          <button
            key={f.clave}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiar(f.clave)}
            className={`rounded-md border px-3 py-1 text-sm ${
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
