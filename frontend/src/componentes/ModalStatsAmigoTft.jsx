import { useState } from "react";
import { urlIconoPerfil } from "../logica/ddragon.js";
import { nombreRango, urlEmblemaRango } from "../logica/formato.js";
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
 * Modal amplio de estadísticas de perfil de TFT estilo Tactics.tools / OP.GG.
 * Permite alternar entre Últimos 30 días y Temporada 2026, así como Clasificatoria y Todos.
 * Muestra el escudo oficial de la división, datos de ranking y nivel, resumen de desempeño
 * y el gráfico de barras horizontales con la distribución de los 8 puestos (1.º a 8.º).
 */
export function ModalStatsAmigoTft({
  amigo,
  ddragon,
  onCerrar,
  posicionRanking,
  totalAmigos,
}) {
  const [periodo, setPeriodo] = useState(PERIODOS_STATS_TFT[0]);
  const [modo, setModo] = useState("ranked");

  const riotId = amigo?.riot_id ?? "";
  const stats = estadisticasDetalladasTft(amigo, periodo, modo);

  const ranked = amigo?.rangos?.ranked;
  const nombreTier = nombreRango(ranked);
  const lp = ranked?.lp ?? 0;
  const emblemaSrc = urlEmblemaRango(ranked?.tier);

  return (
    <Dialogo
      idTitulo={ID_TITULO}
      onCerrar={onCerrar}
      anchoMax="max-w-5xl"
      titulo={
        <div className="flex items-center gap-3">
          <ImagenDD
            src={urlIconoPerfil(ddragon, amigo?.perfil?.icono)}
            alt={`Ícono de ${riotId}`}
            respaldo={riotId}
            tamaño={40}
            redonda
          />
          <div className="min-w-0">
            <h2 id={ID_TITULO} className="titulo-seccion min-w-0 text-xl sm:text-2xl break-words">
              {riotId}
            </h2>
            <p className="text-xs text-texto-suave mt-0.5">
              Estadísticas de TFT · {TEXTOS_PERIODO_STATS_TFT[periodo].boton}
            </p>
          </div>
        </div>
      }
    >
      {/* Selectores de Modo y Período en una sola fila espaciosa */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-borde/60 pb-3">
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
                className="segmento min-h-9 text-xs sm:text-sm px-3"
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
                className="segmento min-h-9 text-xs sm:text-sm px-3"
              >
                {TEXTOS_PERIODO_STATS_TFT[p].boton}
              </button>
            );
          })}
        </div>
      </div>

      {!stats || stats.partidas === 0 ? (
        <p className="rounded-lg border border-dashed border-borde px-3 py-10 text-center text-sm text-texto-suave">
          Sin partidas registradas para este período o modo.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-5 sm:gap-6 items-stretch">
          {/* Columna Izquierda: Escudo de Rango grande y Resumen completo */}
          <div className="flex flex-col justify-between rounded-xl border border-borde/70 bg-superficie/50 p-5 sm:p-6">
            <div className="space-y-5">
              {/* Fila superior: Escudo grande y datos de Rango */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                {/* Escudo de rango grande */}
                {emblemaSrc ? (
                  <img
                    src={emblemaSrc}
                    alt={`Emblema de ${nombreTier}`}
                    className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 object-contain shrink-0 drop-shadow-xl self-center"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border border-borde bg-superficie-alta/60 flex items-center justify-center shrink-0 text-texto-suave text-3xl font-bold self-center">
                    ?
                  </div>
                )}

                {/* Todo el bloque de información junto al escudo */}
                <div className="min-w-0 space-y-2 flex-1 text-center sm:text-left">
                  <div>
                    <div className="flex flex-wrap items-baseline justify-center sm:justify-start gap-2">
                      <span className="text-2xl sm:text-3xl font-bold font-titulo tracking-wide text-texto">
                        {nombreTier ?? "Sin clasificar"}
                      </span>
                      {nombreTier && (
                        <span className="text-oro font-bold text-base sm:text-lg cifras">
                          {lp} LP
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-texto-suave mt-0.5">
                      Teamfight Tactics · {modo === "ranked" ? "Clasificatoria" : "Todos los modos"}
                    </p>
                  </div>

                  <div className="space-y-1 text-xs sm:text-sm text-texto-suave pt-1">
                    {posicionRanking && (
                      <p>
                        Ranking del grupo:{" "}
                        <strong className="text-texto font-bold">
                          #{posicionRanking}{totalAmigos ? ` de ${totalAmigos}` : ""}
                        </strong>
                      </p>
                    )}
                    {amigo?.perfil?.nivel && (
                      <p>
                        Nivel de cuenta:{" "}
                        <strong className="text-texto font-bold">{amigo.perfil.nivel}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloque de estadísticas de desempeño distribuido en tarjeta */}
              <div className="rounded-lg border border-borde/40 bg-superficie-alta/30 p-3.5 sm:p-4 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-texto-suave">Partidas</span>
                  <strong className="text-texto font-bold text-sm sm:text-base cifras">
                    {stats.partidas}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-texto-suave">Top 4 — Bottom 4</span>
                  <span className="cifras">
                    <strong className="text-victoria font-bold text-sm sm:text-base">{stats.top4}</strong>
                    <span className="mx-2 text-borde/80">—</span>
                    <strong className="text-derrota font-bold text-sm sm:text-base">{stats.bot4}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-texto-suave">Victorias (1.º lugar)</span>
                  <span className="cifras">
                    <strong className="text-oro font-bold text-sm sm:text-base">{stats.primeros}</strong>
                    <span className="text-xs text-texto-suave ml-1.5">
                      ({stats.primerosPct !== null ? `${Math.round(stats.primerosPct)}%` : "0%"})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-texto-suave">Promedio de posición</span>
                  <strong className="text-texto font-bold text-sm sm:text-base cifras">
                    {formatearPromedio(stats.promedio)}
                  </strong>
                </div>
              </div>
            </div>

            <p className="text-xs text-texto-suave/80 pt-3 border-t border-borde/30 mt-4">
              {periodo === "ultimos_30_dias"
                ? "Basado en las partidas más recientes del historial."
                : "Basado en las partidas registradas de la temporada 2026."}
            </p>
          </div>

          {/* Columna Derecha: Gráfico de Posiciones y Resumen */}
          <div className="rounded-xl border border-borde/70 bg-superficie/50 p-5 space-y-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2">
                <h3 className="text-sm sm:text-base font-bold tracking-wide text-texto">
                  Posiciones
                </h3>
                <span className="text-xs text-texto-suave cifras">
                  {TEXTOS_PERIODO_STATS_TFT[periodo].subtitulo(stats.partidas)}
                </span>
              </div>

              {/* Lista de 8 Barras Horizontales */}
              <div className="space-y-2" aria-label="Distribución de puestos">
                {stats.puestos.map((item) => {
                  const esPrimero = item.puesto === 1;
                  const esTop4 = item.puesto <= 4;
                  const colorTexto = esPrimero ? "text-oro" : esTop4 ? "text-victoria" : "text-derrota";
                  const colorBarra = esPrimero ? "bg-oro" : esTop4 ? "bg-victoria" : "bg-derrota";

                  return (
                    <div key={item.puesto} className="flex items-center gap-2.5 text-xs sm:text-sm">
                      {/* Etiqueta del puesto */}
                      <span className={`w-6 shrink-0 font-bold ${colorTexto}`}>
                        {item.puesto}.º
                      </span>

                      {/* Contenedor de la barra */}
                      <div className="flex-1 h-4 rounded bg-superficie-alta/80 overflow-hidden relative border border-borde/30">
                        <div
                          className={`h-full rounded-sm transition-all duration-300 ${colorBarra}`}
                          style={{
                            width: `${item.cantidad > 0 ? Math.max(item.anchoPct, 3) : 0}%`,
                          }}
                        />
                      </div>

                      {/* Cantidad y Porcentaje */}
                      <span className="w-8 text-right font-bold cifras text-texto">
                        {item.cantidad}
                      </span>
                      <span className="w-10 text-right text-xs text-texto-suave cifras">
                        {item.porcentaje}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3 Tarjetas de Resumen inferior */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-borde/60 text-center">
              <div>
                <div className="text-base sm:text-xl font-bold text-texto cifras">
                  {formatearPromedio(stats.promedio)}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-texto-suave font-semibold mt-0.5">
                  Puesto medio
                </div>
              </div>

              <div>
                <div className="text-base sm:text-xl font-bold text-victoria cifras">
                  {stats.top4Pct !== null ? `${Math.round(stats.top4Pct)}%` : "—"}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-texto-suave font-semibold mt-0.5">
                  Tasa de Top 4
                </div>
              </div>

              <div>
                <div className="text-base sm:text-xl font-bold text-oro cifras">
                  {stats.primerosPct !== null ? `${Math.round(stats.primerosPct)}%` : "—"}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-texto-suave font-semibold mt-0.5">
                  Primer puesto
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Dialogo>
  );
}
