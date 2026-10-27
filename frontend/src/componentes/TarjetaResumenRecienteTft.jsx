import { claseWinrate } from "../logica/formato.js";
import { resumenRecienteTft } from "../logica/tft.js";

const CIRCUNFERENCIA = 2 * Math.PI * 27; // radio = 27 -> ~169.646

/**
 * Tarjeta de resumen de las partidas recientes (hasta 30) estilo Tactics.tools / OP.GG.
 * Contiene una dona SVG con la tasa de Top 4 (primer lugar dorado, 2.º a 4.º verde, 5.º a 8.º pizarra),
 * desglose de victorias/derrotas y la posición media con decimales exactos.
 */
export function TarjetaResumenRecienteTft({ historial, filtro = "todos" }) {
  const resumen = resumenRecienteTft(historial, filtro);
  if (!resumen) return null;

  const { total, primeros, top2a4, top4, derrotas, pctTop4, promedio } = resumen;

  // Formato decimal con coma
  const pctTexto = pctTop4 % 1 === 0 ? `${Math.round(pctTop4)}%` : `${pctTop4.toFixed(2).replace(".", ",")}%`;
  const promTexto = promedio.toFixed(2).replace(".", ",");

  // Arcos de la dona SVG
  const lenPrimeros = (primeros / total) * CIRCUNFERENCIA;
  const lenTop2a4 = (top2a4 / total) * CIRCUNFERENCIA;

  return (
    <section
      aria-label="Resumen de partidas recientes"
      className="space-y-2 pt-0.5"
    >
      <h4 className="text-xs font-semibold tracking-wide text-texto-suave">
        {total === 1 ? "Última partida" : `Últimas ${total} partidas`}
      </h4>

      <div className="flex items-center gap-3.5 sm:gap-4">
        {/* Dona SVG */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            className="w-18 h-18 -rotate-90 transform"
            viewBox="0 0 76 76"
            role="img"
            aria-label={`Tasa de top 4: ${pctTexto}`}
          >
            {/* Fondo / Derrotas (5.º a 8.º) */}
            <circle
              cx="38"
              cy="38"
              r="27"
              fill="none"
              stroke="#334155"
              strokeWidth="7"
            />

            {/* Segmento 2.º a 4.º (Verde esmeralda Top 4) */}
            {lenTop2a4 > 0 && (
              <circle
                cx="38"
                cy="38"
                r="27"
                fill="none"
                stroke="#10b981"
                strokeWidth="7"
                strokeDasharray={`${lenTop2a4} ${CIRCUNFERENCIA - lenTop2a4}`}
                strokeDashoffset={-lenPrimeros}
              />
            )}

            {/* Segmento 1.º Lugar (Dorado) */}
            {lenPrimeros > 0 && (
              <circle
                cx="38"
                cy="38"
                r="27"
                fill="none"
                stroke="#eab308"
                strokeWidth="7"
                strokeDasharray={`${lenPrimeros} ${CIRCUNFERENCIA - lenPrimeros}`}
                strokeDashoffset="0"
              />
            )}
          </svg>

          {/* Porcentaje en el centro */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[13px] sm:text-sm font-bold font-mono text-texto tracking-tight">
              {pctTexto}
            </span>
          </div>
        </div>

        {/* Separador vertical */}
        <div className="h-12 w-px bg-borde/70 shrink-0" aria-hidden="true" />

        {/* Métricas a la derecha */}
        <div className="flex flex-col justify-center space-y-1.5 min-w-0 flex-1">
          <div>
            <span className="text-[11px] font-medium text-texto-suave block">Tasa de top 4</span>
            <div className="text-xs sm:text-[13px] font-bold text-texto cifras leading-tight flex flex-wrap items-center gap-x-1">
              <span>{top4} {top4 === 1 ? "victoria" : "victorias"} / {derrotas} {derrotas === 1 ? "derrota" : "derrotas"}</span>
              <span className={`font-bold whitespace-nowrap ${claseWinrate(pctTop4)}`}>({pctTexto})</span>
            </div>
          </div>

          <div className="pt-0.5 border-t border-borde/40">
            <span className="text-[11px] font-medium text-texto-suave block">Pos. media</span>
            <div className="text-xs sm:text-sm font-bold text-texto cifras leading-tight">
              <span>{promTexto}</span>
              <span className="text-texto-suave font-normal text-[11px] ml-0.5">/ 8</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
