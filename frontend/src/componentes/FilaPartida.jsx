import {
  nombreCampeon,
  nombreHechizo,
  nombreItem,
  nombreRuna,
  urlCampeon,
  urlHechizo,
  urlItem,
  urlRuna,
} from "../logica/ddragon.js";
import { csPorMinuto, esNumero, fechaCompleta, formatearDuracion, haceCuanto, ratioKda } from "../logica/formato.js";
import { agruparPorEquipo, nombreEquipo } from "../logica/partidas.js";
import { datosResultado, EtiquetaModo } from "./Etiquetas.jsx";
import { ImagenDD } from "./ImagenDD.jsx";

const RESULTADOS_CONOCIDOS = new Set(["victoria", "derrota", "remake"]);

/**
 * Una partida al estilo op.gg. Tolera partidas antiguas sin ítems, runas ni participantes.
 * El tono (verde, rojo o gris) va en un canto a la izquierda y un tinte leve (`.canto` en
 * index.css); el resultado siempre se lee también en texto con su ícono.
 */
export function FilaPartida({ partida, ddragon, ahora, slugPropio }) {
  const p = partida ?? {};
  const campeon = nombreCampeon(ddragon, p.campeon_id, p.campeon);

  return (
    <article
      aria-label={`${campeon}, ${p.modo || "Modo especial"}`}
      data-resultado={RESULTADOS_CONOCIDOS.has(p.resultado) ? p.resultado : undefined}
      className="canto flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md py-2.5 pr-3 pl-3.5"
    >
      <BloqueInfo p={p} ahora={ahora} />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <BloqueCampeon p={p} ddragon={ddragon} campeon={campeon} />
          <BloqueKda p={p} />
          <BloqueCifras p={p} />
        </div>
        <Items items={p.items} ddragon={ddragon} />
      </div>
      <Participantes participantes={p.participantes} ddragon={ddragon} slugPropio={slugPropio} />
    </article>
  );
}

/** Resultado en grande (ícono y palabra), el modo y cuándo fue. */
function BloqueInfo({ p, ahora }) {
  const r = datosResultado(p.resultado);
  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:w-32 sm:flex-col sm:items-start sm:gap-y-1.5 sm:self-stretch sm:border-r sm:border-borde sm:pr-3">
      <p className={`titulo-sub inline-flex items-center gap-1.5 ${r.clase}`}>
        <span aria-hidden="true" className="text-xs">
          {r.icono}
        </span>
        {r.texto}
      </p>
      <EtiquetaModo item={p} />
      <span className="text-xs text-texto-suave sm:mt-auto">
        <time className="whitespace-nowrap" dateTime={esNumero(p.fecha) ? new Date(p.fecha).toISOString() : undefined} title={fechaCompleta(p.fecha)}>
          {haceCuanto(p.fecha, ahora)}
        </time>
        <span aria-hidden="true"> · </span>
        <span className="cifras whitespace-nowrap">{formatearDuracion(p.duracion)}</span>
      </span>
    </div>
  );
}

function BloqueCampeon({ p, ddragon, campeon }) {
  const hechizos = Array.isArray(p.hechizos) ? p.hechizos.slice(0, 2) : [];
  const runas = p.runas && typeof p.runas === "object" ? [p.runas.principal, p.runas.secundaria] : [];
  return (
    <div className="flex items-center gap-1">
      <span className="relative">
        <ImagenDD src={urlCampeon(ddragon, p.campeon_id, p.campeon)} alt={campeon} tamaño={48} />
        {esNumero(p.nivel) && (
          <span
            className="cifras absolute -right-1 -bottom-1 rounded-full border border-borde bg-fondo px-1 text-[11px] leading-4"
            aria-label={`Nivel ${p.nivel}`}
          >
            {p.nivel}
          </span>
        )}
      </span>
      {hechizos.length > 0 && (
        <span className="ml-1 flex flex-col gap-0.5">
          {hechizos.map((h, i) => (
            <ImagenDD key={i} src={urlHechizo(ddragon, h)} alt={nombreHechizo(ddragon, h)} tamaño={22} />
          ))}
        </span>
      )}
      {runas.some((r) => r !== null && r !== undefined) && (
        <span className="flex flex-col gap-0.5">
          {runas.map((r, i) => (
            <ImagenDD
              key={i}
              src={urlRuna(ddragon, r)}
              alt={nombreRuna(ddragon, r)}
              tamaño={22}
              redonda
              className={i === 1 ? "p-0.5" : ""}
            />
          ))}
        </span>
      )}
    </div>
  );
}

