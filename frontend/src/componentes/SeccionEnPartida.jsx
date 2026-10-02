import { nombreCampeon, nombreHechizo, nombreRuna, urlCampeon, urlHechizo, urlRuna } from "../logica/ddragon.js";
import { antiguedadDatos } from "../logica/antiguedad.js";
import {
  claseWinrate,
  formatearWinrate,
  haceCuanto,
  temporadaRanked,
  textoMaestria,
  nombreRango,
  textoRangoLp,
} from "../logica/formato.js";
import { equiposEnVivo, minutosEnPartida, nombreEquipo, nombresAmigos } from "../logica/partidas.js";
import { EtiquetaModo } from "./Etiquetas.jsx";
import { IconoConSaco } from "./IconoConSaco.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

/*
  Grilla de cada jugador, igual en todas las filas y en ambos equipos:
  [campeón] [2 hechizos] [runas] [Riot ID / campeón · maestría] [rango y racha / winrate de la temporada]
  En móvil se ocultan las runas, la línea de winrate, los LP y los puntos de maestría.
*/
const GRILLA_JUGADOR =
  "grid h-12 grid-cols-[2.25rem_1.125rem_minmax(0,1fr)_auto] items-center gap-x-2 px-2 " +
  "sm:grid-cols-[2.5rem_1.125rem_1.125rem_minmax(0,1fr)_10.5rem]";

const ACENTOS = {
  100: { borde: "border-t-ranked/60", texto: "text-ranked" },
  200: { borde: "border-t-derrota/50", texto: "text-derrota/80" },
};

/**
 * Panel "En partida": siempre ocupa el mismo espacio mínimo.
 * Sin partidas muestra un texto centrado; con partidas, una tarjeta de ancho completo por partida.
 * Según la antigüedad de `actualizado`:
 * - más de 15 min: aviso, tarjetas atenuadas y minutos congelados "al consultar";
 * - más de 60 min: solo el aviso, sin tarjetas.
 */
