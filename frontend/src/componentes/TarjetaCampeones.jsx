import { useState } from "react";
import { nombreCampeon, urlCampeon } from "../logica/ddragon.js";
import { claseWinrate } from "../logica/formato.js";
import { campeonesPrincipalesAmigos } from "../logica/campeones.js";
import { ImagenDD } from "./ImagenDD.jsx";

/**
 * Tarjeta de Estadísticas de Campeones para el Dashboard.
 * Muestra el campeón más jugado de cada integrante del grupo (1 por amigo, hasta 5),
 * con barras visuales para Partidas, Winrate y KDA, estilo OP.GG, y la insignia con el
 * nombre del jugador debajo del campeón.
 */
export function TarjetaCampeones({ campeones, amigos, ddragon, onVerDetalle, refBoton }) {
  const [periodo, setPeriodo] = useState("dias_30");
  const filas = campeonesPrincipalesAmigos(campeones, amigos, periodo);
  const maxPartidas = Math.max(...filas.map((c) => c.partidas), 1);

  return (
    <article
      aria-labelledby="titulo-tarjeta-campeones"
      data-destacado="campeones"
      className="group relative flex h-full flex-col justify-between rounded-lg border border-borde/80 bg-fondo/40 p-3 sm:p-3.5 losa"
    >
      <div>
        {/* Cabecera con selector de período (30d, 90d, 2026) y botón Top 5 */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-sapo-fondo text-sapo border border-sapo/30">
              <svg
                className="h-3.5 w-3.5 fill-current"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </span>
            <h3 id="titulo-tarjeta-campeones" className="text-sm font-titulo font-bold tracking-wide uppercase text-texto truncate">
              Campeones más utilizados
            </h3>
          </div>

          <div className="shrink-0">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              aria-label="Filtrar campeones por período"
              className="rounded border border-borde/70 bg-fondo px-2 py-0.5 text-[11px] font-medium text-texto focus:border-sapo focus:outline-none transition-colors cursor-pointer"
            >
              <option value="dias_30">30 días</option>
              <option value="dias_90">90 días</option>
              <option value="todo">2026</option>
            </select>
          </div>
        </div>
      </div>

      {filas.length === 0 ? (
        <div className="my-auto flex flex-col items-center justify-center py-8 text-center text-sm text-texto-suave">
          <p>No hay partidas registradas de campeones.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <table className="w-full h-full flex-1 table-fixed text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-borde/40 text-[10.5px] font-semibold tracking-wider text-texto-suave uppercase">
                <th scope="col" className="pb-1.5 pl-1 font-medium w-[38%]">Campeón</th>
                <th scope="col" className="pb-1.5 px-1.5 text-right font-medium w-[20%]">Partidas</th>
                <th scope="col" className="pb-1.5 px-1.5 text-right font-medium w-[22%]">Winrate</th>
                <th scope="col" className="pb-1.5 pr-1 text-right font-medium w-[20%]">KDA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde/20">
              {filas.map((c, idx) => {
                const nombre = nombreCampeon(ddragon, c.campeon_id, c.campeon);
                const pctPartidas = Math.round((c.partidas / maxPartidas) * 100);
                const winrate = c.winrate ?? 0;
                const kdaNum = c.kda ?? 0;
                const pctKda = Math.min(100, Math.round((kdaNum / 4.5) * 100));

                return (
                  <tr key={`${c.amigo_slug}-${c.campeon_id}`} className="group/row hover:bg-fondo/60 transition-colors">
                    {/* Campeón e identificación del jugador */}
                    <td className="py-2 pl-1 align-middle">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="w-3 text-[10.5px] sm:text-[11px] font-semibold text-texto-suave/80 shrink-0">
                          {idx + 1}.
                        </span>
                        <div className="shrink-0">
                          <ImagenDD
                            src={urlCampeon(ddragon, c.campeon_id, c.campeon)}
                            alt={nombre}
                            tamaño={32}
                            className="size-8 rounded-full border border-borde/60 shadow-sm"
                          />
                        </div>
                        <div className="flex flex-col items-start min-w-0 leading-tight">
                          <span className="truncate font-medium text-texto text-[11.5px] sm:text-xs" title={nombre}>
                            {nombre}
                          </span>
                          <span
                            className="mt-0.5 inline-block self-start rounded bg-sapo-fondo px-1 py-0.2 text-[8.5px] sm:text-[9px] font-semibold text-sapo border border-sapo/30 truncate max-w-full"
                            title={`Campeón más jugado de ${c.amigo_nombre}`}
                          >
                            {c.amigo_nombre}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Partidas */}
                    <td className="py-2 px-1.5 text-right whitespace-nowrap align-middle">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-cyan-400 cifras text-[10.5px] sm:text-[11px]">
                          {c.partidas}
                        </span>
                        <div className="mt-1 h-1 w-11 sm:w-14 overflow-hidden rounded-full bg-superficie-alta border border-borde/40">
                          <div
                            className="h-full bg-cyan-400 rounded-full transition-all"
                            style={{ width: `${pctPartidas}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Winrate */}
                    <td className="py-2 px-1.5 text-right whitespace-nowrap align-middle">
                      <div className="flex flex-col items-end">
                        <span className={`font-semibold cifras text-[10.5px] sm:text-[11px] ${claseWinrate(c.winrate)}`}>
                          {c.winrate !== null ? `${c.winrate}%` : "-"}
                        </span>
                        <div className="mt-1 h-1 w-11 sm:w-13 overflow-hidden rounded-full bg-fondo/80 border border-borde/30">
                          <div
                            className={`h-full rounded-full transition-all ${
                              winrate >= 50 ? "bg-emerald-400" : "bg-red-400"
                            }`}
                            style={{ width: `${winrate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* KDA */}
                    <td className="py-2 pr-1 text-right whitespace-nowrap align-middle">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-sky-400 cifras text-[10.5px] sm:text-[11px]">
                          {kdaNum.toFixed(2)}
                        </span>
                        <div className="mt-1 h-1 w-11 sm:w-13 overflow-hidden rounded-full bg-fondo/80 border border-borde/30">
                          <div
                            className="h-full bg-sky-400 rounded-full transition-all"
                            style={{ width: `${pctKda}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {onVerDetalle && (
        <button
          ref={refBoton}
          type="button"
          onClick={() => onVerDetalle({ periodo })}
          aria-label="Ver estadísticas completas de campeones"
          className="absolute -inset-px cursor-pointer rounded-lg border border-transparent hover:border-sapo/60 transition-colors pointer-events-auto"
        />
      )}
    </article>
  );
}
