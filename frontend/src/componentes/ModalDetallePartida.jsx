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
import { agruparPorEquipo } from "../logica/partidas.js";
import { Dialogo } from "./Dialogo.jsx";
import { IconoPosicion } from "./IconoPosicion.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import {
  ContenidoTooltipArbolRunas,
  ContenidoTooltipItem,
  ElementoConTooltip,
} from "./TooltipFlotante.jsx";
import {
  GraficoDanioInfligido,
  GraficoVentajaOro,
} from "./GraficosDetallePartida.jsx";

const ORDEN_POSICIONES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

const NOMBRES_ROL = {
  TOP: "Carril Superior",
  JUNGLE: "Jungla",
  MIDDLE: "Carril Central",
  BOTTOM: "Carril Inferior",
  UTILITY: "Soporte",
};

function ordenarPorRol(jugadores) {
  if (!Array.isArray(jugadores)) return [];
  const copia = [...jugadores];
  copia.sort((a, b) => {
    const posA = ORDEN_POSICIONES.indexOf((a.posicion || "").toUpperCase());
    const posB = ORDEN_POSICIONES.indexOf((b.posicion || "").toUpperCase());
    if (posA !== -1 && posB !== -1) return posA - posB;
    if (posA !== -1) return -1;
    if (posB !== -1) return 1;
    return 0;
  });
  return copia;
}

/**
 * Modal detallado de partida con diseño OP.GG (2 columnas enfrentadas: Azul vs Rojo),
 * separador de roles en el centro, barra de daño y tooltips en hover.
 */
