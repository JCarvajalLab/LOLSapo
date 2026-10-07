// Piezas comunes de los destacados de LoL: sección, lista y tarjeta.
import { useRef, useState } from "react";
import { urlIconoPerfil } from "../logica/ddragon.js";
import {
  CLAVES_HOY,
  CLAVES_MES,
  fechaRacha,
  formatearPorcentaje,
  notaJugadas,
  plural,
  topDe,
  topGlobalDe,
} from "../logica/destacados.js";
import { fechaCompleta } from "../logica/formato.js";
import { ImagenDD } from "./ImagenDD.jsx";
import { ModalTopDestacado } from "./ModalTopDestacado.jsx";
import { PartidaDestacada } from "./PartidaDestacada.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

const TITULOS = {
  mejor_jugador_hoy: "Mejor jugador de la partida - Hoy",
  balance_hoy: "Balance del grupo hoy",
  peor_jugador_hoy: "Peor jugador de la partida - Hoy",
  mas_partidas: "Más partidas",
  mejor_winrate: "Mejor winrate",
  mejor_jugador_semana: "Mejor jugador de la semana",
  racha_victorias_grupo: "Racha de victorias en equipo",
  racha_derrotas_grupo: "Racha de derrotas en equipo",
  peor_jugador_semana: "Peor jugador de la semana",
  mejor_jugador_mes: "Mejor jugador del mes",
  balance_mes: "Balance del grupo del mes",
  peor_jugador_mes: "Peor jugador del mes",
};

/** Vacío de cualquier tarjeta de la semana (y de la sección entera si todas vienen vacías). */
export const VACIO_SEMANA = "No existen partidas registradas en equipo esta semana";

/** Vacío de cada tarjeta del mes. */
export const VACIO_MES = "No existen partidas registradas en equipo este mes";

/** Estado vacío según el bloque de la tarjeta: el día se reinicia a las 12:00 de Chile. */
function vacioDe(clave) {
  if (CLAVES_HOY.includes(clave)) {
    return { mensaje: "No hay partidas en grupo registradas hoy", reinicio: "Se reinicia a las 12:00" };
  }
  if (CLAVES_MES.includes(clave)) return { mensaje: VACIO_MES };
  return { mensaje: VACIO_SEMANA, reinicio: "Se reinicia el lunes a la 01:00" };
}

const esBalance = (clave) => clave === "balance_hoy" || clave === "balance_mes";

/** Filo de color arriba de la tarjeta: verde para lo mejor, rojo para lo peor, nada en lo neutro. */
function filoDe(clave) {
  if (clave.startsWith("mejor_") || clave === "racha_victorias_grupo") return "filo-victoria";
  if (clave.startsWith("peor_") || clave === "racha_derrotas_grupo") return "filo-derrota";
  return "";
}

/**
 * Fila de mejor jugador, balance y peor jugador (hoy y mes). En 2 columnas (tablet) el
 * balance baja a su propia fila a todo el ancho, para que mejor y peor jugador queden lado a
 * lado; en 1 columna (móvil) y en 3 (escritorio) va al centro, igual que en el orden del
 * documento que leen los lectores de pantalla.
 */
export const claseItemBalance = (clave) =>
  esBalance(clave) ? "sm:order-last sm:col-span-2 lg:order-none lg:col-span-1" : "";

/** Estado vacío de una tarjeta: mensaje principal y, si hay, debajo en chico cuándo se reinicia. */
function Vacio({ mensaje, reinicio }) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <p className="text-texto-suave">{mensaje}</p>
      {reinicio && <p className="text-xs text-texto-suave">{reinicio}</p>}
    </div>
  );
}

/** Una sección de destacados: título (h2), nota bajo el título y su contenido. */
export function BloqueDestacados({ id, titulo, nota, children }) {
  return (
    <section aria-labelledby={`titulo-${id}`} aria-describedby={`nota-${id}`}>
      <TituloSeccion id={`titulo-${id}`}>{titulo}</TituloSeccion>
      <p id={`nota-${id}`} className="-mt-2 mb-3 text-xs break-words text-texto-suave">
        {nota}
      </p>
      {children}
    </section>
  );
}

