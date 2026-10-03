import { nombreCampeon, urlCampeon, urlIconoPerfil } from "../logica/ddragon.js";
import {
  CLAVES_DESTACADOS,
  colorResultado,
  RACHA_MINIMA,
  ULTIMAS_PARTIDAS_POR_DEFECTO,
  destacadosVacios,
  fechaRacha,
  formatearDanio,
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
  mejor_partida: "Mejor partida",
  racha_victorias_grupo: "Racha de victorias en equipo",
  racha_derrotas_grupo: "Racha de derrotas en equipo",
  peor_partida: "Peor partida",
};

// Qué falta cuando una tarjeta viene vacía (los mínimos los pone el recolector).
function minimo(clave, n) {
  switch (clave) {
    case "mejor_winrate":
      return `Nadie con 5 partidas de sus últimas ${n}.`;
    case "racha_victorias_grupo":
      return `Nadie con ${RACHA_MINIMA} victorias seguidas en equipo.`;
    case "racha_derrotas_grupo":
      return `Nadie con ${RACHA_MINIMA} derrotas seguidas en equipo.`;
    default:
      return null;
  }
}

/**
 * Destacados de los últimos 7 días (solo LoL, Normal y Ranked).
 * Más partidas cuenta los 7 días; las rachas, las partidas en equipo (2 o más del grupo);
 * el resto, las últimas N partidas de cada amigo.
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
        {`Solo Normal y Ranked (Solo/Dúo y Flex) · Winrate y mejor y peor partida: últimas ${n} partidas de cada uno · Rachas: partidas en equipo (2 o más del grupo)`}
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
          {esRacha(clave) ? (
            <IntegrantesRacha t={tarjeta} porSlug={porSlug} ddragon={ddragon} />
          ) : (
            <Amigos slugs={tarjeta.amigos} porSlug={porSlug} ddragon={ddragon} />
          )}
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

const esRacha = (clave) => clave === "racha_victorias_grupo" || clave === "racha_derrotas_grupo";

const amigoDe = (porSlug, slug) => porSlug.get(slug) ?? { slug, riot_id: slug };
const nombreDe = (a) => a.nombre || a.riot_id || a.slug;

function IconosAmigos({ lista, ddragon }) {
  return (
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
  );
}

/**
 * Integrantes de una racha en equipo: íconos arriba y nombres debajo, a todo el ancho.
 * Quien jugó solo 1 partida de la racha lleva «(1 partida)» en texto suave.
 * Los nombres ocupan siempre 2 líneas (cortados si no caben) para que 3 a 5 integrantes
 * no cambien el alto; la lista completa queda en `title` y para lectores de pantalla.
 */
function IntegrantesRacha({ t, porSlug, ddragon }) {
  const lista = t.amigos.map((slug) => amigoDe(porSlug, slug));
  const nota = (a) => (t.partidas?.[a.slug] === 1 ? " (1 partida)" : "");
  const completo = lista.map((a) => `${nombreDe(a)}${nota(a)}`).join(" · ");
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <IconosAmigos lista={lista} ddragon={ddragon} />
      <p title={completo} data-integrantes="" className="line-clamp-2 h-10 min-w-0 text-sm leading-5 break-words">
        {lista.map((a, i) => (
          <span key={a.slug}>
            {i > 0 && <span className="text-texto-suave"> · </span>}
            <span className="font-semibold">{nombreDe(a)}</span>
            {nota(a) && <span className="text-xs text-texto-suave">{nota(a)}</span>}
          </span>
        ))}
      </p>
    </div>
  );
}

/**
 * Íconos superpuestos y nombres separados por " · " (con empate van todos).
 * Los nombres se cortan en 2 líneas para que 3 a 5 empatados no estiren todas las
 * tarjetas; la lista completa queda en `title` y para lectores de pantalla.
 */
function Amigos({ slugs, porSlug, ddragon }) {
  const lista = slugs.map((slug) => amigoDe(porSlug, slug));
  const nombres = lista.map(nombreDe).join(" · ");
  return (
    <div className="flex min-w-0 items-center gap-2">
      <IconosAmigos lista={lista} ddragon={ddragon} />
      <p title={nombres} className="line-clamp-2 min-w-0 font-semibold break-words">
        {nombres}
      </p>
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
    case "mejor_partida":
      return <Partida t={t} ddragon={ddragon} ahora={ahora} mejor />;
    case "racha_victorias_grupo":
      return <Racha icono="🔥" t={t} texto="victorias seguidas" color="text-victoria" />;
    case "racha_derrotas_grupo":
      return <Racha icono="🧊" t={t} texto="derrotas seguidas" color="text-derrota" />;
    case "peor_partida":
      return <Partida t={t} ddragon={ddragon} ahora={ahora} mejor={false} />;
    default:
      return null;
  }
}

/**
 * "🔥 3 victorias seguidas": el texto dice el resultado, el color solo lo refuerza.
 * Debajo, cuándo fue la racha ("1 oct" o "30 sept – 2 oct") si el archivo trae las fechas.
 */
function Racha({ icono, t, texto, color }) {
  const cuando = fechaRacha(t.desde, t.hasta);
  return (
    <div className="mt-auto">
      <p className="flex items-baseline gap-2">
        <span aria-hidden="true">{icono}</span>
        <span>
          <span className={`${VALOR} ${color}`}>{t.racha}</span> <span className="text-texto-suave">{texto}</span>
        </span>
      </p>
      {cuando && (
        <p className="mt-1 text-xs text-texto-suave">
          <time dateTime={new Date(t.desde).toISOString()} title={`${fechaCompleta(t.desde)} – ${fechaCompleta(t.hasta)}`}>
            {cuando}
          </time>
        </p>
      )}
    </div>
  );
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

/**
 * Mejor o peor partida del grupo: misma tarjeta, cambia el color del KDA.
 * El nombre del campeón sale de Data Dragon ("Maestro Yi"), con `campeon` de respaldo.
 * El daño a campeones va en su línea bajo el KDA, en color del resultado de esa partida
 * (el texto «Victoria»/«Derrota» de abajo lo dice sin depender del color); sin dato no se muestra.
 */
function Partida({ t, ddragon, ahora, mejor }) {
  const campeon = nombreCampeon(ddragon, t.campeon_id, t.campeon);
  const danio = formatearDanio(t.danio);
  return (
    <div className="mt-auto flex items-center gap-3">
      <ImagenDD src={urlCampeon(ddragon, t.campeon_id, t.campeon)} alt={campeon} tamaño={44} />
      <div className="min-w-0">
        <p className="cifras font-titulo text-lg leading-tight font-bold">
          {campeon} <span className="text-texto-suave">·</span> <Kda a={t.asesinatos} m={t.muertes} asi={t.asistencias} />
        </p>
        <p className={`cifras text-sm font-semibold ${mejor ? "text-victoria" : "text-derrota"}`}>
          KDA {formatearKdaDestacado(t.kda)}
        </p>
        {danio && (
          <p data-danio="" className={`cifras text-sm font-semibold ${colorResultado(t.resultado)}`}>
            {danio}
          </p>
        )}
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
