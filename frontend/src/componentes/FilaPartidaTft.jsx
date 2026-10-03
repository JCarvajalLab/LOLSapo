import { esNumero, fechaCompleta, formatearDuracion, haceCuanto } from "../logica/formato.js";
import { estiloPuesto, rasgosParaMostrar, textoPuesto } from "../logica/tft.js";
import { EtiquetaModo } from "./Etiquetas.jsx";
import { MarcaPuesto, RasgoTft, UnidadTft } from "./PiezasTft.jsx";

const numeros = new Intl.NumberFormat("es");

/**
 * Una partida de TFT, compacta como op.gg/tactics.tools:
 * [puesto grande + modo, fecha, duración, nivel] [rasgos activos / unidades con estrellas e ítems] [lobby]
 * En móvil todo se apila y las unidades bajan de línea; nunca hay scroll horizontal.
 */
export function FilaPartidaTft({ partida, ddragon, ahora, slugPropio }) {
  const p = partida ?? {};
  const estilo = estiloPuesto(p.puesto);
  const rasgos = rasgosParaMostrar(p.rasgos);
  const unidades = Array.isArray(p.unidades) ? p.unidades.filter((u) => u && typeof u.id === "string") : [];

  return (
    <article
      aria-label={`${textoPuesto(p.puesto)} puesto, ${p.modo || "Modo especial"}`}
      className={`flex flex-wrap gap-x-4 gap-y-3 rounded-lg border-l-4 px-3 py-2 ${estilo.borde} ${estilo.fondo}`}
      data-puesto={estilo.grupo}
    >
      <div className="flex w-full items-center gap-3 sm:w-28 sm:flex-col sm:items-start sm:gap-1.5">
        <MarcaPuesto puesto={p.puesto} className="w-12 shrink-0 sm:w-auto" />
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-suave sm:flex-col sm:items-start">
          <EtiquetaModo item={p} />
          <span>
            <time
              className="whitespace-nowrap"
              dateTime={esNumero(p.fecha) ? new Date(p.fecha).toISOString() : undefined}
              title={fechaCompleta(p.fecha)}
            >
              {haceCuanto(p.fecha, ahora)}
            </time>
            <span aria-hidden="true"> · </span>
            <span className="cifras whitespace-nowrap">{formatearDuracion(p.duracion)}</span>
          </span>
          <Cifras p={p} />
        </div>
      </div>

      <div className="min-w-0 flex-1 basis-64 space-y-2">
        {rasgos.length > 0 && (
          <ul className="flex flex-wrap items-center gap-x-2 gap-y-1" aria-label="Rasgos activos">
            {rasgos.map((r, i) => (
              <RasgoTft key={`${r.id}-${i}`} rasgo={r} ddragon={ddragon} />
            ))}
          </ul>
        )}
        {unidades.length > 0 ? (
          <ul className="flex flex-wrap gap-1" aria-label="Unidades">
            {unidades.map((u, i) => (
              <UnidadTft key={`${u.id}-${i}`} unidad={u} ddragon={ddragon} />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-texto-suave">Sin datos del tablero.</p>
        )}
      </div>

      <Lobby participantes={p.participantes} slugPropio={slugPropio} />
    </article>
  );
}

/** Nivel, jugadores eliminados y daño (el daño se oculta si viene en 0). */
function Cifras({ p }) {
  const partes = [];
  if (esNumero(p.nivel)) partes.push(`Nivel ${p.nivel}`);
  if (esNumero(p.eliminados) && p.eliminados > 0) {
    partes.push(`${p.eliminados} ${p.eliminados === 1 ? "eliminado" : "eliminados"}`);
  }
  if (esNumero(p.danio) && p.danio > 0) partes.push(`${numeros.format(p.danio)} de daño`);
  if (partes.length === 0) return null;
  return <span className="cifras whitespace-nowrap">{partes.join(" · ")}</span>;
}

/** Los 8 del lobby por puesto, en dos columnas (1 a 4 y 5 a 8). Los amigos se resaltan. */
function Lobby({ participantes, slugPropio }) {
  if (!Array.isArray(participantes) || participantes.length === 0) return null;
  const lista = participantes
    .filter((j) => j && typeof j === "object")
    .sort((a, b) => (a.puesto ?? 99) - (b.puesto ?? 99));
  return (
    <ol
      aria-label="Lobby"
      className="grid w-full min-w-0 auto-cols-[minmax(0,1fr)] grid-flow-col grid-rows-4 gap-x-3 gap-y-px text-xs lg:ml-auto lg:w-56 lg:self-center"
    >
      {lista.map((j, i) => {
        const nombre = typeof j.nombre === "string" && j.nombre ? j.nombre : "Jugador oculto";
        const propio = Boolean(slugPropio) && j.amigo === slugPropio;
        const amigo = Boolean(j.amigo);
        return (
          <li
            key={`${j.puesto}-${i}`}
            className="flex min-w-0 items-center gap-1.5"
            data-propio={propio ? "true" : undefined}
            data-amigo={amigo ? "true" : undefined}
          >
            <span className={`cifras w-3 shrink-0 text-right font-semibold ${estiloPuesto(j.puesto).texto}`}>
              {Number.isInteger(j.puesto) ? j.puesto : "—"}
            </span>
            <span
              className={`min-w-0 truncate ${propio ? "font-bold text-texto" : amigo ? "font-semibold text-sapo" : "text-texto-suave"}`}
              title={nombre}
            >
              {nombre}
              {amigo && !propio && <span className="sr-only"> (del grupo)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
