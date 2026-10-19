import { useMemo, useState } from "react";
import { LINEAS, PERIODOS, listaCampeones, obtenerBloqueCampeones, resumenLineas } from "../logica/campeones.js";
import { nombreCampeon, urlCampeon, urlIconoPerfil } from "../logica/ddragon.js";
import { claseWinrate } from "../logica/formato.js";
import { Dialogo } from "./Dialogo.jsx";
import { IconoPosicion } from "./IconoPosicion.jsx";
import { ImagenDD } from "./ImagenDD.jsx";

const ID_TITULO = "titulo-modal-campeones";

const TEXTOS_PERIODOS = {
  dias_30: "30 días",
  dias_90: "90 días",
  todo: "Año 2026",
};

/**
 * Modal interactivo de Estadísticas de Campeones.
 * Permite alternar entre la vista Global y cada amigo del grupo, seleccionar la ventana
 * temporal (30d, 60d, 90d o Año 2026) y filtrar por posición/rol oficial de LoL con
 * distribución de partidas y porcentajes.
 */
export function ModalCampeones({ campeones, amigos = [], ddragon, onCerrar }) {
  const [amigoSlug, setAmigoSlug] = useState("global");
  const [periodo, setPeriodo] = useState("dias_30");
  const [lineaActiva, setLineaActiva] = useState(null); // null = Todas las líneas

  const listaAmigos = useMemo(() => {
    return [
      { slug: "global", nombre: "Global", riot_id: "Grupo completo", perfil: null },
      ...amigos.map((a) => ({
        slug: a.slug,
        nombre: a.nombre || a.riot_id?.split("#")[0] || a.slug,
        riot_id: a.riot_id || a.slug,
        perfil: a.perfil,
      })),
    ];
  }, [amigos]);

  const amigoSeleccionado = listaAmigos.find((a) => a.slug === amigoSlug) || listaAmigos[0];

  // Obtener el bloque de datos según amigo y período
  const bloque = useMemo(() => {
    return obtenerBloqueCampeones(campeones, amigoSlug, periodo);
  }, [campeones, amigoSlug, periodo]);

  // Lista de campeones filtrada por línea
  const filasCampeones = useMemo(() => {
    return listaCampeones(bloque, lineaActiva);
  }, [bloque, lineaActiva]);

  // Resumen de las 5 líneas
  const statsLineas = useMemo(() => {
    return resumenLineas(bloque);
  }, [bloque]);

  const totalPartidas = bloque?.total_partidas || 0;
  const maxPartidasFila = Math.max(...filasCampeones.map((c) => c.partidas), 1);

  // Mapa de amigos por slug para mostrar nombres en la vista global
  const mapaNombresAmigos = useMemo(() => {
    const mapa = {};
    for (const a of amigos) {
      mapa[a.slug] = a.nombre || a.riot_id?.split("#")[0] || a.slug;
    }
    return mapa;
  }, [amigos]);

  return (
    <Dialogo
      idTitulo={ID_TITULO}
      onCerrar={onCerrar}
      anchoMax="max-w-4xl"
      titulo={
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 min-w-0">
            {amigoSeleccionado.slug === "global" ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sapo-fondo text-sapo border border-sapo/40 font-bold text-sm">
                GS
              </span>
            ) : (
              <ImagenDD
                src={urlIconoPerfil(ddragon, amigoSeleccionado.perfil?.icono)}
                alt={`Ícono de ${amigoSeleccionado.nombre}`}
                respaldo={amigoSeleccionado.nombre}
                tamaño={32}
                redonda
              />
            )}
            <div className="min-w-0">
              <h2 id={ID_TITULO} className="titulo-seccion text-lg font-bold leading-tight truncate">
                Estadísticas de Campeones <span className="text-texto-suave font-normal">·</span> {amigoSeleccionado.nombre}
              </h2>
            </div>
          </div>
          <p className="text-xs text-texto-suave">
            Partidas registradas en Normal y Ranked · {TEXTOS_PERIODOS[periodo] || periodo}
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Fila 1: Pestañas de Amigos (Jugador Seleccionado) */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-texto-suave">
              Jugador
            </span>
            <span className="text-[11px] text-texto-suave">
              {totalPartidas} {totalPartidas === 1 ? "partida" : "partidas"} en este período
            </span>
          </div>
          <div
            role="tablist"
            aria-label="Seleccionar jugador"
            className="flex flex-wrap gap-1.5 rounded-lg border border-borde/60 bg-fondo/60 p-1"
          >
            {listaAmigos.map((jugador) => {
              const activo = jugador.slug === amigoSlug;
              return (
                <button
                  key={jugador.slug}
                  role="tab"
                  type="button"
                  aria-selected={activo}
                  onClick={() => {
                    setAmigoSlug(jugador.slug);
                    setLineaActiva(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                    activo
                      ? "bg-sapo text-fondo font-bold shadow-sm shadow-sapo/30"
                      : "text-texto-suave hover:bg-superficie-alta hover:text-texto"
                  }`}
                >
                  {jugador.perfil?.icono && (
                    <ImagenDD
                      src={urlIconoPerfil(ddragon, jugador.perfil.icono)}
                      alt=""
                      respaldo={jugador.nombre}
                      tamaño={18}
                      redonda
                    />
                  )}
                  <span>{jugador.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fila 2: Selector de Ventana Temporal (Período) */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-texto-suave">
            Período
          </div>
          <div role="group" aria-label="Período" className="segmentos">
            {PERIODOS.map((p) => {
              const activo = p.clave === periodo;
              return (
                <button
                  key={p.clave}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setPeriodo(p.clave)}
                  className="segmento min-h-8 text-xs"
                >
                  {TEXTOS_PERIODOS[p.clave] || p.etiqueta}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fila 3: Filtro de Posiciones / Líneas con distribución */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-texto-suave">
              Filtrar por posición
            </span>
            {lineaActiva && (
              <button
                type="button"
                onClick={() => setLineaActiva(null)}
                className="text-[11px] text-sapo hover:underline"
              >
                Ver todas las líneas
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Posiciones de juego"
            className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6"
          >
            {/* Botón Todas */}
            <button
              type="button"
              aria-pressed={lineaActiva === null}
              onClick={() => setLineaActiva(null)}
              className={`flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-all ${
                lineaActiva === null
                  ? "border-sapo/80 bg-sapo-fondo text-sapo shadow-sm shadow-sapo/20"
                  : "border-borde/70 bg-fondo/50 text-texto-suave hover:border-borde hover:bg-superficie-alta hover:text-texto"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold">Todas</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1 text-[11px]">
                <span className="font-bold text-texto">{totalPartidas}</span>
                <span className="text-[10px] text-texto-suave">pts</span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-superficie">
                <div className="h-full bg-sapo rounded-full" style={{ width: "100%" }} />
              </div>
            </button>

            {/* Los 5 roles oficiales de LoL */}
            {LINEAS.map((linea) => {
              const stat = statsLineas.find((s) => s.posicion === linea.clave) || {
                partidas: 0,
                porcentaje: 0,
                winrate: null,
              };
              const activo = lineaActiva === linea.clave;
              const tienePartidas = stat.partidas > 0;

              return (
                <button
                  key={linea.clave}
                  type="button"
                  aria-pressed={activo}
                  disabled={!tienePartidas}
                  onClick={() => setLineaActiva(activo ? null : linea.clave)}
                  className={`flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-all ${
                    !tienePartidas
                      ? "opacity-40 cursor-not-allowed border-borde/30 bg-fondo/20 text-texto-suave"
                      : activo
                        ? "border-sapo/80 bg-sapo-fondo text-sapo shadow-sm shadow-sapo/20"
                        : "border-borde/70 bg-fondo/50 text-texto-suave hover:border-borde hover:bg-superficie-alta hover:text-texto"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <IconoPosicion
                      posicion={linea.clave}
                      className={`size-4 ${activo ? "text-sapo" : "text-texto-suave"}`}
                    />
                    <span className="text-xs font-semibold">{linea.alias}</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1 text-[11px]">
                    <span className="font-bold text-texto">{stat.partidas}</span>
                    <span className="text-[10px] text-texto-suave">({stat.porcentaje}%)</span>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-superficie">
                    <div
                      className="h-full bg-dorado rounded-full transition-all"
                      style={{ width: `${Math.min(stat.porcentaje, 100)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fila 4: Tabla Detallada de Campeones estilo OP.GG */}
        <div className="mt-2">
          {filasCampeones.length === 0 ? (
            <div className="rounded-xl border border-dashed border-borde/70 bg-fondo/30 px-4 py-10 text-center text-sm text-texto-suave">
              <p className="font-medium text-texto">Sin partidas registradas</p>
              <p className="mt-1 text-xs">
                No hay partidas jugadas con los filtros seleccionados ({TEXTOS_PERIODOS[periodo] || periodo}
                {lineaActiva ? ` · ${LINEAS.find((l) => l.clave === lineaActiva)?.nombre}` : ""}).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-borde/80 bg-fondo/40">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-borde/60 bg-superficie-alta/60 text-[11px] font-semibold uppercase tracking-wider text-texto-suave">
                    <th scope="col" className="py-2.5 pl-3 pr-1 w-8 text-center">#</th>
                    <th scope="col" className="py-2.5 px-3">Campeón</th>
                    <th scope="col" className="py-2.5 px-3 text-center">Partidas</th>
                    <th scope="col" className="py-2.5 px-3 text-left">KDA</th>
                    <th scope="col" className="py-2.5 pr-3 text-right">Winrate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde/40 font-normal">
                  {filasCampeones.map((c, idx) => {
                    const nombre = nombreCampeon(ddragon, c.campeon_id, c.campeon);
                    const kdaNum = typeof c.kda === "number" ? c.kda : null;
                    const pctPartidas = totalPartidas > 0 ? Math.round((c.partidas / totalPartidas) * 100) : 0;
                    const kdaProm = c.promedio_kda || { asesinatos: 0, muertes: 0, asistencias: 0 };
                    const amigoPpalNombre = c.amigo_principal ? mapaNombresAmigos[c.amigo_principal] || c.amigo_principal : null;

                    return (
                      <tr
                        key={`${c.campeon_id}-${idx}`}
                        className="transition-colors hover:bg-superficie-alta/50"
                      >
                        {/* 1. Posición / Ranking */}
                        <td className="py-2 pl-3 pr-1 text-center font-mono text-[11px] text-texto-suave">
                          {idx + 1}
                        </td>

                        {/* 2. Campeón con avatar, CS y badge de amigo */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2.5">
                            <ImagenDD
                              src={urlCampeon(ddragon, c.campeon_id)}
                              alt={nombre}
                              respaldo={nombre}
                              tamaño={38}
                              redonda
                              className="border border-borde/80 shrink-0"
                            />
                            <div className="min-w-0 flex flex-col items-start">
                              <span className="font-semibold text-texto leading-tight truncate">
                                {nombre}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-texto-suave">
                                  CS {c.cs_promedio ?? 0} ({c.cs_minuto ?? 0}/m)
                                </span>
                                {amigoSlug === "global" && amigoPpalNombre && (
                                  <span className="inline-block rounded border border-sapo/40 bg-sapo-fondo/60 px-1 py-0.2 text-[9.5px] font-medium text-sapo">
                                    {amigoPpalNombre}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Partidas / Pick */}
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-texto text-xs">
                              {c.partidas}
                            </span>
                            <span className="text-[10px] text-texto-suave">
                              {pctPartidas}%
                            </span>
                            <div className="mt-1 h-1 w-10 overflow-hidden rounded-full bg-fondo border border-borde/40">
                              <div
                                className="h-full bg-dorado rounded-full"
                                style={{ width: `${Math.min(100, Math.round((c.partidas / maxPartidasFila) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 4. KDA ratio + desglose promedio */}
                        <td className="py-2 px-3">
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-mono text-xs font-bold text-texto">
                                {kdaNum !== null ? `${kdaNum.toFixed(2)}:1` : "Perfecto"}
                              </span>
                            </div>
                            <span className="text-[11px] text-texto-suave">
                              {kdaProm.asesinatos} / {kdaProm.muertes} / {kdaProm.asistencias}
                            </span>
                          </div>
                        </td>

                        {/* 5. Winrate % con victorias/derrotas */}
                        <td className="py-2 pr-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-xs font-bold ${claseWinrate(c.winrate)}`}>
                              {c.winrate !== null ? `${c.winrate}%` : "—"}
                            </span>
                            <span className="text-[10px] text-texto-suave">
                              {c.victorias}V {c.derrotas}D
                            </span>
                            <div className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-fondo border border-borde/40">
                              <div
                                className={`h-full rounded-full ${
                                  (c.winrate || 0) >= 50 ? "bg-victoria" : "bg-derrota"
                                }`}
                                style={{ width: `${c.winrate || 0}%` }}
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
        </div>
      </div>
    </Dialogo>
  );
}
