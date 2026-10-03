import { nombreCampeon, urlCampeon, urlIconoPerfil } from "../logica/ddragon.js";
import {
  CLAVES_DESTACADOS,
  ULTIMAS_PARTIDAS_POR_DEFECTO,
  destacadosVacios,
  formatearKdaDestacado,
  formatearPorcentaje,
  plural,
} from "../logica/destacados.js";
import { esNumero, fechaCompleta, haceCuanto } from "../logica/formato.js";
import { MarcaResultado } from "./Etiquetas.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

const TITULOS = {
  mas_partidas: "Más partidas",
  mejor_winrate: "Mejor winrate",
  mejor_kda: "Mejor KDA",
  peor_kda: "Peor KDA",
  racha: "Racha más larga",
  peor_partida: "Peor partida",
};

// Qué falta cuando una tarjeta viene vacía (los mínimos los pone el recolector).
function minimo(clave, n) {
  switch (clave) {
    case "mejor_winrate":
    case "mejor_kda":
    case "peor_kda":
      return `Nadie con 5 partidas de sus últimas ${n}.`;
    case "racha":
      return "Nadie con 2 victorias seguidas.";
    default:
      return null;
  }
}

/**
 * Destacados de los últimos 7 días (solo LoL, Normal y Ranked).
 * Más partidas cuenta los 7 días; el resto, las últimas N partidas de cada amigo.
 * Sin `destacados` (archivos viejos) no se muestra nada.
 */
