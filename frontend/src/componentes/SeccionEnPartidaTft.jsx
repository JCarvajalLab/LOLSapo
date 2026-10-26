import { useState } from "react";
import { antiguedadDatos } from "../logica/antiguedad.js";
import { haceCuanto } from "../logica/formato.js";
import { minutosEnPartida, nombresAmigos } from "../logica/partidas.js";
import { EtiquetaModo } from "./Etiquetas.jsx";
import { AvisoAntiguedad } from "./SeccionEnPartida.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

function crearPartidaSimuladaTft(amigos = [], ahora = Date.now()) {
  const amigo1 = amigos[0]?.slug ?? "iskrat-las";
  const nombre1 = amigos[0]?.nombre ?? "ISkrat";
  const amigo2 = amigos[1]?.slug ?? "nic-las";
  const nombre2 = amigos[1]?.nombre ?? "Nic";

  return {
    id: 999999991,
    queue_id: 1100,
    modo: "Clasificatoria",
    categoria: "ranked",
    inicio: (ahora || Date.now()) - 16 * 60 * 1000,
    duracion: 16 * 60,
    amigos: [amigo1, amigo2],
    jugadores: [
      { nombre: nombre1, amigo: amigo1 },
      { nombre: nombre2, amigo: amigo2 },
      { nombre: "ChonccLover#LAS", amigo: null },
      { nombre: "TacticianPengu#LAS", amigo: null },
      { nombre: "HyperRoller#LAS", amigo: null },
      { nombre: "DowsieCarry#LAS", amigo: null },
      { nombre: "Furyhorn#LAS", amigo: null },
      { nombre: "RiverSprite#LAS", amigo: null },
    ],
  };
}

/**
 * "En partida" de TFT, con la misma lógica de antigüedad que League:
 * más de 15 min atenúa y congela los minutos; más de 60 min oculta las partidas.
 * Si el recolector no pudo consultar partidas en vivo (`disponible` en false),
 * solo se muestra una línea discreta, pero permite activar simulación de prueba en local.
 */
export function SeccionEnPartidaTft({
  enVivo,
  disponible = true,
  amigos,
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

function PartidaEnVivoTft({ partida, amigos, actualizadoMs, ahora, atenuada }) {
  const minutos = minutosEnPartida(partida, actualizadoMs, ahora);
  const quienes = nombresAmigos(partida.amigos, amigos);
  const jugadores = Array.isArray(partida.jugadores) ? partida.jugadores.filter((j) => j && typeof j === "object") : [];
  const textoMinutos =
    minutos === null ? "Tiempo desconocido" : `${minutos} min de partida${atenuada ? " (al consultar)" : ""}`;

  return (
    <article
      className={`w-full rounded-lg border border-sapo/35 bg-fondo/60 p-2 sm:p-3 ${atenuada ? "opacity-90 grayscale" : ""}`}
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
