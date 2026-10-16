import {
  nombreCampeon,
  nombreHechizo,
  nombreItem,
  nombreRuna,
  urlCampeon,
  urlHechizo,
  urlItem,
  urlRuna,
} from "../logica/ddragon.js";
import { csPorMinuto, esNumero, fechaCompleta, formatearDuracion, haceCuanto, ratioKda } from "../logica/formato.js";
import { agruparPorEquipo, nombreEquipo } from "../logica/partidas.js";
import { Dialogo } from "./Dialogo.jsx";
import { datosResultado, EtiquetaModo } from "./Etiquetas.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { ContenidoTooltipItem, ContenidoTooltipRuna, ElementoConTooltip } from "./TooltipFlotante.jsx";

/**
 * Modal con el desglose completo de una partida (10 jugadores, equipos azul y rojo,
 * KDA, daño relativo, oro, visión, CS, ítems y bloqueos).
 */
export function ModalDetallePartida({ partida, ddragon, ahora, slugPropio, onCerrar }) {
  if (!partida) return null;
  const p = partida;
  const r = datosResultado(p.resultado);
  const equipos = agruparPorEquipo(p.participantes);
  const equiposInfo = p.equipos || {};

  return (
    <Dialogo
      idTitulo="titulo-detalle-partida"
      anchoMax="max-w-5xl"
      onCerrar={onCerrar}
      titulo={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`titulo-sub inline-flex items-center gap-1.5 ${r.clase}`}>
            <span aria-hidden="true" className="text-sm">
              {r.icono}
            </span>
            {r.texto}
          </span>
          <EtiquetaModo item={p} />
          <span className="text-xs text-texto-suave">
            <time dateTime={esNumero(p.fecha) ? new Date(p.fecha).toISOString() : undefined} title={fechaCompleta(p.fecha)}>
              {haceCuanto(p.fecha, ahora)}
            </time>
            <span aria-hidden="true"> · </span>
            <span className="cifras">{formatearDuracion(p.duracion)}</span>
          </span>
        </div>
      }
    >
      <div className="space-y-6 overflow-x-auto pb-2">
        {equipos.length === 0 ? (
          <p className="text-sm text-texto-suave">No hay datos de participantes para esta partida.</p>
        ) : (
          equipos.map((eq, idx) => {
            const eqData = equiposInfo[String(eq.equipo)] || {};
            const esAzul = eq.equipo === 100;
            const esRojo = eq.equipo === 200;
            const totalKills = eq.jugadores.reduce((acc, j) => acc + (j.asesinatos || 0), 0);
            const maxDanio = Math.max(1, ...eq.jugadores.map((j) => j.danio || 0));

            return (
              <section
                key={eq.equipo}
                aria-label={nombreEquipo(eq.equipo, idx)}
                className="space-y-2 rounded-lg border border-borde/70 bg-fondo/40 p-2.5 sm:p-3"
              >
                {/* Cabecera del equipo: nombre, resultado, bajas y objetivos */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borde/60 pb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block size-2.5 rounded-full ${
                        esAzul ? "bg-azul" : esRojo ? "bg-derrota" : "bg-dorado"
                      }`}
                    />
                    <span className="font-semibold text-sm text-texto">
                      {nombreEquipo(eq.equipo, idx)}
                    </span>
                    <span
                      className={`font-semibold ${
                        eqData.victoria ? "text-victoria" : "text-derrota"
                      }`}
                    >
                      {eqData.victoria ? "Victoria" : "Derrota"}
                    </span>
                    <span className="cifras text-texto-suave font-medium ml-1">
                      ({totalKills} asesinatos)
                    </span>
                  </div>

                  {/* Objetivos */}
                  <div className="flex items-center gap-3 text-texto-suave text-xs">
                    {eqData.torres !== undefined && (
                      <span title="Torres destruidas" className="inline-flex items-center gap-0.5">
                        <span aria-hidden="true">🏛️</span> {eqData.torres}
                      </span>
                    )}
                    {eqData.dragones !== undefined && (
                      <span title="Dragones asegurados" className="inline-flex items-center gap-0.5">
                        <span aria-hidden="true">🐉</span> {eqData.dragones}
                      </span>
                    )}
                    {eqData.barones !== undefined && (
                      <span title="Barones asesinados" className="inline-flex items-center gap-0.5">
                        <span aria-hidden="true">👾</span> {eqData.barones}
                      </span>
                    )}
                    {eqData.larvas !== undefined && eqData.larvas > 0 && (
                      <span title="Larvas del Vacío" className="inline-flex items-center gap-0.5">
                        <span aria-hidden="true">🐛</span> {eqData.larvas}
                      </span>
                    )}
                    {eqData.heraldos !== undefined && eqData.heraldos > 0 && (
                      <span title="Heraldos" className="inline-flex items-center gap-0.5">
                        <span aria-hidden="true">🪲</span> {eqData.heraldos}
                      </span>
                    )}
                    {eqData.inhibidores !== undefined && (
                      <span title="Inhibidores" className="inline-flex items-center gap-0.5">
                        <span aria-hidden="true">🛡️</span> {eqData.inhibidores}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabla de 5 jugadores */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-borde/40 text-texto-suave text-[11px]">
                        <th className="py-1.5 pl-1 font-medium w-48">Jugador</th>
                        <th className="py-1.5 font-medium w-28 text-center">KDA</th>
                        <th className="py-1.5 font-medium w-28 text-center">Daño</th>
                        <th className="py-1.5 font-medium w-24 text-center">Farming / Oro</th>
                        <th className="py-1.5 font-medium w-16 text-center">Visión</th>
                        <th className="py-1.5 pr-1 font-medium">Ítems</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borde/20">
                      {eq.jugadores.map((j, k) => {
                        const campeon = nombreCampeon(ddragon, j.campeon_id);
                        const propio = Boolean(slugPropio) && j.amigo === slugPropio;
                        const esAmigo = Boolean(j.amigo);
                        const ratio = ratioKda(j.asesinatos, j.muertes, j.asistencias);
                        const hechizos = Array.isArray(j.hechizos) ? j.hechizos.slice(0, 2) : [];
                        const runas =
                          j.runas && typeof j.runas === "object"
                            ? [j.runas.principal, j.runas.secundaria].filter(Boolean)
                            : [];
                        const danio = j.danio || 0;
                        const pctDanio = Math.round((danio / maxDanio) * 100);

                        return (
                          <tr
                            key={`${j.campeon_id}-${k}`}
                            className={`hover:bg-superficie-alta/40 transition-colors ${
                              propio ? "bg-superficie-alta/60" : ""
                            }`}
                          >
                            {/* Jugador: Campeón, hechizos, runas y nombre */}
                            <td className="py-2 pl-1">
                              <div className="flex items-center gap-2">
                                <div className="relative shrink-0">
                                  <ImagenDD
                                    src={urlCampeon(ddragon, j.campeon_id)}
                                    alt={campeon}
                                    tamaño={34}
                                    className="rounded"
                                  />
                                  {esNumero(j.nivel) && j.nivel > 0 && (
                                    <span
                                      className="cifras absolute -right-1 -bottom-1 rounded-full border border-borde bg-fondo px-1 text-[10px] leading-3"
                                      aria-label={`Nivel ${j.nivel}`}
                                    >
                                      {j.nivel}
                                    </span>
                                  )}
                                </div>

                                {/* Hechizos */}
                                {hechizos.length > 0 && (
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    {hechizos.map((h, i) => (
                                      <ImagenDD
                                        key={i}
                                        src={urlHechizo(ddragon, h)}
                                        alt={nombreHechizo(ddragon, h)}
                                        tamaño={16}
                                        className="rounded-sm"
                                      />
                                    ))}
                                  </div>
                                )}

                                {/* Runas con hover tooltip */}
                                {runas.length > 0 && (
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    {runas.map((rId, i) => (
                                      <ElementoConTooltip
                                        key={i}
                                        tooltip={<ContenidoTooltipRuna runaId={rId} ddragon={ddragon} />}
                                      >
                                        <ImagenDD
                                          src={urlRuna(ddragon, rId)}
                                          alt={nombreRuna(ddragon, rId)}
                                          tamaño={16}
                                          redonda
                                        />
                                      </ElementoConTooltip>
                                    ))}
                                  </div>
                                )}

                                {/* Nombre */}
                                <div className="min-w-0 flex-1 pl-1">
                                  <p
                                    className={`truncate font-medium ${
                                      propio
                                        ? "text-dorado font-bold"
                                        : esAmigo
                                          ? "text-victoria font-semibold"
                                          : "text-texto"
                                    }`}
                                    title={j.nombre || campeon}
                                  >
                                    {j.nombre || campeon}
                                    {propio && (
                                      <span className="ml-1 text-[10px] uppercase tracking-wider text-dorado">
                                        (Tú)
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[11px] text-texto-suave truncate">{campeon}</p>
                                </div>
                              </div>
                            </td>

                            {/* KDA */}
                            <td className="py-2 text-center">
                              <p className="marcador font-medium text-xs">
                                {j.asesinatos ?? 0}{" "}
                                <span className="text-texto-suave font-normal">/</span>{" "}
                                <span className="text-derrota">{j.muertes ?? 0}</span>{" "}
                                <span className="text-texto-suave font-normal">/</span>{" "}
                                {j.asistencias ?? 0}
                              </p>
                              {ratio && (
                                <p className="cifras text-[11px] text-texto-suave">
                                  {ratio === "Perfecto" ? "KDA perfecto" : `${ratio} KDA`}
                                </p>
                              )}
                            </td>

                            {/* Daño */}
                            <td className="py-2 text-center">
                              <p className="cifras text-xs font-medium text-texto">
                                {danio > 0 ? danio.toLocaleString("es-CL") : "—"}
                              </p>
                              {danio > 0 && (
                                <div className="mx-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-borde/50">
                                  <div
                                    className={`h-full ${
                                      esAzul ? "bg-azul" : "bg-derrota"
                                    }`}
                                    style={{ width: `${pctDanio}%` }}
                                  />
                                </div>
                              )}
                            </td>

                            {/* Farming / Oro */}
                            <td className="py-2 text-center text-[11px] text-texto-suave">
                              <p className="cifras text-texto font-medium">
                                {j.cs ?? 0} CS
                                {csPorMinuto(j.cs, p.duracion) && (
                                  <span className="text-texto-suave font-normal ml-0.5">
                                    ({csPorMinuto(j.cs, p.duracion)}/m)
                                  </span>
                                )}
                              </p>
                              {j.oro ? (
                                <p className="cifras text-dorado">
                                  {(j.oro / 1000).toFixed(1)}k oro
                                </p>
                              ) : null}
                            </td>

                            {/* Visión */}
                            <td className="py-2 text-center cifras text-xs text-texto-suave">
                              {j.vision !== undefined && j.vision !== null ? j.vision : "—"}
                            </td>

                            {/* Ítems con tooltips en hover */}
                            <td className="py-2 pr-1">
                              <FilaItems items={j.items} ddragon={ddragon} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Baneos del equipo */}
                {eqData.baneos && eqData.baneos.length > 0 && (
                  <div className="flex items-center gap-1.5 border-t border-borde/40 pt-2 text-[11px] text-texto-suave">
                    <span className="font-medium mr-1">Bloqueos:</span>
                    <div className="flex items-center gap-1">
                      {eqData.baneos.map((banId, bIdx) => (
                        <ImagenDD
                          key={bIdx}
                          src={urlCampeon(ddragon, banId)}
                          alt={nombreCampeon(ddragon, banId)}
                          tamaño={20}
                          className="rounded grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </Dialogo>
  );
}

/** Grilla de 7 ítems para la tabla con tooltips flotantes al hover */
function FilaItems({ items, ddragon }) {
  if (!Array.isArray(items)) return null;
  const espacios = Array.from({ length: 7 }, (_, i) => (Number.isInteger(items[i]) ? items[i] : 0));

  return (
    <ul className="flex items-center gap-1" aria-label="Inventario de ítems">
      {espacios.map((id, i) =>
        id > 0 ? (
          <li key={i} className={i === 6 ? "ml-1" : undefined}>
            <ElementoConTooltip
              tooltip={<ContenidoTooltipItem itemId={id} ddragon={ddragon} />}
            >
              <ImagenDD
                src={urlItem(ddragon, id)}
                alt={nombreItem(ddragon, id)}
                tamaño={22}
                className={i === 6 ? "rounded-full border border-borde/80" : "rounded border border-borde/80"}
              />
            </ElementoConTooltip>
          </li>
        ) : (
          <li key={i} className={i === 6 ? "ml-1" : undefined}>
            <span
              role="img"
              aria-label="Espacio vacío"
              className={`block size-[22px] border border-borde/50 bg-fondo/50 ${
                i === 6 ? "rounded-full" : "rounded"
              }`}
            />
          </li>
        ),
      )}
    </ul>
  );
}
