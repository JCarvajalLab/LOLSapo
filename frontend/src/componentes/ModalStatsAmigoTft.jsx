import { useState } from "react";
import { urlIconoPerfil } from "../logica/ddragon.js";
import { nombreRango } from "../logica/formato.js";
import {
  estadisticasDetalladasTft,
  formatearPromedio,
  PERIODOS_STATS_TFT,
  TEXTOS_PERIODO_STATS_TFT,
} from "../logica/tft.js";
import { Dialogo } from "./Dialogo.jsx";
import { ImagenDD } from "./ImagenDD.jsx";

const ID_TITULO = "titulo-stats-tft";

const MODOS_MODAL = [
  { clave: "ranked", etiqueta: "Clasificatoria" },
  { clave: "todos", etiqueta: "Todos los modos" },
];

/**
 * Modal de estadísticas de perfil de TFT estilo Tactics.tools / OP.GG.
 * Permite alternar entre Últimos 30 días y Temporada 2026, así como Clasificatoria y Todos.
 * Muestra el rango, resumen de Top 4 vs Bot 4, y el gráfico de barras horizontales
 * con la distribución de los 8 puestos (1.º a 8.º).
 */
export function ModalStatsAmigoTft({ amigo, ddragon, onCerrar, onVerPartidas }) {
  const [periodo, setPeriodo] = useState(PERIODOS_STATS_TFT[0]);
  const [modo, setModo] = useState("ranked");

  const riotId = amigo?.riot_id ?? "";
  const stats = estadisticasDetalladasTft(amigo, periodo, modo);

  const ranked = amigo?.rangos?.ranked;
  const nombreTier = nombreRango(ranked);
  const lp = ranked?.lp ?? 0;

  return (
    <Dialogo
      idTitulo={ID_TITULO}
      onCerrar={onCerrar}
      titulo={
        <>
          <div className="flex items-center gap-3">
            <ImagenDD
              src={urlIconoPerfil(ddragon, amigo?.perfil?.icono)}
              alt={`Ícono de ${riotId}`}
              respaldo={riotId}
              tamaño={38}
              redonda
            />
            <div className="min-w-0">
              <h2 id={ID_TITULO} className="titulo-seccion min-w-0 text-lg sm:text-xl break-words">
                {riotId}
              </h2>
              <p className="text-xs text-texto-suave">
                Estadísticas de TFT · {TEXTOS_PERIODO_STATS_TFT[periodo].boton}
              </p>
            </div>
          </div>
        </>
      }
    >
      {/* Selectores de Modo y Período */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Pestañas de modo */}
        <div role="group" aria-label="Modo" className="segmentos">
          {MODOS_MODAL.map((m) => {
            const activo = m.clave === modo;
            return (
              <button
                key={m.clave}
                type="button"
                aria-pressed={activo}
                onClick={() => setModo(m.clave)}
                className="segmento min-h-9 text-xs sm:text-sm"
              >
                {m.etiqueta}
              </button>
            );
          })}
        </div>

        {/* Pestañas de período */}
        <div role="group" aria-label="Período" className="segmentos">
          {PERIODOS_STATS_TFT.map((p) => {
            const activo = p === periodo;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={activo}
                onClick={() => setPeriodo(p)}
                className="segmento min-h-9 text-xs sm:text-sm"
              >
                {TEXTOS_PERIODO_STATS_TFT[p].boton}
              </button>
            );
          })}
        </div>
      </div>

      {!stats || stats.partidas === 0 ? (
        <p className="rounded-lg border border-dashed border-borde px-3 py-8 text-center text-sm text-texto-suave">
          Sin partidas registradas para este período o modo.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[16rem_minmax(0,1fr)] gap-4 sm:gap-5">
          {/* Columna Izquierda: Rango y Resumen */}
          <div className="flex flex-col justify-between rounded-xl border border-borde/70 bg-superficie/50 p-4 space-y-4">
            <div className="space-y-3">
              {/* Bloque de Rango */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold font-titulo tracking-wide text-texto">
                    {nombreTier ?? "Sin clasificar"}
                  </span>
                  {nombreTier && (
                    <span className="text-oro font-semibold text-sm sm:text-base cifras">
                      {lp} LP
                    </span>
                  )}
                </div>
                <p className="text-xs text-texto-suave mt-0.5">
                  Teamfight Tactics · {modo === "ranked" ? "Clasificatoria" : "Todos los modos"}
                </p>
              </div>

              {/* Métricas de Partidas */}
              <div className="space-y-1.5 pt-2 border-t border-borde/40 text-sm">
                <p className="text-texto font-medium">
                  Partidas: <strong className="text-base text-texto font-bold cifras">{stats.partidas}</strong>
                </p>
                <p className="text-texto-suave text-xs sm:text-sm cifras">
                  Top 4: <strong className="text-victoria font-bold">{stats.top4}</strong>
                  <span className="mx-1 text-borde">—</span>
                  Bottom 4: <strong className="text-derrota font-bold">{stats.bot4}</strong>
                </p>
                <p className="text-texto-suave text-xs sm:text-sm cifras">
                  Promedio de posición: <strong className="text-texto font-bold text-sm sm:text-base">{formatearPromedio(stats.promedio)}</strong>
                </p>
              </div>
            </div>

            <p className="text-[11px] text-texto-suave/80 pt-2 border-t border-borde/30">
              {periodo === "ultimos_30_dias"
                ? "Basado en las partidas más recientes del historial."
                : "Basado en las partidas registradas de la temporada 2026."}
            </p>
          </div>

          {/* Columna Derecha: Gráfico de Posiciones y Resumen */}
          <div className="rounded-xl border border-borde/70 bg-superficie/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-1">
              <h3 className="text-xs sm:text-sm font-bold tracking-wide text-texto">
                Posiciones
              </h3>
              <span className="text-[11px] text-texto-suave cifras">
                {TEXTOS_PERIODO_STATS_TFT[periodo].subtitulo(stats.partidas)}
              </span>
            </div>

            {/* Lista de 8 Barras Horizontales */}
            <div className="space-y-1.5" aria-label="Distribución de puestos">
              {stats.puestos.map((item) => {
                const esPrimero = item.puesto === 1;
                const esTop4 = item.puesto <= 4;
                const colorTexto = esPrimero ? "text-oro" : esTop4 ? "text-victoria" : "text-derrota";
                const colorBarra = esPrimero ? "bg-oro" : esTop4 ? "bg-victoria" : "bg-derrota";

                return (
                  <div key={item.puesto} className="flex items-center gap-2 text-xs">
                    {/* Etiqueta del puesto */}
                    <span className={`w-5 shrink-0 font-bold ${colorTexto}`}>
                      {item.puesto}.º
                    </span>

                    {/* Contenedor de la barra */}
                    <div className="flex-1 h-3.5 rounded bg-superficie-alta/80 overflow-hidden relative border border-borde/30">
                      <div
                        className={`h-full rounded-sm transition-all duration-300 ${colorBarra}`}
                        style={{
                          width: `${item.cantidad > 0 ? Math.max(item.anchoPct, 3) : 0}%`,
                        }}
                      />
                    </div>

                    {/* Cantidad y Porcentaje */}
                    <span className="w-7 text-right font-bold cifras text-texto">
                      {item.cantidad}
                    </span>
                    <span className="w-8 text-right text-[11px] text-texto-suave cifras">
                      {item.porcentaje}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 3 Tarjetas de Resumen inferior */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-borde/60 text-center">
              <div>
                <div className="text-sm sm:text-base font-bold text-texto cifras">
                  {formatearPromedio(stats.promedio)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-texto-suave font-semibold mt-0.5">
                  Puesto medio
                </div>
              </div>

              <div>
                <div className="text-sm sm:text-base font-bold text-victoria cifras">
                  {stats.top4Pct !== null ? `${Math.round(stats.top4Pct)}%` : "—"}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-texto-suave font-semibold mt-0.5">
                  Tasa de Top 4
                </div>
              </div>

              <div>
                <div className="text-sm sm:text-base font-bold text-oro cifras">
                  {stats.primerosPct !== null ? `${Math.round(stats.primerosPct)}%` : "—"}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-texto-suave font-semibold mt-0.5">
                  Primer puesto
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón de acción al pie */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onVerPartidas}
          className="min-h-10 rounded-lg border border-sapo/60 bg-sapo-fondo px-4 py-2 text-sm font-semibold text-sapo hover:bg-sapo/20"
        >
          Ver sus últimas partidas
        </button>
      </div>
    </Dialogo>
  );
}