export function SeccionDestacados({ destacados, amigos, ddragon, ahora }) {
  if (!destacados) return null;
  const porSlug = new Map((amigos ?? []).map((a) => [a.slug, a]));
  const vacios = destacadosVacios(destacados);
  const n = destacados.ultimas_partidas ?? ULTIMAS_PARTIDAS_POR_DEFECTO;

  return (
    <section aria-labelledby="titulo-destacados" aria-describedby="nota-destacados">
      <TituloSeccion id="titulo-destacados">Destacados de los últimos 7 días</TituloSeccion>
      <p id="nota-destacados" className="-mt-2 mb-3 text-xs break-words text-texto-suave">
        {`Solo Normal y Ranked (Solo/Dúo y Flex) · Winrate, KDA, racha y peor partida: últimas ${n} partidas de cada uno`}
      </p>
      {vacios ? (
        <p className="flex min-h-20 items-center justify-center rounded-lg border border-borde bg-superficie px-3 text-center text-sm text-texto-suave">
          Sin partidas de Normal o Ranked en los últimos 7 días
        </p>
      ) : (
        <ul className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CLAVES_DESTACADOS.map((clave) => (
            <li key={clave} className="min-w-0">
              <TarjetaDestacado
                clave={clave}
                tarjeta={destacados[clave]}
                porSlug={porSlug}
                ddragon={ddragon}
                ahora={ahora}
                ultimas={n}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TarjetaDestacado({ clave, tarjeta, porSlug, ddragon, ahora, ultimas }) {
  const idTitulo = `destacado-${clave}`;
  const textoMinimo = minimo(clave, ultimas);
  return (
    <article
      aria-labelledby={idTitulo}
      data-destacado={clave}
      className="flex h-full flex-col gap-2 rounded-lg border border-borde bg-superficie p-3"
    >
      <h3 id={idTitulo} className="text-sm font-semibold text-texto-suave">
        {TITULOS[clave]}
      </h3>
      {tarjeta ? (
        <>
          <Amigos slugs={tarjeta.amigos} porSlug={porSlug} ddragon={ddragon} />
          <Contenido clave={clave} t={tarjeta} ddragon={ddragon} ahora={ahora} />
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-texto-suave">Sin datos</p>
          {textoMinimo && <p className="text-xs text-texto-suave">{textoMinimo}</p>}
        </div>
      )}
    </article>
  );
}

/** Íconos superpuestos y nombres separados por " · " (con empate van todos). */
function Amigos({ slugs, porSlug, ddragon }) {
  const lista = slugs.map((slug) => porSlug.get(slug) ?? { slug, riot_id: slug });
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 -space-x-2">
        {lista.map((a) => (
          <ImagenDD
            key={a.slug}
            src={urlIconoPerfil(ddragon, a.perfil?.icono)}
            alt={`Ícono de ${a.riot_id ?? a.slug}`}
            respaldo={a.riot_id ?? a.slug}
            tamaño={28}
            redonda
            className="ring-2 ring-superficie"
          />
        ))}
      </span>
      <p className="min-w-0 font-semibold break-words">{lista.map((a) => a.nombre || a.riot_id || a.slug).join(" · ")}</p>
    </div>
  );
}

const VALOR = "cifras font-titulo text-3xl leading-none font-bold";

function Contenido({ clave, t, ddragon, ahora }) {
  switch (clave) {
    case "mas_partidas":
      return (
        <p className="mt-auto">
          <span className={VALOR}>{t.partidas}</span> <span className="text-texto-suave">{t.partidas === 1 ? "partida" : "partidas"}</span>
        </p>
      );
    case "mejor_winrate":
      return (
        <div className="mt-auto">
          <p className={`${VALOR} text-victoria`}>{formatearPorcentaje(t.winrate)}</p>
          <p className="cifras mt-1 text-sm text-texto-suave">
            <span aria-hidden="true">
              <span className="text-victoria">{t.victorias} V</span> – <span className="text-derrota">{t.derrotas} D</span> ·{" "}
              {plural(t.partidas, "partida")}
            </span>
            <span className="sr-only">
              {plural(t.victorias, "victoria")} y {plural(t.derrotas, "derrota")} en {plural(t.partidas, "partida")}
            </span>
          </p>
        </div>
      );
    case "mejor_kda":
    case "peor_kda":
      return (
        <div className="mt-auto">
          <p className={`${VALOR} ${clave === "peor_kda" ? "text-derrota" : "text-victoria"}`}>
            {formatearKdaDestacado(t.kda)}
            <span className="sr-only"> de KDA</span>
          </p>
          <p className="cifras mt-1 text-sm text-texto-suave">
            <Kda a={t.asesinatos} m={t.muertes} asi={t.asistencias} /> · {plural(t.partidas, "partida")}
          </p>
        </div>
      );
    case "racha":
      return (
        <p className="mt-auto flex items-baseline gap-2">
          <span aria-hidden="true">🔥</span>
          <span>
            <span className={VALOR}>{t.racha}</span>{" "}
            <span className="text-texto-suave">{t.racha === 1 ? "victoria seguida" : "victorias seguidas"}</span>
          </span>
        </p>
      );
    case "peor_partida":
      return <PeorPartida t={t} ddragon={ddragon} ahora={ahora} />;
    default:
      return null;
  }
}

/** "85 / 48 / 60" con las muertes en color derrota, como en las partidas. */
function Kda({ a, m, asi }) {
  return (
    <>
      <span aria-hidden="true">
        <span className="text-texto">{a}</span> / <span className="text-derrota">{m}</span> / <span className="text-texto">{asi}</span>
      </span>
      <span className="sr-only">
        {a} asesinatos, {m} muertes, {asi} asistencias
      </span>
    </>
  );
}

function PeorPartida({ t, ddragon, ahora }) {
  const campeon = nombreCampeon(ddragon, t.campeon_id, t.campeon);
  return (
    <div className="mt-auto flex items-center gap-3">
      <ImagenDD src={urlCampeon(ddragon, t.campeon_id, t.campeon)} alt={campeon} tamaño={44} />
      <div className="min-w-0">
        <p className="cifras font-titulo text-lg leading-tight font-bold">
          {campeon} <span className="text-texto-suave">·</span> <Kda a={t.asesinatos} m={t.muertes} asi={t.asistencias} />
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-texto-suave">
          <span>{t.modo || "Modo especial"}</span>
          <time
            dateTime={esNumero(t.fecha) ? new Date(t.fecha).toISOString() : undefined}
            title={fechaCompleta(t.fecha)}
            className="whitespace-nowrap"
          >
            {haceCuanto(t.fecha, ahora)}
          </time>
          <MarcaResultado resultado={t.resultado} />
        </p>
      </div>
    </div>
  );
}