function BloqueKda({ p }) {
  const ratio = ratioKda(p.asesinatos, p.muertes, p.asistencias);
  const hay = ratio !== null;
  return (
    <div className="w-20 text-center">
      <p className="marcador text-xl leading-tight" aria-label={hay ? `KDA ${p.asesinatos} / ${p.muertes} / ${p.asistencias}` : "KDA sin datos"}>
        {hay ? (
          <>
            {p.asesinatos} <span className="font-normal text-texto-suave">/</span>{" "}
            <span className="text-derrota">{p.muertes}</span> <span className="font-normal text-texto-suave">/</span>{" "}
            {p.asistencias}
          </>
        ) : (
          "—"
        )}
      </p>
      {hay && <p className="cifras text-xs text-texto-suave">{ratio === "Perfecto" ? "KDA perfecto" : `${ratio} KDA`}</p>}
    </div>
  );
}

function BloqueCifras({ p }) {
  const porMinuto = csPorMinuto(p.cs, p.duracion);
  return (
    <div className="cifras text-xs text-texto-suave">
      {esNumero(p.cs) && (
        <p>
          <span className="text-texto">{p.cs} CS</span>
          {porMinuto && ` (${porMinuto}/min)`}
        </p>
      )}
      <p>
        P. en asesinatos <span className="text-texto">{esNumero(p.participacion) ? `${Math.round(p.participacion)}%` : "—"}</span>
      </p>
    </div>
  );
}

function Items({ items, ddragon }) {
  if (!Array.isArray(items)) return null;
  const espacios = Array.from({ length: 7 }, (_, i) => (Number.isInteger(items[i]) ? items[i] : 0));
  return (
    <ul className="flex gap-0.5" aria-label="Ítems">
      {espacios.map((id, i) =>
        id > 0 ? (
          <li key={i} className={i === 6 ? "ml-1.5" : undefined}>
            <ImagenDD src={urlItem(ddragon, id)} alt={nombreItem(ddragon, id)} tamaño={24} className={i === 6 ? "rounded-full" : ""} />
          </li>
        ) : (
          <li key={i} className={i === 6 ? "ml-1.5" : undefined}>
            <span
              role="img"
              aria-label="Espacio vacío"
              className={`block h-6 w-6 border border-borde/80 bg-fondo/70 ${i === 6 ? "rounded-full" : "rounded-md"}`}
            />
          </li>
        ),
      )}
    </ul>
  );
}

function Participantes({ participantes, ddragon, slugPropio }) {
  const equipos = agruparPorEquipo(participantes);
  if (equipos.length === 0) return null;
  return (
    <div className="grid w-full grid-cols-2 gap-x-3 gap-y-2 lg:ml-auto lg:w-60">
      {equipos.map((eq, i) => (
        <ul key={eq.equipo} aria-label={nombreEquipo(eq.equipo, i)} className="min-w-0 space-y-0.5">
          {eq.jugadores.map((j, k) => {
            const campeon = nombreCampeon(ddragon, j.campeon_id);
            const nombre = typeof j.nombre === "string" && j.nombre ? j.nombre : campeon;
            const propio = Boolean(slugPropio) && j.amigo === slugPropio;
            const amigo = Boolean(j.amigo);
            return (
              <li
                key={`${j.campeon_id}-${k}`}
                className="flex min-w-0 items-center gap-1.5 text-xs"
                data-propio={propio ? "true" : undefined}
                data-amigo={amigo ? "true" : undefined}
              >
                <ImagenDD src={urlCampeon(ddragon, j.campeon_id)} alt={campeon} tamaño={16} />
                <span
                  className={`min-w-0 truncate ${propio ? "font-bold text-texto" : amigo ? "text-sapo" : "text-texto-suave"}`}
                  title={nombre}
                >
                  {nombre}
                </span>
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}