export function SeccionEnPartida({ enVivo, ddragon, amigos, actualizadoMs, ahora }) {
  const partidas = Array.isArray(enVivo) ? enVivo : [];
  const { nivel, minutos: antiguedad } = antiguedadDatos(actualizadoMs, ahora);
  const caduco = nivel === "caduco";
  const viejo = nivel === "viejo";
  const visibles = caduco ? [] : partidas;
  // Con datos viejos, los minutos se congelan en el momento de la consulta.
  const relojPartidas = viejo ? actualizadoMs : ahora;

  return (
    <section aria-labelledby="titulo-en-partida">
      <TituloSeccion id="titulo-en-partida">
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
                  <PartidaEnVivo
                    partida={p}
                    ddragon={ddragon}
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

function AvisoAntiguedad({ children }) {
  return (
    <p className="flex min-h-24 items-center justify-center px-2 text-center text-sm text-sapo">
      <span aria-hidden="true" className="mr-2">
        ⚠
      </span>
      {children}
    </p>
  );
}

function PartidaEnVivo({ partida, ddragon, amigos, actualizadoMs, ahora, atenuada }) {
  const minutos = minutosEnPartida(partida, actualizadoMs, ahora);
  const equipos = equiposEnVivo(partida);
  const quienes = nombresAmigos(partida.amigos, amigos);
  const columnas =
    equipos.length > 2 ? "grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]" : "md:grid-cols-2";
  const textoMinutos =
    minutos === null ? "Tiempo desconocido" : `${minutos} min de partida${atenuada ? " (al consultar)" : ""}`;

  return (
    <article
      className={`w-full rounded-md border border-sapo/40 bg-fondo/40 p-2 sm:p-3 ${atenuada ? "opacity-60" : ""}`}
      data-atenuada={atenuada ? "true" : undefined}
    >
      <header className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <EtiquetaModo item={partida} />
        <span aria-hidden="true" className="text-texto-suave">
          ·
        </span>
        <span className="cifras text-texto-suave">{textoMinutos}</span>
        {quienes && (
          <>
            <span aria-hidden="true" className="text-texto-suave">
              ·
            </span>
            <span className="min-w-0 truncate font-semibold text-sapo">{quienes}</span>
          </>
        )}
      </header>
      {equipos.length === 0 ? (
        <p className="text-sm text-texto-suave">No hay datos de los equipos.</p>
      ) : (
        <div className={`grid gap-4 ${columnas}`}>
          {equipos.map((eq, i) => (
            <Equipo key={eq.equipo} equipo={eq} indice={i} ddragon={ddragon} sinAnillo={atenuada} />
          ))}
        </div>
      )}
    </article>
  );
}

function Equipo({ equipo, indice, ddragon, sinAnillo }) {
  const acento = ACENTOS[equipo.equipo] ?? { borde: "border-t-borde", texto: "text-texto-suave" };
  const nombre = nombreEquipo(equipo.equipo, indice);
  return (
    <div className={`min-w-0 border-t-2 pt-2 ${acento.borde}`}>
      <h3 className={`mb-1 px-2 text-xs font-semibold ${acento.texto}`}>{nombre}</h3>
      <ul className="space-y-1" aria-label={`Jugadores del ${nombre.toLowerCase()}`}>
        {equipo.jugadores.map((j, k) => (
          <JugadorEnVivo key={`${j.campeon_id}-${k}`} jugador={j} ddragon={ddragon} sinAnillo={sinAnillo} />
        ))}
      </ul>
      {equipo.bloqueos.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1 px-2 text-xs text-texto-suave">
          <span className="mr-1">Baneos:</span>
          <ul className="flex flex-wrap gap-1" aria-label={`Baneos del ${nombre.toLowerCase()}`}>
            {equipo.bloqueos.map((id, k) => (
              <li key={`${id}-${k}`}>
                <ImagenDD
                  src={urlCampeon(ddragon, id)}
                  alt={nombreCampeon(ddragon, id)}
                  tamaño={22}
                  className="opacity-75 grayscale"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function JugadorEnVivo({ jugador, ddragon, sinAnillo }) {
  const campeon = nombreCampeon(ddragon, jugador.campeon_id);
  const esAmigo = Boolean(jugador.amigo);
  const nombre = typeof jugador.nombre === "string" && jugador.nombre ? jugador.nombre : null;
  const hechizos = Array.isArray(jugador.hechizos) ? jugador.hechizos.slice(0, 2) : [];
  const runas = jugador.runas && typeof jugador.runas === "object" ? jugador.runas : {};
  // Texto completo para lectores y title; en móvil se ocultan los LP para que quepa la fila.
  const rango = textoRangoLp(jugador.rango);
  const tier = nombreRango(jugador.rango);
  const lp = typeof jugador.rango?.lp === "number" ? jugador.rango.lp : 0;
  const temporada = rango ? temporadaRanked(jugador.rango) : null;
  const maestria = textoMaestria(jugador.maestria);

  return (
    <li
      className={`${GRILLA_JUGADOR} rounded ${esAmigo ? "bg-sapo-fondo" : ""}`}
      data-amigo={esAmigo ? "true" : undefined}
    >
      <IconoConSaco src={urlCampeon(ddragon, jugador.campeon_id)} alt={campeon} tamaño={36} enPartida={esAmigo && !sinAnillo} />

      <span className="flex flex-col gap-0.5">
        {[0, 1].map((i) =>
          hechizos[i] !== undefined ? (
            <ImagenDD
              key={i}
              src={urlHechizo(ddragon, hechizos[i])}
              alt={nombreHechizo(ddragon, hechizos[i])}
              tamaño={18}
            />
          ) : (
            <span key={i} className="block h-[18px] w-[18px] rounded-md bg-fondo/60" aria-hidden="true" />
          ),
        )}
      </span>

      <span className="hidden flex-col items-center gap-0.5 sm:flex">
        {runas.principal ? (
          <ImagenDD src={urlRuna(ddragon, runas.principal)} alt={nombreRuna(ddragon, runas.principal)} tamaño={18} redonda />
        ) : (
          <span className="block h-[18px] w-[18px]" aria-hidden="true" />
        )}
        {runas.secundaria ? (
          <ImagenDD
            src={urlRuna(ddragon, runas.secundaria)}
            alt={nombreRuna(ddragon, runas.secundaria)}
            tamaño={16}
            redonda
          />
        ) : (
          <span className="block h-4 w-4" aria-hidden="true" />
        )}
      </span>

      <span className="min-w-0 overflow-hidden leading-tight">
        <span className={`block truncate text-sm ${esAmigo ? "font-semibold text-sapo" : ""}`} title={nombre ?? campeon}>
          {nombre ?? campeon}
        </span>
        <span className="flex min-w-0 gap-1 text-xs text-texto-suave">
          <span className="min-w-0 truncate">{nombre ? campeon : "Modo streamer"}</span>
          {maestria && (
            <span className="cifras shrink-0 whitespace-nowrap" title={maestria.titulo} data-maestria="true">
              <span aria-hidden="true">· </span>
              {maestria.primeraVez ? (
                <span className="italic">{maestria.corto}</span>
              ) : (
                <span className="text-texto">
                  {maestria.nivel}
                  <span className="hidden sm:inline"> · {maestria.puntos}</span>
                </span>
              )}
              <span className="sr-only"> ({maestria.titulo})</span>
            </span>
          )}
        </span>
        {esAmigo && <span className="sr-only"> (del grupo)</span>}
      </span>

      <span className="min-w-0 text-right text-xs leading-tight">
        <span className={`cifras flex items-center justify-end gap-1 ${rango ? "" : "text-texto-suave"}`}>
          {jugador.rango?.racha === true && rango && (
            <span role="img" aria-label="En racha de victorias" title="En racha de victorias" className="shrink-0">
              🔥
            </span>
          )}
          <span className="truncate" title={rango ?? undefined} data-rango="true">
            {tier ? (
              <>
                {tier}
                <span className="hidden sm:inline"> · {lp} LP</span>
              </>
            ) : (
              "Sin clasificar"
            )}
          </span>
        </span>
        {temporada && (
          <span className="cifras hidden truncate text-texto-suave sm:block" data-winrate="true">
            <span className={`font-semibold ${claseWinrate(temporada.winrate)}`}>
              {formatearWinrate(temporada.winrate)}
            </span>{" "}
            · {temporada.partidas} {temporada.partidas === 1 ? "partida" : "partidas"}
          </span>
        )}
      </span>
    </li>
  );
}
