import { esNumero, fechaCompleta, formatearDuracion, haceCuanto } from "../logica/formato.js";
import { estiloPuesto, rasgosParaMostrar, textoPuesto } from "../logica/tft.js";
import { EtiquetaModo } from "./Etiquetas.jsx";
import { RasgoTft, UnidadTft } from "./PiezasTft.jsx";

const numeros = new Intl.NumberFormat("es");

/**
 * Fila de partida compacta de TFT, estilo tactics.tools / OP.GG:
 * Muestra el puesto, modo, duración, rasgos activos clave y unidades de forma horizontal
 * y condensada para escanear muchas partidas rápidamente.
 */
export function FilaPartidaCompactaTft({ partida, ddragon, ahora, slugPropio }) {
  const p = partida ?? {};
  const estilo = estiloPuesto(p.puesto);
  const rasgos = rasgosParaMostrar(p.rasgos);
  const unidades = Array.isArray(p.unidades)
    ? [...p.unidades].filter((u) => u && typeof u.id === "string")
    : [];

  // En la vista compacta mostramos las unidades ordenadas priorizando 3 estrellas, ítems y costo
  unidades.sort((a, b) => {
    const starsA = a.estrellas || 1;
    const starsB = b.estrellas || 1;
    if (starsB !== starsA) return starsB - starsA;
    const itemsA = Array.isArray(a.items) ? a.items.length : 0;
    const itemsB = Array.isArray(b.items) ? b.items.length : 0;
    if (itemsB !== itemsA) return itemsB - itemsA;
    return (b.rareza || 0) - (a.rareza || 0);
  });

  const bordePuesto =
    p.puesto === 1
      ? "border-l-4 border-l-oro bg-oro-fondo/30"
      : p.puesto <= 4
        ? "border-l-4 border-l-victoria bg-victoria-fondo/30"
        : "border-l-4 border-l-derrota/80 bg-derrota-fondo/20";

  const amigosEnLobby = (p.participantes || []).filter(
    (part) => part && part.amigo && part.amigo !== slugPropio,
  );

  return (
    <article
      aria-label={`${textoPuesto(p.puesto)} puesto, ${p.modo || "Modo especial"}`}
      data-puesto={estilo.grupo}
      className={`group/fila flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-lg border border-borde/70 px-3 py-2 text-xs transition-colors hover:bg-superficie-alta/50 ${bordePuesto}`}
    >
      {/* 1. Puesto, Modo y Fecha/Duración */}
      <div className="flex items-center gap-3 shrink-0 min-w-[130px] sm:w-40">
        <div className="flex flex-col items-center justify-center">
          <span className={`marcador font-bold text-2xl leading-none ${estilo.texto}`}>
            #{p.puesto}
          </span>
          <span className="text-[10px] text-texto-suave font-medium mt-0.5">
            {p.puesto === 1 ? "Victoria" : p.puesto <= 4 ? "Top 4" : "Bot 4"}
          </span>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <EtiquetaModo item={p} />
            {esNumero(p.nivel) && (
              <span className="text-[10.5px] font-mono text-texto-suave bg-superficie px-1 rounded">
                Nv. {p.nivel}
              </span>
            )}
          </div>
          <time
            className="text-[11px] text-texto-suave whitespace-nowrap mt-0.5"
            dateTime={esNumero(p.fecha) ? new Date(p.fecha).toISOString() : undefined}
            title={fechaCompleta(p.fecha)}
          >
            {haceCuanto(p.fecha, ahora)} · {formatearDuracion(p.duracion)}
          </time>
        </div>
      </div>

      {/* 2. Rasgos activos principales (hasta 5) */}
      {rasgos.length > 0 && (
        <ul className="flex items-center gap-1 shrink-0 flex-wrap" aria-label="Rasgos activos">
          {rasgos.slice(0, 5).map((r, i) => (
            <RasgoTft key={`${r.id}-${i}`} rasgo={r} ddragon={ddragon} />
          ))}
        </ul>
      )}

      {/* 3. Unidades prioritarias del tablero */}
      <div className="min-w-0 flex-1 overflow-x-auto py-0.5">
        {unidades.length > 0 ? (
          <ul className="flex items-center gap-1" aria-label="Unidades">
            {unidades.slice(0, 8).map((u, i) => (
              <UnidadTft key={`${u.id}-${i}`} unidad={u} ddragon={ddragon} />
            ))}
          </ul>
        ) : (
          <span className="text-xs text-texto-suave">Sin tablero</span>
        )}
      </div>

      {/* 4. Estadísticas finales (Daño / Eliminados / Amigos en partida) */}
      <div className="flex flex-col items-end text-right shrink-0 min-w-[90px]">
        {esNumero(p.danio) && p.danio > 0 ? (
          <span className="font-mono text-[11px] font-semibold text-texto">
            {numeros.format(p.danio)} <span className="text-[10px] text-texto-suave">daño</span>
          </span>
        ) : null}
        {esNumero(p.eliminados) && p.eliminados > 0 ? (
          <span className="text-[10.5px] text-victoria font-medium">
            {p.eliminados} {p.eliminados === 1 ? "eliminado" : "eliminados"}
          </span>
        ) : null}
        {amigosEnLobby.length > 0 && (
          <span
            className="mt-0.5 rounded border border-sapo/40 bg-sapo-fondo/80 px-1 text-[9.5px] font-semibold text-sapo"
            title={`Coincidió con: ${amigosEnLobby.map((a) => a.nombre).join(", ")}`}
          >
            +{amigosEnLobby.length} {amigosEnLobby.length === 1 ? "amigo" : "amigos"}
          </span>
        )}
      </div>
    </article>
  );
}