/**
 * Lista de tarjetas en el orden de `claves`. `claseLista` define la grilla y
 * `claseItem` (opcional) ajusta el `li` de una tarjeta según su clave.
 * Las tarjetas con top 5 (`topDe`) se pueden abrir: la ventana lleva el título de la tarjeta
 * y la `nota` del bloque; al cerrarla, el foco vuelve al botón de la tarjeta. Si el top
 * abierto deja de existir (vence o llega otro lol.json), la ventana se cierra y no se reabre
 * sola aunque el top vuelva.
 */
export function ListaDestacados({ claves, destacados, amigos, ddragon, ahora, nota, claseLista, claseItem = () => "" }) {
  const [abierta, setAbierta] = useState(null);
  const botones = useRef({});
  const porSlug = new Map((amigos ?? []).map((a) => [a.slug, a]));
  // Si con datos nuevos el top abierto desaparece, la ventana se cierra sola.
  const topAbierto = abierta ? topDe(destacados, abierta) : null;
  // Y se olvida cuál estaba abierta, para que si el top vuelve la ventana no se reabra sin
  // clic. Se ajusta durante el render (patrón de React para estado derivado de props) y no
  // en un efecto. No hay foco que devolver: sin top la tarjeta no tiene botón.
  if (abierta && !topAbierto) setAbierta(null);
  const cerrar = () => {
    const clave = abierta;
    setAbierta(null);
    botones.current[clave]?.focus();
  };
  return (
    <>
      <ul className={`grid auto-rows-fr gap-3 ${claseLista}`}>
        {claves.map((clave) => (
          <li key={clave} className={`min-w-0 ${claseItem(clave)}`.trim()}>
            <TarjetaDestacado
              clave={clave}
              tarjeta={destacados[clave]}
              porSlug={porSlug}
              ddragon={ddragon}
              ahora={ahora}
              onVerTop={topDe(destacados, clave) ? () => setAbierta(clave) : null}
              refBoton={(el) => {
                botones.current[clave] = el;
              }}
            />
          </li>
        ))}
      </ul>
      {topAbierto && (
        <ModalTopDestacado
          clave={abierta}
          titulo={TITULOS[abierta]}
          nota={nota}
          top={topAbierto}
          topGlobal={topGlobalDe(destacados, abierta)}
          porSlug={porSlug}
          ddragon={ddragon}
          ahora={ahora}
          onCerrar={cerrar}
        />
      )}
    </>
  );
}

/**
 * Una tarjeta de destacados. Con `onVerTop` es clicable entera: un botón transparente la
 * cubre (nombre «Ver top 5: <título>») y arriba a la derecha se lee «Top 5 ›».
 */
