import { antiguedadDatos } from "../logica/antiguedad.js";
import { urlIconoPerfil } from "../logica/ddragon.js";
import { claseWinrate, esNumero, haceCuanto, iniciales, nombreRango, textoRangoLp } from "../logica/formato.js";
import { minutosEnPartida, nombresAmigos } from "../logica/partidas.js";
import { EtiquetaModo } from "./Etiquetas.jsx";
import { AvisoAntiguedad } from "./SeccionEnPartida.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

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
        // Usar siempre el rango de TFT del amigo si está disponible (ranked de TFT)
        rango: amigo.rangos && amigo.rangos.ranked !== undefined ? amigo.rangos.ranked : jugador.rango,
        top4_pct: jugador.top4_pct ?? amigo.estadisticas?.total?.top4_pct,
        partidas: jugador.partidas ?? amigo.estadisticas?.total?.partidas,
      };
    }
  }
  return jugador;
}

/**
 * "En partida" de TFT con diseño profesional inspirado en League:
 * Muestra el lobby completo en 2 columnas con avatar de perfil, nivel, división de TFT,
 * winrate/top 4 y distintivos de Dúo / Grupo para amigos y premades.
 */
export function SeccionEnPartidaTft({
  enVivo,
  disponible = true,
  amigos,
  ddragon,
  actualizadoMs,
  ahora,
}) {
  const partidas = Array.isArray(enVivo) ? enVivo : [];
  const { nivel, minutos: antiguedad } = antiguedadDatos(actualizadoMs, ahora);
  const caduco = nivel === "caduco";
  const viejo = nivel === "viejo";

  const visibles = caduco ? [] : !disponible ? [] : partidas;
  const relojPartidas = viejo ? actualizadoMs : ahora;
  const amigosJugando = (amigos || []).filter((a) => a && a.jugando);

  if (!disponible) {
    return (
      <section aria-labelledby="titulo-tft-en-partida">
        <TituloSeccion id="titulo-tft-en-partida">
          <span aria-hidden="true" className="text-texto-suave">
            ●
          </span>
          En partida
        </TituloSeccion>
        <div className="rounded-lg border border-dashed border-borde px-4 py-3 text-sm text-texto-suave" data-en-vivo-no-disponible="true">
          <p>«Jugando ahora» no está disponible por el momento.</p>
          <p className="mt-1 text-xs text-texto-suave/80">
            El seguimiento en vivo requiere permisos de espectador en la API de Riot (se activará con la clave definitiva de TFT). Si algún amigo juega, su partida se registrará al finalizar.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-tft-en-partida">
      <TituloSeccion id="titulo-tft-en-partida">
        <span
          aria-hidden="true"
          className={(visibles.length > 0 || amigosJugando.length > 0) && !viejo ? "led text-sapo" : "text-texto-suave"}
        >
          ●
        </span>
        En partida
        {visibles.length > 0 && <span className="cifras text-sm font-normal text-texto-suave">({visibles.length})</span>}
      </TituloSeccion>

      <div className="losa min-h-32 rounded-lg border p-2 sm:p-4">
        {caduco ? (
          <AvisoAntiguedad>
            {antiguedad === null
              ? "No se sabe cuándo se consultó a Riot. No se puede saber quién está en partida ahora."
              : `Datos de ${haceCuanto(actualizadoMs, ahora)}. No se puede saber quién está en partida ahora.`}
          </AvisoAntiguedad>
        ) : visibles.length === 0 ? (
          <div className="flex min-h-24 flex-col items-center justify-center gap-1.5 px-4 text-center">
            {amigosJugando.length > 0 ? (
              <>
                <p className="text-sm font-medium text-sapo">
                  🎮 {nombresAmigos(amigosJugando.map((a) => a.slug), amigos)} {amigosJugando.length === 1 ? "está" : "están"} en partida de TFT
                </p>
                <p className="max-w-md text-xs text-texto-suave">
                  No se pudo cargar el lobby completo debido a limitaciones temporales de la API de espectador de Riot. La partida se guardará al terminar.
                </p>
              </>
            ) : (
              <>
                <p className="text-texto-suave">Nadie en partida.</p>
                {viejo && <p className="cifras text-xs text-texto-suave">Datos de hace {antiguedad} min.</p>}
              </>
            )}
          </div>
        ) : (
          <>
            {viejo && (
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
                    atenuada={viejo}
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
