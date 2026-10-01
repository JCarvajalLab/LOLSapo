import { nombreCampeon, urlCampeon } from "../logica/ddragon.js";
import { equiposEnVivo, minutosEnPartida, nombreEquipo } from "../logica/partidas.js";
import { EtiquetaModo } from "./Etiquetas.jsx";
import { IconoConSaco } from "./IconoConSaco.jsx";

/** Sección "En partida": una tarjeta por partida en curso, con los equipos completos. */
export function SeccionEnPartida({ enVivo, ddragon, actualizadoMs, ahora }) {
  const partidas = Array.isArray(enVivo) ? enVivo : [];
  return (
    <section aria-labelledby="titulo-en-partida" className="space-y-3">
      <h2 id="titulo-en-partida" className="flex items-center gap-2 font-titulo text-lg font-bold">
        <span aria-hidden="true" className={partidas.length ? "text-sapo" : "text-texto-suave"}>
          ●
        </span>
        En partida
      </h2>
      {partidas.length === 0 ? (
        <p className="text-texto-suave">Nadie en partida.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {partidas.map((p, i) => (
            <li key={p.id ?? i}>
              <PartidaEnVivo partida={p} ddragon={ddragon} actualizadoMs={actualizadoMs} ahora={ahora} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PartidaEnVivo({ partida, ddragon, actualizadoMs, ahora }) {
  const minutos = minutosEnPartida(partida, actualizadoMs, ahora);
  const equipos = equiposEnVivo(partida);
  return (
    <article className="rounded-lg border border-sapo/40 bg-superficie p-3">
      <header className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <EtiquetaModo item={partida} />
        <span className="cifras text-texto-suave">
          {minutos === null ? "Tiempo desconocido" : `${minutos} min de partida`}
        </span>
      </header>
      {equipos.length === 0 ? (
        <p className="text-sm text-texto-suave">No hay datos de los equipos.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {equipos.map((eq, i) => (
            <div key={eq.equipo}>
              <h3 className="mb-1 text-xs text-texto-suave">{nombreEquipo(eq.equipo, i)}</h3>
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
      className={`flex min-w-0 items-center gap-2 rounded px-1 py-0.5 ${esAmigo ? "bg-sapo-fondo" : ""}`}
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
