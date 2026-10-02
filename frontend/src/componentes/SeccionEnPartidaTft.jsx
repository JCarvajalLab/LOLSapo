import { antiguedadDatos } from "../logica/antiguedad.js";
import { haceCuanto } from "../logica/formato.js";
import { minutosEnPartida, nombresAmigos } from "../logica/partidas.js";
import { EtiquetaModo } from "./Etiquetas.jsx";
import { AvisoAntiguedad } from "./SeccionEnPartida.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

/**
 * "En partida" de TFT, con la misma lógica de antigüedad que League:
 * más de 15 min atenúa y congela los minutos; más de 60 min oculta las partidas.
 * Si el recolector no pudo consultar partidas en vivo (`disponible` en false),
 * solo se muestra una línea discreta.
 */
export function SeccionEnPartidaTft({ enVivo, disponible = true, amigos, actualizadoMs, ahora }) {
  const partidas = Array.isArray(enVivo) ? enVivo : [];
  const { nivel, minutos: antiguedad } = antiguedadDatos(actualizadoMs, ahora);
  const caduco = nivel === "caduco";
  const viejo = nivel === "viejo";
  const visibles = caduco || !disponible ? [] : partidas;
  const relojPartidas = viejo ? actualizadoMs : ahora;

  if (!disponible) {
    return (
      <section aria-labelledby="titulo-tft-en-partida">
        <TituloSeccion id="titulo-tft-en-partida">
          <span aria-hidden="true" className="text-texto-suave">
            ●
          </span>
          En partida
        </TituloSeccion>
        <p className="text-sm text-texto-suave" data-en-vivo-no-disponible="true">
          «Jugando ahora» no está disponible por el momento.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-tft-en-partida">
      <TituloSeccion id="titulo-tft-en-partida">
        <span aria-hidden="true" className={visibles.length && !viejo ? "text-sapo" : "text-texto-suave"}>
          ●
        </span>
        En partida
        {visibles.length > 0 && <span className="cifras text-sm font-normal text-texto-suave">({visibles.length})</span>}
      </TituloSeccion>
      <div className="min-h-32 rounded-lg border border-borde bg-superficie p-2 sm:p-4">
        {caduco ? (
          <AvisoAntiguedad>
            {antiguedad === null
              ? "No se sabe cuándo se consultó a Riot. No se puede saber quién está en partida ahora."
              : `Datos de ${haceCuanto(actualizadoMs, ahora)}. No se puede saber quién está en partida ahora.`}
          </AvisoAntiguedad>
        ) : visibles.length === 0 ? (
          <div className="flex min-h-24 flex-col items-center justify-center gap-1">
            <p className="text-texto-suave">Nadie en partida.</p>
            {viejo && <p className="cifras text-xs text-texto-suave">Datos de hace {antiguedad} min.</p>}
          </div>
        ) : (
          <>
            {viejo && (
              <p className="mb-3 rounded-md border border-sapo/40 bg-sapo-fondo px-3 py-2 text-sm text-sapo">
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

function PartidaEnVivoTft({ partida, amigos, actualizadoMs, ahora, atenuada }) {
  const minutos = minutosEnPartida(partida, actualizadoMs, ahora);
  const quienes = nombresAmigos(partida.amigos, amigos);
  const jugadores = Array.isArray(partida.jugadores) ? partida.jugadores.filter((j) => j && typeof j === "object") : [];
  const textoMinutos =
    minutos === null ? "Tiempo desconocido" : `${minutos} min de partida${atenuada ? " (al consultar)" : ""}`;

  return (
    <article
      className={`w-full rounded-md border border-sapo/40 bg-fondo/40 p-2 sm:p-3 ${atenuada ? "opacity-90 grayscale" : ""}`}
      data-atenuada={atenuada ? "true" : undefined}
    >
      <header className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <EtiquetaModo item={partida} />
        <span aria-hidden="true" className="hidden text-texto-suave sm:inline">
          ·
        </span>
        <span className="cifras text-texto-suave">{textoMinutos}</span>
        {quienes && (
          <>
            <span aria-hidden="true" className="hidden text-texto-suave sm:inline">
              ·
            </span>
            <span className="min-w-0 truncate font-semibold text-sapo">{quienes}</span>
          </>
        )}
      </header>
      {jugadores.length === 0 ? (
        <p className="text-sm text-texto-suave">No hay datos del lobby.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4" aria-label="Jugadores del lobby">
          {jugadores.map((j, i) => {
            const esAmigo = Boolean(j.amigo);
            const nombre = typeof j.nombre === "string" && j.nombre ? j.nombre : "Jugador oculto";
            return (
              <li
                key={`${nombre}-${i}`}
                className={`flex h-8 min-w-0 items-center rounded px-2 text-sm ${
                  esAmigo ? "bg-sapo-fondo font-semibold text-sapo" : "bg-superficie text-texto-suave"
                }`}
                data-amigo={esAmigo ? "true" : undefined}
              >
                <span className="min-w-0 truncate" title={nombre}>
                  {nombre}
                </span>
                {esAmigo && <span className="sr-only"> (del grupo)</span>}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
