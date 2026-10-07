// Piezas pequeñas de texto: resultado, modo y barra de winrate.
import { esRanked } from "../logica/partidas.js";
import { formatearWinrate } from "../logica/formato.js";

const RESULTADOS = {
  victoria: { texto: "Victoria", icono: "▲", clase: "text-victoria" },
  derrota: { texto: "Derrota", icono: "▼", clase: "text-derrota" },
  remake: { texto: "Remake", icono: "↺", clase: "text-remake" },
};

export function datosResultado(resultado) {
  return RESULTADOS[resultado] ?? { texto: "Sin resultado", icono: "·", clase: "text-texto-suave" };
}

/** Resultado con color, ícono y texto (nunca solo color). */
export function MarcaResultado({ resultado }) {
  const r = datosResultado(resultado);
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${r.clase}`}>
      <span aria-hidden="true">{r.icono}</span>
      {r.texto}
    </span>
  );
}

/**
 * Nombre del modo. Las ranked son una ficha Hextech con el ícono ◆; el resto, texto suave sin
 * caja, para que la diferencia ranked / no ranked se lea de un vistazo.
 */
export function EtiquetaModo({ item }) {
  const nombre = item?.modo || "Modo especial";
  if (esRanked(item)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-ranked/70 bg-ranked/10 px-1.5 py-0.5 text-xs font-semibold text-ranked">
        <span aria-hidden="true">◆</span>
        {nombre}
        <span className="sr-only"> (ranked)</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center py-0.5 text-xs text-texto-suave">
      {nombre}
    </span>
  );
}

/** Barra de winrate: la parte verde son las victorias. El número va siempre en texto. */
export function BarraWinrate({ winrate, className = "" }) {
  const valor = typeof winrate === "number" ? Math.min(100, Math.max(0, winrate)) : 0;
  return (
    <span
      className={`relative block h-1.5 overflow-hidden rounded-full bg-derrota-fondo ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inset-y-0 left-0 rounded-full bg-victoria" style={{ width: `${valor}%` }} />
    </span>
  );
}

/** "12V 9D · 57%" */
export function RegistroVD({ victorias = 0, derrotas = 0, remakes = 0, winrate }) {
  return (
    <span className="cifras">
      <span className="text-victoria">{victorias}V</span>{" "}
      <span className="text-derrota">{derrotas}D</span>
      {remakes > 0 && <span className="text-remake"> {remakes}R</span>}
      <span className="text-texto-suave"> · </span>
      <span className="font-semibold">{formatearWinrate(winrate)}</span>
    </span>
  );
}
