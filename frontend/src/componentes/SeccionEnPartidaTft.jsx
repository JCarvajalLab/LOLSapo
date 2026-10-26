import { useState } from "react";
import { antiguedadDatos } from "../logica/antiguedad.js";
import { urlIconoPerfil } from "../logica/ddragon.js";
import { claseWinrate, esNumero, haceCuanto, iniciales, nombreRango, textoRangoLp } from "../logica/formato.js";
import { minutosEnPartida, nombresAmigos } from "../logica/partidas.js";
import { EtiquetaModo } from "./Etiquetas.jsx";
import { AvisoAntiguedad } from "./SeccionEnPartida.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

function crearPartidaSimuladaTft(amigos = [], ahora = Date.now()) {
  const amigo1 = amigos[0];
  const amigo2 = amigos[1];

  const slug1 = amigo1?.slug ?? "johnadis-las";
  const nombre1 = amigo1?.nombre ?? "Johnadis";
  const id1 = amigo1?.riot_id ?? `${nombre1}#LAS`;
  const icono1 = amigo1?.perfil?.icono ?? 7198;
  const nivel1 = amigo1?.perfil?.nivel ?? 1077;
  const rango1 = amigo1?.rangos?.ranked ?? { tier: "PLATINUM", division: "II", lp: 85 };
  const top4_1 = amigo1?.estadisticas?.total?.top4_pct ?? 54;
  const partidas1 = amigo1?.estadisticas?.total?.partidas ?? 185;

  const slug2 = amigo2?.slug ?? "iskrat-las";
  const nombre2 = amigo2?.nombre ?? "ISkrat";
  const id2 = amigo2?.riot_id ?? `${nombre2}#LAS`;
  const icono2 = amigo2?.perfil?.icono ?? 847;
  const nivel2 = amigo2?.perfil?.nivel ?? 847;
  const rango2 = amigo2?.rangos?.ranked ?? { tier: "PLATINUM", division: "III", lp: 52 };
  const top4_2 = amigo2?.estadisticas?.total?.top4_pct ?? 54;
  const partidas2 = amigo2?.estadisticas?.total?.partidas ?? 61;

  return {
    id: 999999991,
    queue_id: 1100,
    modo: "Clasificatoria",
    categoria: "ranked",
    inicio: (ahora || Date.now()) - 16 * 60 * 1000,
    duracion: 16 * 60,
    amigos: [slug1, slug2],
    jugadores: [
      {
        nombre: id1,
        amigo: slug1,
        icono: icono1,
        nivel: nivel1,
        rango: rango1,
        top4_pct: top4_1,
        partidas: partidas1,
        premade: 1,
      },
      {
        nombre: id2,
        amigo: slug2,
        icono: icono2,
        nivel: nivel2,
        rango: rango2,
        top4_pct: top4_2,
        partidas: partidas2,
        premade: 1,
      },
      {
        nombre: "ChonccLover#LAS",
        amigo: null,
        icono: 4122,
        nivel: 320,
        rango: { tier: "EMERALD", division: "IV", lp: 12 },
        top4_pct: 52,
        partidas: 94,
        premade: 2,
      },
      {
        nombre: "TacticianPengu#LAS",
        amigo: null,
        icono: 3542,
        nivel: 215,
        rango: { tier: "EMERALD", division: "III", lp: 64 },
        top4_pct: 58,
        partidas: 140,
        premade: 2,
      },
      {
        nombre: "HyperRoller#LAS",
        amigo: null,
        icono: 538,
        nivel: 180,
        rango: { tier: "GOLD", division: "I", lp: 75 },
        top4_pct: 49,
        partidas: 65,
        premade: null,
      },
      {
        nombre: "DowsieCarry#LAS",
        amigo: null,
        icono: 1634,
        nivel: 410,
        rango: { tier: "DIAMOND", division: "IV", lp: 20 },
        top4_pct: 61,
        partidas: 210,
        premade: null,
      },
      {
        nombre: "Furyhorn#LAS",
        amigo: null,
        icono: 2090,
        nivel: 95,
        rango: null,
        top4_pct: null,
        partidas: 12,
        premade: null,
      },
      {
        nombre: "RiverSprite#LAS",
        amigo: null,
        icono: 7,
        nivel: 150,
        rango: { tier: "PLATINUM", division: "IV", lp: 15 },
        top4_pct: 48,
        partidas: 45,
        premade: null,
      },
    ],
  };
}

