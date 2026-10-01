import { nombreCampeon, urlCampeon } from "../logica/ddragon.js";
import { equiposEnVivo, minutosEnPartida, nombreEquipo } from "../logica/partidas.js";
import { EtiquetaModo } from "./Etiquetas.jsx";
import { IconoConSaco } from "./IconoConSaco.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

/**
 * Panel "En partida": siempre ocupa el mismo espacio mínimo.
 * Sin partidas muestra un texto centrado; con partidas, una tarjeta por partida.
 */
export function SeccionEnPartida({ enVivo, ddragon, actualizadoMs, ahora }) {
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
      <div className="min-h-32 rounded-lg border border-borde bg-superficie p-3 sm:p-4">
        {partidas.length === 0 ? (
          <p className="flex min-h-24 items-center justify-center text-texto-suave">Nadie en partida.</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {partidas.map((p, i) => (
              <li key={p.id ?? i} className="min-w-0">
                <PartidaEnVivo partida={p} ddragon={ddragon} actualizadoMs={actualizadoMs} ahora={ahora} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PartidaEnVivo({ partida, ddragon, actualizadoMs, ahora }) {
  const minutos = minutosEnPartida(partida, actualizadoMs, ahora);
  const equipos = equiposEnVivo(partida);
  // Dos equipos: dos columnas iguales. Arena u otros: columnas automáticas del mismo ancho.
  const columnas =
    equipos.length === 2 ? "grid-cols-2" : "grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]";
  return (
    <article className="h-full rounded-md border border-sapo/40 bg-fondo/40 p-3">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <EtiquetaModo item={partida} />
        <span className="cifras text-texto-suave">
          {minutos === null ? "Tiempo desconocido" : `${minutos} min de partida`}
        </span>
      </header>
      {equipos.length === 0 ? (
        <p className="text-sm text-texto-suave">No hay datos de los equipos.</p>
      ) : (
        <div className={`grid gap-x-3 gap-y-3 ${columnas}`}>
          {equipos.map((eq, i) => (
            <div key={eq.equipo} className="min-w-0">
              <h3 className="mb-1 h-5 text-xs text-texto-suave">{nombreEquipo(eq.equipo, i)}</h3>
              <ul className="space-y-1">
                {eq.jugadores.map((j, k) => (
                  <JugadorEnVivo key={`${j.campeon_id}-${k}`} jugador={j} ddragon={ddragon} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function JugadorEnVivo({ jugador, ddragon }) {
  const campeon = nombreCampeon(ddragon, jugador.campeon_id);
  const esAmigo = Boolean(jugador.amigo);
  const nombre = typeof jugador.nombre === "string" && jugador.nombre ? jugador.nombre : null;
  return (
    <li
      className={`flex h-9 min-w-0 items-center gap-2 rounded px-1 ${esAmigo ? "bg-sapo-fondo" : ""}`}
      data-amigo={esAmigo ? "true" : undefined}
    >
      <IconoConSaco src={urlCampeon(ddragon, jugador.campeon_id)} alt={campeon} tamaño={24} enPartida={esAmigo} />
      <span className="min-w-0 text-sm leading-tight">
        {nombre ? (
          <>
            <span className={`block truncate ${esAmigo ? "font-semibold text-sapo" : ""}`}>{nombre}</span>
            <span className="block truncate text-xs text-texto-suave">{campeon}</span>
          </>
        ) : (
          <span className={`block truncate ${esAmigo ? "font-semibold text-sapo" : ""}`}>{campeon}</span>
        )}
        {esAmigo && <span className="sr-only"> (del grupo)</span>}
      </span>
    </li>
  );
}
