/**
 * Selector de vista para el historial de partidas (Detallada vs Compacta).
 * Estilo OP.GG con dos botones de icono:
 * - Vista detallada: icono cuadrado / tarjeta [ □ ]
 * - Vista compacta: icono de barras horizontales [ 〓 ]
 */
export function SelectorVistaPartidas({ vista = "detallada", onCambiarVista }) {
  const esDetallada = vista === "detallada";
  const esCompacta = vista === "compacta";

  return (
    <div
      role="group"
      aria-label="Tipo de vista de partidas"
      className="inline-flex items-center rounded border border-borde/70 bg-fondo/90 p-0.5 shadow-inner"
    >
      {/* Botón Vista Detallada */}
      <button
        type="button"
        role="button"
        aria-pressed={esDetallada}
        aria-label="Vista detallada"
        title="Vista detallada"
        onClick={() => onCambiarVista?.("detallada")}
        className={`flex size-6 items-center justify-center rounded transition-all cursor-pointer ${
          esDetallada
            ? "bg-sky-500 text-white shadow-sm"
            : "text-texto-suave/80 hover:text-texto hover:bg-superficie-alta/50"
        }`}
      >
        <svg
          viewBox="0 0 16 16"
          className="size-3.5 fill-none stroke-current stroke-[1.8]"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="12" height="12" rx="2.5" />
        </svg>
      </button>

      {/* Botón Vista Compacta */}
      <button
        type="button"
        role="button"
        aria-pressed={esCompacta}
        aria-label="Vista compacta"
        title="Vista compacta"
        onClick={() => onCambiarVista?.("compacta")}
        className={`flex size-6 items-center justify-center rounded transition-all cursor-pointer ${
          esCompacta
            ? "bg-sky-500 text-white shadow-sm"
            : "text-texto-suave/80 hover:text-texto hover:bg-superficie-alta/50"
        }`}
      >
        <svg
          viewBox="0 0 16 16"
          className="size-3.5 fill-none stroke-current stroke-[2]"
          aria-hidden="true"
        >
          <line x1="2" y1="5.5" x2="14" y2="5.5" strokeLinecap="round" />
          <line x1="2" y1="10.5" x2="14" y2="10.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