function enriquecerJugadorTft(jugador, amigos = []) {
  if (!jugador) return {};
  if (jugador.amigo) {
    const amigo = (amigos || []).find((a) => a && a.slug === jugador.amigo);
    if (amigo) {
      return {
        ...jugador,
        nombre: jugador.nombre || amigo.riot_id || amigo.nombre,
        icono: jugador.icono ?? amigo.perfil?.icono,
        nivel: jugador.nivel ?? amigo.perfil?.nivel,
        rango: jugador.rango ?? amigo.rangos?.ranked,
        top4_pct: jugador.top4_pct ?? amigo.estadisticas?.total?.top4_pct,
        partidas: jugador.partidas ?? amigo.estadisticas?.total?.partidas,
      };
    }
  }
  return jugador;
}

/**
 * "En partida" de TFT con diseño profesional inspirado en League:
 * Muestra el lobby completo en 2 columnas con avatar de perfil, nivel, división,
 * winrate/top 4 y distintivos de Dúo / Grupo para amigos y premades.
 */
export function SeccionEnPartidaTft({
  enVivo,
  disponible = true,
  amigos,
  ddragon,
  actualizadoMs,
  ahora,
  simular: simularProp,
  permitirSimular = false,
}) {
  const [simularEstado, setSimularEstado] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const search = window.location.search || "";
      const hash = window.location.hash || "";
      const query = search || (hash.includes("?") ? hash.slice(hash.indexOf("?")) : "");
      const params = new URLSearchParams(query);
      return params.get("envivo") === "1";
    } catch {
      return false;
    }
  });

  const simular = simularProp !== undefined ? simularProp : simularEstado;
  const puedeMostrarBoton = import.meta.env.MODE !== "test" || permitirSimular;

  const partidasReales = Array.isArray(enVivo) ? enVivo : [];
  const { nivel, minutos: antiguedad } = antiguedadDatos(actualizadoMs, ahora);
  const caduco = nivel === "caduco";
  const viejo = nivel === "viejo";

  const partidas = simular ? [crearPartidaSimuladaTft(amigos, ahora)] : partidasReales;
  const visibles = caduco && !simular ? [] : !disponible && !simular ? [] : partidas;
  const relojPartidas = viejo && !simular ? actualizadoMs : ahora;

  if (!disponible && !simular) {
    return (
      <section aria-labelledby="titulo-tft-en-partida">
        <div className="flex items-center justify-between">
          <TituloSeccion id="titulo-tft-en-partida">
            <span aria-hidden="true" className="text-texto-suave">
              ●
            </span>
            En partida
          </TituloSeccion>
          {puedeMostrarBoton && (
            <button
              type="button"
              onClick={() => setSimularEstado(true)}
              className="text-xs text-sapo hover:underline focus:outline-none"
              title="Previsualizar cómo se ve una partida activa"
            >
              👁️ Simular en vivo
            </button>
          )}
        </div>
        <p className="rounded-lg border border-dashed border-borde px-4 py-3 text-sm text-texto-suave" data-en-vivo-no-disponible="true">
          «Jugando ahora» no está disponible por el momento.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-tft-en-partida">
      <div className="flex items-center justify-between">
        <TituloSeccion id="titulo-tft-en-partida">
          <span aria-hidden="true" className={visibles.length && !viejo ? "led text-sapo" : "text-texto-suave"}>
            ●
          </span>
          En partida
          {visibles.length > 0 && <span className="cifras text-sm font-normal text-texto-suave">({visibles.length})</span>}
        </TituloSeccion>
        {simular ? (
          <button
            type="button"
            onClick={() => setSimularEstado(false)}
            className="text-xs text-derrota hover:underline focus:outline-none font-medium"
          >
            ✕ Quitar simulación
          </button>
        ) : puedeMostrarBoton && visibles.length === 0 ? (
          <button
            type="button"
            onClick={() => setSimularEstado(true)}
            className="text-xs text-sapo hover:underline focus:outline-none"
            title="Previsualizar cómo se ve una partida activa"
          >
            👁️ Simular en vivo
          </button>
        ) : null}
      </div>

      <div className="losa min-h-32 rounded-lg border p-2 sm:p-4">
        {simular && (
          <aside className="mb-3 flex items-center justify-between rounded border border-sapo/40 bg-sapo-fondo/50 px-3 py-1.5 text-xs text-sapo">
            <span>
              <strong>Modo de prueba:</strong> partida en vivo simulada para verificar diseño y visualización.
            </span>
            <button
              type="button"
              onClick={() => setSimularEstado(false)}
              className="ml-2 underline font-semibold text-texto hover:text-derrota"
            >
              Cerrar
            </button>
          </aside>
        )}

        {caduco && !simular ? (
          <AvisoAntiguedad>
            {antiguedad === null
              ? "No se sabe cuándo se consultó a Riot. No se puede saber quién está en partida ahora."
              : `Datos de ${haceCuanto(actualizadoMs, ahora)}. No se puede saber quién está en partida ahora.`}
          </AvisoAntiguedad>
        ) : visibles.length === 0 ? (
          <div className="flex min-h-24 flex-col items-center justify-center gap-2">
            <p className="text-texto-suave">Nadie en partida.</p>
            {viejo && <p className="cifras text-xs text-texto-suave">Datos de hace {antiguedad} min.</p>}
            {puedeMostrarBoton && (
              <button
                type="button"
                onClick={() => setSimularEstado(true)}
                className="rounded border border-borde bg-superficie px-2.5 py-1 text-xs text-sapo hover:bg-superficie-alta transition-colors"
              >
                👁️ Probar partida en vivo (simular)
              </button>
            )}
          </div>
        ) : (
          <>
            {viejo && !simular && (
              <p data-tono="aviso" className="canto mb-3 rounded-md py-2 pr-3 pl-4 text-sm text-sapo">
                <span aria-hidden="true" className="mr-1">
                  ⚠
                </span>
                Datos de hace <span className="cifras">{antiguedad}</span> min. Puede que estas partidas ya hayan
                terminado.
              </p>
            )}
            <ul className="flex flex-col gap-3" aria-label="Partidas en curso">
              {visibles.map((p, i) => (
                <li key={p.id ?? i} className="w-full min-w-0">
                  <PartidaEnVivoTft
                    partida={p}
                    amigos={amigos}
                    ddragon={ddragon}
                    actualizadoMs={actualizadoMs}
                    ahora={relojPartidas}
                    atenuada={viejo && !simular}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function PartidaEnVivoTft({ partida, ddragon, amigos, actualizadoMs, ahora, atenuada }) {
  const minutos = minutosEnPartida(partida, actualizadoMs, ahora);
  const quienes = nombresAmigos(partida.amigos, amigos);
  const rawJugadores = Array.isArray(partida.jugadores) ? partida.jugadores.filter((j) => j && typeof j === "object") : [];
  const jugadores = rawJugadores.map((j) => enriquecerJugadorTft(j, amigos));
  const textoMinutos =
    minutos === null ? "Tiempo desconocido" : `${minutos} min de partida${atenuada ? " (al consultar)" : ""}`;

  const amigosEnPartida = partida.amigos || [];
  const esDuoAmigos = amigosEnPartida.length === 2;
  const esGrupoAmigos = amigosEnPartida.length > 2;

  return (
    <article
      className={`w-full rounded-lg border border-sapo/35 bg-fondo/60 p-2.5 sm:p-3.5 ${atenuada ? "opacity-90 grayscale" : ""}`}
      data-atenuada={atenuada ? "true" : undefined}
    >
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <EtiquetaModo item={partida} />
        <span className="cifras inline-flex items-center gap-1.5 text-texto">
          {minutos !== null && !atenuada && (
            <span aria-hidden="true" className="led text-[0.625rem] leading-none text-sapo">
              ●
            </span>
          )}
          {textoMinutos}
        </span>
        {quienes && (
          <span className="min-w-0 truncate font-semibold text-sapo sm:ml-auto">
            {quienes}
          </span>
        )}
      </header>

      {jugadores.length === 0 ? (
        <p className="text-sm text-texto-suave">No hay datos del lobby.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2" aria-label="Jugadores del lobby">
          {jugadores.map((j, i) => (
            <FilaJugadorEnVivoTft
              key={`${j.nombre}-${i}`}
              jugador={j}
              ddragon={ddragon}
              esDuoAmigos={esDuoAmigos}
              esGrupoAmigos={esGrupoAmigos}
            />
          ))}
        </ul>
      )}
    </article>
  );
}

function FilaJugadorEnVivoTft({ jugador, ddragon, esDuoAmigos, esGrupoAmigos }) {
  const esAmigo = Boolean(jugador.amigo);
  const nombre = typeof jugador.nombre === "string" && jugador.nombre ? jugador.nombre : "Jugador oculto";
  const iconoUrl = urlIconoPerfil(ddragon, jugador.icono);
  const tier = nombreRango(jugador.rango);
  const lp = typeof jugador.rango?.lp === "number" ? jugador.rango.lp : null;
  const textoRango = textoRangoLp(jugador.rango);
  const tieneStats = esNumero(jugador.top4_pct);

  // Distintivo de premade / duo
  let etiquetaPremade = null;
  let estiloPremade = "";
  if (esAmigo) {
    if (esDuoAmigos) {
      etiquetaPremade = "Dúo";
      estiloPremade = "bg-sapo/20 text-sapo border border-sapo/40";
    } else if (esGrupoAmigos) {
      etiquetaPremade = "Grupo";
      estiloPremade = "bg-sapo/20 text-sapo border border-sapo/40";
    } else {
      etiquetaPremade = "Amigo";
      estiloPremade = "bg-sapo/20 text-sapo border border-sapo/40";
    }
  } else if (jugador.premade === 2) {
    etiquetaPremade = "Dúo aliado";
    estiloPremade = "bg-sky-900/60 text-sky-300 border border-sky-600/50";
  }

  const bordeEstilo = esAmigo
    ? "border-l-4 border-l-sapo bg-sapo-fondo/80 shadow-xs"
    : jugador.premade === 2
      ? "border-l-4 border-l-sky-400 bg-sky-950/20"
      : "border-l-4 border-l-transparent bg-superficie/50 hover:bg-superficie/80";

  return (
    <li
      className={`grid h-12.5 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-2.5 px-2.5 rounded transition-colors ${bordeEstilo}`}
      data-amigo={esAmigo ? "true" : undefined}
    >
      {/* 1. Avatar con nivel */}
      <div className="relative size-9 shrink-0">
        {iconoUrl ? (
          <img
            src={iconoUrl}
            alt={`Ícono de ${nombre}`}
            width={36}
            height={36}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`size-9 rounded-md border border-borde/70 object-cover ${
              esAmigo ? "ring-2 ring-sapo ring-offset-1 ring-offset-fondo" : ""
            }`}
          />
        ) : (
          <span
            role="img"
            aria-label={`Ícono de ${nombre}`}
            className={`flex size-9 items-center justify-center rounded-md border text-xs font-bold ${
              esAmigo
                ? "border-sapo bg-sapo-fondo text-sapo ring-2 ring-sapo ring-offset-1 ring-offset-fondo"
                : "border-borde bg-superficie text-texto-suave"
            }`}
          >
            {iniciales(nombre)}
          </span>
        )}
        {esNumero(jugador.nivel) && jugador.nivel > 0 && (
          <span
            className="absolute -bottom-1 -right-1 rounded-full border border-borde bg-fondo px-1 text-[9px] leading-3 font-semibold text-texto-suave"
            title={`Nivel ${jugador.nivel}`}
          >
            {jugador.nivel}
          </span>
        )}
      </div>

      {/* 2. Nombre e insignia */}
      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`truncate text-sm ${esAmigo ? "font-semibold text-sapo" : "font-medium text-texto"}`}
            title={nombre}
          >
            {nombre}
          </span>
          {etiquetaPremade && (
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wide ${estiloPremade}`}
            >
              {etiquetaPremade}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-texto-suave truncate">
          <span>{esAmigo ? "Invocador del grupo" : "Rival"}</span>
          {esAmigo && <span className="sr-only"> (del grupo)</span>}
        </div>
      </div>

      {/* 3. División / Rango y Top 4 % */}
      <div className="min-w-0 text-right text-xs leading-tight">
        <div className={`cifras flex items-center justify-end gap-1 ${textoRango ? "font-semibold text-texto" : "text-texto-suave"}`}>
          <span className="truncate" title={textoRango ?? "Sin clasificar"}>
            {tier ? (
              <>
                {tier}
                {lp !== null && <span className="hidden sm:inline font-normal text-texto-suave"> · {lp} LP</span>}
              </>
            ) : (
              "Sin clasificar"
            )}
          </span>
        </div>
        {tieneStats && (
          <span className="cifras hidden truncate text-texto-suave sm:block text-[11px] mt-0.5">
            <span className={`font-semibold ${claseWinrate(jugador.top4_pct)}`}>
              {jugador.top4_pct}% top 4
            </span>
            {esNumero(jugador.partidas) && jugador.partidas > 0 && ` · ${jugador.partidas} pts`}
          </span>
        )}
      </div>
    </li>
  );
}