export function TarjetaDestacado({ clave, tarjeta, porSlug, ddragon, ahora, onVerTop = null, refBoton }) {
  const idTitulo = `destacado-${clave}`;
  const clicable = Boolean(tarjeta && onVerTop);
  // Con datos: superficie y filo de color. Vacía: borde punteado sobre el fondo, para que se retire.
  const caja = tarjeta ? `losa ${filoDe(clave)}` : "border-dashed border-borde bg-transparent";
  return (
    <article
      aria-labelledby={idTitulo}
      data-destacado={clave}
      className={`group relative flex h-full flex-col gap-2.5 rounded-lg border p-3 sm:p-4 ${caja}`.trim()}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={idTitulo} className="text-sm leading-5 text-texto-suave">
          {TITULOS[clave]}
        </h3>
        {clicable && (
          <span
            aria-hidden="true"
            className="shrink-0 rounded-full border border-borde px-2 py-0.5 text-xs whitespace-nowrap text-texto-suave group-hover:border-sapo/60 group-hover:text-sapo"
          >
            Top 5 ›
          </span>
        )}
      </div>
      {tarjeta ? (
        <>
          {esRacha(clave) ? (
            <NombresCompletos
              marca="integrantes"
              slugs={tarjeta.amigos}
              nota={(slug) => notaJugadas(tarjeta.partidas?.[slug], tarjeta.racha)}
              porSlug={porSlug}
              ddragon={ddragon}
            />
          ) : esBalance(clave) ? (
            <NombresCompletos
              marca="jugadores"
              slugs={tarjeta.amigos}
              nota={(slug) => notaJugadas(tarjeta.jugadas?.[slug], tarjeta.partidas)}
              porSlug={porSlug}
              ddragon={ddragon}
            />
          ) : clave === "mejor_winrate" ? (
            <NombresCompletos marca="ganadores" slugs={tarjeta.amigos} porSlug={porSlug} ddragon={ddragon} />
          ) : (
            <Amigos slugs={tarjeta.amigos} porSlug={porSlug} ddragon={ddragon} />
          )}
          <Contenido clave={clave} t={tarjeta} ddragon={ddragon} ahora={ahora} />
        </>
      ) : (
        <Vacio {...vacioDe(clave)} />
      )}
      {clicable && (
        <button
          ref={refBoton}
          type="button"
          onClick={onVerTop}
          aria-label={`Ver top 5: ${TITULOS[clave]}`}
          className="absolute -inset-px cursor-pointer rounded-lg border border-transparent hover:border-sapo/60"
        />
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
 * Íconos arriba y debajo todos los nombres completos en texto chico (balance de hoy, rachas en
 * equipo y mejor winrate compartido). Sin recorte: con 5 nombres largos la línea salta y la
 * fila crece pareja. `nota(slug)` agrega texto suave tras el nombre, como «(2 partidas)».
 * `marca` queda como atributo `data-…` del párrafo de nombres.
 */
function NombresCompletos({ marca, slugs, nota = () => "", porSlug, ddragon }) {
  const lista = slugs.map((slug) => amigoDe(porSlug, slug));
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <IconosAmigos lista={lista} ddragon={ddragon} />
      <p {...{ [`data-${marca}`]: "" }} className="min-w-0 text-xs leading-4 break-words">
        {lista.map((a, i) => {
          const extra = nota(a.slug);
          return (
            <span key={a.slug}>
              {i > 0 && <span className="text-texto-suave"> · </span>}
              <span className="font-semibold">{nombreDe(a)}</span>
              {extra && <span className="text-texto-suave">{extra}</span>}
            </span>
          );
        })}
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

const VALOR = "marcador text-4xl leading-none";

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
    case "mejor_jugador_hoy":
    case "mejor_jugador_semana":
    case "mejor_jugador_mes":
      return <PartidaDestacada t={t} ddragon={ddragon} ahora={ahora} mejor />;
    case "balance_hoy":
    case "balance_mes":
      return <Balance t={t} />;
    case "racha_victorias_grupo":
      return <Racha icono="🔥" t={t} texto="victorias seguidas" color="text-victoria" />;
    case "racha_derrotas_grupo":
      return <Racha icono="🧊" t={t} texto="derrotas seguidas" color="text-derrota" />;
    case "peor_jugador_hoy":
    case "peor_jugador_semana":
    case "peor_jugador_mes":
      return <PartidaDestacada t={t} ddragon={ddragon} ahora={ahora} mejor={false} />;
    default:
      return null;
  }
}

/**
 * Balance del grupo (hoy o del mes): «4 V – 2 D» grande (la letra dice el resultado, el color lo refuerza)
 * y debajo «66,7 % · 6 partidas en grupo».
 */
function Balance({ t }) {
  return (
    <div className="mt-auto">
      <p className={VALOR}>
        <span aria-hidden="true">
          <span className="text-victoria">{t.victorias} V</span> <span className="text-texto-suave">–</span>{" "}
          <span className="text-derrota">{t.derrotas} D</span>
        </span>
        <span className="sr-only">
          {plural(t.victorias, "victoria")} y {plural(t.derrotas, "derrota")}
        </span>
      </p>
      <p className="cifras mt-1 text-sm text-texto-suave">
        {formatearPorcentaje(t.winrate)} · {plural(t.partidas, "partida")} en grupo
      </p>
    </div>
  );
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