export function ModalDetallePartida({ partida, ddragon, ahora, slugPropio, onCerrar }) {
  if (!partida) return null;
  const p = partida;
  const equipos = agruparPorEquipo(p.participantes);
  const equiposInfo = p.equipos || {};

  const equipoAzul = equipos.find((e) => e.equipo === 100) || equipos[0];
  const equipoRojo = equipos.find((e) => e.equipo === 200) || equipos[1];

  const infoAzul = equipoAzul ? equiposInfo[String(equipoAzul.equipo)] || {} : {};
  const infoRojo = equipoRojo ? equiposInfo[String(equipoRojo.equipo)] || {} : {};

  const jugadoresAzul = ordenarPorRol(equipoAzul?.jugadores || []);
  const jugadoresRojo = ordenarPorRol(equipoRojo?.jugadores || []);

  const totalKillsAzul = jugadoresAzul.reduce((acc, j) => acc + (j.asesinatos || 0), 0);
  const totalKillsRojo = jugadoresRojo.reduce((acc, j) => acc + (j.asesinatos || 0), 0);

  const totalMuertesAzul = jugadoresAzul.reduce((acc, j) => acc + (j.muertes || 0), 0);
  const totalMuertesRojo = jugadoresRojo.reduce((acc, j) => acc + (j.muertes || 0), 0);

  const totalAsistAzul = jugadoresAzul.reduce((acc, j) => acc + (j.asistencias || 0), 0);
  const totalAsistRojo = jugadoresRojo.reduce((acc, j) => acc + (j.asistencias || 0), 0);

  const maxDanio = Math.max(
    1,
    ...jugadoresAzul.map((j) => j.danio || 0),
    ...jugadoresRojo.map((j) => j.danio || 0),
  );
  const maxDanioRecibido = Math.max(
    1,
    ...jugadoresAzul.map((j) => j.danio_recibido || 0),
    ...jugadoresRojo.map((j) => j.danio_recibido || 0),
  );

  const filasCantidad = Math.max(jugadoresAzul.length, jugadoresRojo.length);

  return (
    <Dialogo
      idTitulo="titulo-detalle-partida"
      anchoMax="max-w-6xl"
      onCerrar={onCerrar}
      titulo={
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm w-full">
          {/* Marcador Azul */}
          <div className="flex items-center gap-2">
            <span
              className={`font-bold text-base ${
                infoAzul.victoria ? "text-victoria" : "text-derrota"
              }`}
            >
              {infoAzul.victoria ? "Victoria" : "Derrota"}
            </span>
            <span className="cifras text-texto font-medium">
              <span className="text-victoria">{totalKillsAzul}</span>{" "}
              <span className="text-texto-suave font-normal">/</span>{" "}
              <span className="text-derrota">{totalMuertesAzul}</span>{" "}
              <span className="text-texto-suave font-normal">/</span>{" "}
              <span className="text-sapo">{totalAsistAzul}</span>
            </span>
          </div>

          {/* Centro: Modo y Duración */}
          <div className="text-center">
            <p className="font-semibold text-texto">
              {p.modo || "Partida"}{" "}
              <span className="text-texto-suave font-normal">
                ({formatearDuracion(p.duracion)})
              </span>
            </p>
            <p className="text-[11px] text-texto-suave">
              <time
                dateTime={esNumero(p.fecha) ? new Date(p.fecha).toISOString() : undefined}
                title={fechaCompleta(p.fecha)}
              >
                {haceCuanto(p.fecha, ahora)}
              </time>
            </p>
          </div>

          {/* Marcador Rojo */}
          <div className="flex items-center gap-2">
            <span className="cifras text-texto font-medium">
              <span className="text-victoria">{totalKillsRojo}</span>{" "}
              <span className="text-texto-suave font-normal">/</span>{" "}
              <span className="text-derrota">{totalMuertesRojo}</span>{" "}
              <span className="text-texto-suave font-normal">/</span>{" "}
              <span className="text-sapo">{totalAsistRojo}</span>
            </span>
            <span
              className={`font-bold text-base ${
                infoRojo.victoria ? "text-victoria" : "text-derrota"
              }`}
            >
              {infoRojo.victoria ? "Victoria" : "Derrota"}
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-4 overflow-x-auto pb-2">
        {/* Cabeceras de Objetivos Azul vs Rojo */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-borde/60 pb-2 text-xs">
          {/* Subcabecera Azul */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-azul uppercase tracking-wider text-xs">
              Equipo Azul
            </span>
            <ObjetivosEquipo info={infoAzul} />
          </div>

          {/* Centro vacío en cabecera */}
          <div className="hidden md:block w-8 text-center text-texto-suave font-semibold text-xs">
            VS
          </div>

          {/* Subcabecera Roja */}
          <div className="flex items-center justify-between gap-2">
            <ObjetivosEquipo info={infoRojo} />
            <span className="font-bold text-derrota uppercase tracking-wider text-xs">
              Equipo Rojo
            </span>
          </div>
        </div>

        {/* Tabla / Matchups de 5 carriles */}
        <div className="space-y-2">
          {Array.from({ length: filasCantidad }).map((_, i) => {
            const jAzul = jugadoresAzul[i];
            const jRojo = jugadoresRojo[i];
            const rol =
              (jAzul?.posicion || jRojo?.posicion || ORDEN_POSICIONES[i] || "").toUpperCase();
            const nombreRol = NOMBRES_ROL[rol] || rol;

            return (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-borde/40 bg-fondo/50 p-2 hover:bg-superficie-alta/30 transition-colors"
              >
                {/* Lado Azul (Jugador Izquierda) */}
                {jAzul ? (
                  <TarjetaJugador
                    jugador={jAzul}
                    ddragon={ddragon}
                    slugPropio={slugPropio}
                    duracion={p.duracion}
                    maxDanio={maxDanio}
                    maxDanioRecibido={maxDanioRecibido}
                    lado="azul"
                  />
                ) : (
                  <div className="p-2 text-xs text-texto-suave italic">Sin jugador</div>
                )}

                {/* Ícono Central de Rol oficial (SVG Champ Select / OP.GG) */}
                <div
                  className="hidden md:flex size-8 shrink-0 items-center justify-center rounded-md border border-borde/40 bg-superficie/60 text-texto-suave"
                  title={nombreRol}
                >
                  <IconoPosicion posicion={rol} className="size-5" />
                </div>

                {/* Lado Rojo (Jugador Derecha) */}
                {jRojo ? (
                  <TarjetaJugador
                    jugador={jRojo}
                    ddragon={ddragon}
                    slugPropio={slugPropio}
                    duracion={p.duracion}
                    maxDanio={maxDanio}
                    maxDanioRecibido={maxDanioRecibido}
                    lado="rojo"
                  />
                ) : (
                  <div className="p-2 text-xs text-texto-suave italic text-right">
                    Sin jugador
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bloqueos / Bans al pie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-borde/60 pt-3 text-xs">
          {/* Bans Azul */}
          <div className="flex items-center gap-2">
            <span className="text-texto-suave font-medium">Bloqueos:</span>
            <div className="flex items-center gap-1">
              {infoAzul.baneos && infoAzul.baneos.length > 0 ? (
                infoAzul.baneos.map((banId, idx) => (
                  <ImagenDD
                    key={idx}
                    src={urlCampeon(ddragon, banId)}
                    alt={nombreCampeon(ddragon, banId)}
                    tamaño={22}
                    className="rounded grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition"
                  />
                ))
              ) : (
                <span className="text-texto-suave text-[11px]">—</span>
              )}
            </div>
          </div>

          {/* Bans Rojo */}
          <div className="flex items-center gap-2 md:justify-end">
            <span className="text-texto-suave font-medium">Bloqueos:</span>
            <div className="flex items-center gap-1">
              {infoRojo.baneos && infoRojo.baneos.length > 0 ? (
                infoRojo.baneos.map((banId, idx) => (
                  <ImagenDD
                    key={idx}
                    src={urlCampeon(ddragon, banId)}
                    alt={nombreCampeon(ddragon, banId)}
                    tamaño={22}
                    className="rounded grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition"
                  />
                ))
              ) : (
                <span className="text-texto-suave text-[11px]">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Gráficos comparativos: Ventaja de oro y Daño infligido */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-borde/60 pt-3">
          <GraficoVentajaOro
            partida={p}
            jugadoresAzul={jugadoresAzul}
            jugadoresRojo={jugadoresRojo}
          />
          <GraficoDanioInfligido
            jugadoresAzul={jugadoresAzul}
            jugadoresRojo={jugadoresRojo}
            ddragon={ddragon}
          />
        </div>
      </div>
    </Dialogo>
  );
}

/** Tarjeta compacta para cada jugador dentro de su carril */
function TarjetaJugador({
  jugador,
  ddragon,
  slugPropio,
  duracion,
  maxDanio,
  maxDanioRecibido = 1,
  lado,
}) {
  const j = jugador;
  const campeon = nombreCampeon(ddragon, j.campeon_id);
  const propio = Boolean(slugPropio) && j.amigo === slugPropio;
  const esAmigo = Boolean(j.amigo);
  const ratio = ratioKda(j.asesinatos, j.muertes, j.asistencias);
  const hechizos = Array.isArray(j.hechizos) ? j.hechizos.slice(0, 2) : [];
  const danio = j.danio || 0;
  const pctDanio = maxDanio > 0 ? Math.round((danio / maxDanio) * 100) : 0;
  const danioRecibido = j.danio_recibido || 0;
  const pctDanioRecibido =
    maxDanioRecibido > 0 ? Math.round((danioRecibido / maxDanioRecibido) * 100) : 0;

  const esAzul = lado === "azul";

  return (
    <div
      className={`flex flex-wrap items-center gap-2 p-1.5 rounded-md ${
        propio ? "bg-superficie-alta/60 ring-1 ring-dorado/40" : ""
      } ${!esAzul ? "md:flex-row-reverse text-right" : ""}`}
    >
      {/* Campeón, nivel, hechizos y runas */}
      <div className="flex items-center gap-1 shrink-0">
        <div className="relative">
          <ImagenDD
            src={urlCampeon(ddragon, j.campeon_id)}
            alt={campeon}
            tamaño={40}
            className="rounded"
          />
          {esNumero(j.nivel) && j.nivel > 0 && (
            <span
              className="cifras absolute -right-1 -bottom-1 rounded-full border border-borde bg-fondo px-1 text-[10px] leading-3 font-semibold"
              aria-label={`Nivel ${j.nivel}`}
            >
              {j.nivel}
            </span>
          )}
        </div>

        {/* Hechizos */}
        {hechizos.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {hechizos.map((h, idx) => (
              <ImagenDD
                key={idx}
                src={urlHechizo(ddragon, h)}
                alt={nombreHechizo(ddragon, h)}
                tamaño={18}
                className="rounded-sm"
              />
            ))}
          </div>
        )}

        {/* Runa clave con hover tooltip al árbol completo */}
        {j.runas && (j.runas.principal || j.runas.primarias) && (
          <ElementoConTooltip
            tooltip={<ContenidoTooltipArbolRunas runas={j.runas} ddragon={ddragon} />}
          >
            <ImagenDD
              src={urlRuna(ddragon, j.runas.principal || j.runas.primarias?.[0])}
              alt={nombreRuna(ddragon, j.runas.principal || j.runas.primarias?.[0])}
              sinTitulo
              tamaño={20}
              redonda
              className="cursor-help ring-1 ring-dorado/40"
            />
          </ElementoConTooltip>
        )}
      </div>

      {/* Identidad del jugador */}
      <div className="min-w-0 flex-1 basis-28">
        <p
          className={`truncate font-semibold text-xs ${
            propio
              ? "text-dorado font-bold"
              : esAmigo
                ? "text-victoria"
                : "text-texto"
          }`}
          title={j.nombre || campeon}
        >
          {j.nombre || campeon}
        </p>
        <p className="text-[11px] text-texto-suave truncate">{campeon}</p>
      </div>

      {/* KDA + Stats + Barras de daño */}
      <div className={`flex flex-col gap-0.5 min-w-[130px] ${!esAzul ? "items-end" : "items-start"}`}>
        <p className="cifras text-xs font-semibold">
          <span className="text-victoria">{j.asesinatos ?? 0}</span>{" "}
          <span className="text-texto-suave font-normal">/</span>{" "}
          <span className="text-derrota">{j.muertes ?? 0}</span>{" "}
          <span className="text-texto-suave font-normal">/</span>{" "}
          <span className="text-sapo">{j.asistencias ?? 0}</span>
          {ratio && (
            <span className="ml-1 text-[10px] text-texto-suave font-normal">
              ({ratio === "Perfecto" ? "Perf" : `${ratio}`})
            </span>
          )}
        </p>
        <p className="cifras text-[10px] text-texto-suave">
          {j.cs ?? 0} CS{duracion ? ` (${csPorMinuto(j.cs, duracion)}/m)` : ""}{" "}
          {j.oro ? `· ${(j.oro / 1000).toFixed(1)}k oro` : ""}
        </p>
        <p className="cifras text-[10px] text-texto-suave">
          {j.participacion ? `${Math.round(j.participacion)}% P. · ` : ""}
          Visión: {j.vision ?? "—"}
        </p>

        {/* Barra de daño infligido */}
        {danio > 0 && (
          <div
            className={`flex items-center gap-1.5 mt-0.5 ${!esAzul ? "justify-end" : "justify-start"}`}
            title={`Daño infligido a campeones: ${danio.toLocaleString()}`}
          >
            {!esAzul ? (
              <>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-borde/50 flex justify-end">
                  <div
                    className="h-full bg-derrota rounded-full"
                    style={{ width: `${pctDanio}%` }}
                  />
                </div>
                <span className="cifras text-[10px] text-texto-suave min-w-[2.2rem] text-right">
                  {(danio / 1000).toFixed(1)}k
                </span>
              </>
            ) : (
              <>
                <span className="cifras text-[10px] text-texto-suave min-w-[2.2rem] text-left">
                  {(danio / 1000).toFixed(1)}k
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-borde/50">
                  <div
                    className="h-full bg-derrota rounded-full"
                    style={{ width: `${pctDanio}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Barra de daño recibido (abajo de la de daño infligido) */}
        {danioRecibido > 0 && (
          <div
            className={`flex items-center gap-1.5 ${!esAzul ? "justify-end" : "justify-start"}`}
            title={`Daño recibido: ${danioRecibido.toLocaleString()}`}
          >
            {!esAzul ? (
              <>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-borde/50 flex justify-end">
                  <div
                    className="h-full bg-slate-400 rounded-full"
                    style={{ width: `${pctDanioRecibido}%` }}
                  />
                </div>
                <span className="cifras text-[10px] text-texto-suave min-w-[2.2rem] text-right">
                  {(danioRecibido / 1000).toFixed(1)}k
                </span>
              </>
            ) : (
              <>
                <span className="cifras text-[10px] text-texto-suave min-w-[2.2rem] text-left">
                  {(danioRecibido / 1000).toFixed(1)}k
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-borde/50">
                  <div
                    className="h-full bg-slate-400 rounded-full"
                    style={{ width: `${pctDanioRecibido}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Ítems: 6 objetos en rejilla + 1 trinket */}
      <RejillaItems items={j.items} ddragon={ddragon} />
    </div>
  );
}

/** 6 ítems principales (rejilla 3x2) + 1 baratija al lado */
function RejillaItems({ items, ddragon }) {
  if (!Array.isArray(items)) return null;
  const espacios = Array.from({ length: 7 }, (_, i) => (Number.isInteger(items[i]) ? items[i] : 0));
  const seisItems = espacios.slice(0, 6);
  const trinket = espacios[6];

  return (
    <div className="flex items-center gap-1 shrink-0">
      <div className="grid grid-cols-3 gap-0.5">
        {seisItems.map((id, i) =>
          id > 0 ? (
            <ElementoConTooltip
              key={i}
              tooltip={<ContenidoTooltipItem itemId={id} ddragon={ddragon} />}
            >
              <ImagenDD
                src={urlItem(ddragon, id)}
                alt={nombreItem(ddragon, id)}
                sinTitulo
                tamaño={20}
                className="rounded border border-borde/70"
              />
            </ElementoConTooltip>
          ) : (
            <span
              key={i}
              role="img"
              aria-label="Espacio vacío"
              className="block size-[20px] rounded border border-borde/40 bg-fondo/60"
            />
          ),
        )}
      </div>

      {/* Trinket */}
      <div className="pl-0.5">
        {trinket > 0 ? (
          <ElementoConTooltip
            tooltip={<ContenidoTooltipItem itemId={trinket} ddragon={ddragon} />}
          >
            <ImagenDD
              src={urlItem(ddragon, trinket)}
              alt={nombreItem(ddragon, trinket)}
              sinTitulo
              tamaño={20}
              className="rounded-full border border-borde/70"
            />
          </ElementoConTooltip>
        ) : (
          <span
            role="img"
            aria-label="Espacio vacío"
            className="block size-[20px] rounded-full border border-borde/40 bg-fondo/60"
          />
        )}
      </div>
    </div>
  );
}

/** Tira de objetivos de equipo */
function ObjetivosEquipo({ info }) {
  return (
    <div className="flex items-center gap-2.5 text-texto-suave text-xs">
      {info.torres !== undefined && (
        <span title="Torres destruidas" className="inline-flex items-center gap-0.5">
          <span aria-hidden="true">🏛️</span> {info.torres}
        </span>
      )}
      {info.dragones !== undefined && (
        <span title="Dragones asegurados" className="inline-flex items-center gap-0.5">
          <span aria-hidden="true">🐉</span> {info.dragones}
        </span>
      )}
      {info.barones !== undefined && (
        <span title="Barones asesinados" className="inline-flex items-center gap-0.5">
          <span aria-hidden="true">👾</span> {info.barones}
        </span>
      )}
      {info.larvas !== undefined && info.larvas > 0 && (
        <span title="Larvas del Vacío" className="inline-flex items-center gap-0.5">
          <span aria-hidden="true">🐛</span> {info.larvas}
        </span>
      )}
      {info.heraldos !== undefined && info.heraldos > 0 && (
        <span title="Heraldos" className="inline-flex items-center gap-0.5">
          <span aria-hidden="true">🪲</span> {info.heraldos}
        </span>
      )}
      {info.inhibidores !== undefined && (
        <span title="Inhibidores" className="inline-flex items-center gap-0.5">
          <span aria-hidden="true">🛡️</span> {info.inhibidores}
        </span>
      )}
    </div>
  );
}
