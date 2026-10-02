import { nombreCampeon, nombreHechizo, nombreRuna, urlCampeon, urlHechizo, urlRuna } from "../logica/ddragon.js";
import { textoRangoLp } from "../logica/formato.js";
import { equiposEnVivo, minutosEnPartida, nombreEquipo, nombresAmigos } from "../logica/partidas.js";
import { EtiquetaModo } from "./Etiquetas.jsx";
import { IconoConSaco } from "./IconoConSaco.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

/*
  Grilla de cada jugador, igual en todas las filas y en ambos equipos:
  [campeón] [2 hechizos] [runas] [Riot ID / campeón] [rango]
  En móvil se ocultan las runas y el rango usa el ancho que necesita.
*/
const GRILLA_JUGADOR =
  "grid h-12 grid-cols-[2.25rem_1.125rem_minmax(0,1fr)_auto] items-center gap-x-2 px-2 " +
  "sm:grid-cols-[2.5rem_1.125rem_1.125rem_minmax(0,1fr)_9.5rem]";

const ACENTOS = {
  100: { borde: "border-t-ranked/60", texto: "text-ranked" },
  200: { borde: "border-t-derrota/50", texto: "text-derrota/80" },
};

/**
 * Panel "En partida": siempre ocupa el mismo espacio mínimo.
 * Sin partidas muestra un texto centrado; con partidas, una tarjeta de ancho completo por partida.
 */
export function SeccionEnPartida({ enVivo, ddragon, amigos, actualizadoMs, ahora }) {
  const partidas = Array.isArray(enVivo) ? enVivo : [];
  return (
    <section aria-labelledby="titulo-en-partida">
      <TituloSeccion id="titulo-en-partida">
        <span aria-hidden="true" className={partidas.length ? "text-sapo" : "text-texto-suave"}>
          ●
        </span>
        En partida
        {partidas.length > 0 && <span className="cifras text-sm font-normal text-texto-suave">({partidas.length})</span>}
      </TituloSeccion>
      <div className="min-h-32 rounded-lg border border-borde bg-superficie p-2 sm:p-4">
        {partidas.length === 0 ? (
          <p className="flex min-h-24 items-center justify-center text-texto-suave">Nadie en partida.</p>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Partidas en curso">
            {partidas.map((p, i) => (
              <li key={p.id ?? i} className="w-full min-w-0">
                <PartidaEnVivo
                  partida={p}
                  ddragon={ddragon}
                  amigos={amigos}
                  actualizadoMs={actualizadoMs}
                  ahora={ahora}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PartidaEnVivo({ partida, ddragon, amigos, actualizadoMs, ahora }) {
  const minutos = minutosEnPartida(partida, actualizadoMs, ahora);
  const equipos = equiposEnVivo(partida);
  const quienes = nombresAmigos(partida.amigos, amigos);
  const columnas =
    equipos.length > 2 ? "grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]" : "md:grid-cols-2";

  return (
    <article className="w-full rounded-md border border-sapo/40 bg-fondo/40 p-2 sm:p-3">
      <header className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <EtiquetaModo item={partida} />
        <span aria-hidden="true" className="text-texto-suave">
          ·
        </span>
        <span className="cifras text-texto-suave">
          {minutos === null ? "Tiempo desconocido" : `${minutos} min de partida`}
        </span>
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
            <Equipo key={eq.equipo} equipo={eq} indice={i} ddragon={ddragon} />
          ))}
        </div>
      )}
    </article>
  );
}

function Equipo({ equipo, indice, ddragon }) {
  const acento = ACENTOS[equipo.equipo] ?? { borde: "border-t-borde", texto: "text-texto-suave" };
  const nombre = nombreEquipo(equipo.equipo, indice);
  return (
    <div className={`min-w-0 border-t-2 pt-2 ${acento.borde}`}>
      <h3 className={`mb-1 px-2 text-xs font-semibold ${acento.texto}`}>{nombre}</h3>
      <ul className="space-y-1" aria-label={`Jugadores del ${nombre.toLowerCase()}`}>
        {equipo.jugadores.map((j, k) => (
          <JugadorEnVivo key={`${j.campeon_id}-${k}`} jugador={j} ddragon={ddragon} />
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

function JugadorEnVivo({ jugador, ddragon }) {
  const campeon = nombreCampeon(ddragon, jugador.campeon_id);
  const esAmigo = Boolean(jugador.amigo);
  const nombre = typeof jugador.nombre === "string" && jugador.nombre ? jugador.nombre : null;
  const hechizos = Array.isArray(jugador.hechizos) ? jugador.hechizos.slice(0, 2) : [];
  const runas = jugador.runas && typeof jugador.runas === "object" ? jugador.runas : {};
  const rango = textoRangoLp(jugador.rango);

  return (
    <li
      className={`${GRILLA_JUGADOR} rounded ${esAmigo ? "bg-sapo-fondo" : ""}`}
      data-amigo={esAmigo ? "true" : undefined}
    >
      <IconoConSaco src={urlCampeon(ddragon, jugador.campeon_id)} alt={campeon} tamaño={36} enPartida={esAmigo} />

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

      <span className="min-w-0 leading-tight">
        <span className={`block truncate text-sm ${esAmigo ? "font-semibold text-sapo" : ""}`} title={nombre ?? campeon}>
          {nombre ?? campeon}
        </span>
        <span className="block truncate text-xs text-texto-suave">{nombre ? campeon : "Modo streamer"}</span>
        {esAmigo && <span className="sr-only"> (del grupo)</span>}
      </span>

      <span className={`cifras truncate text-right text-xs ${rango ? "" : "text-texto-suave"}`}>
        {rango ?? "Sin clasificar"}
      </span>
    </li>
  );
}
