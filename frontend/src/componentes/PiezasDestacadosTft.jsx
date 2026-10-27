// Piezas comunes de los destacados de TFT: sección, lista y tarjeta.
import { useRef, useState } from "react";
import { urlIconoPerfil } from "../logica/ddragon.js";
import {
  CLAVES_MES_TFT,
  TITULOS_TFT,
  topDeTft,
  topGlobalDeTft,
  VACIO_MES_TFT,
  VACIO_SEMANA_TFT,
} from "../logica/destacadosTft.js";
import {
  esNumero,
  fechaCompleta,
  formatearDuracion,
  formatearWinrate,
  haceCuanto,
} from "../logica/formato.js";
import { estiloPuesto, textoPuesto } from "../logica/tft.js";
import { BarraWinrate } from "./Etiquetas.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { ModalTopDestacadoTft } from "./ModalTopDestacadoTft.jsx";
import { UnidadTft } from "./PiezasTft.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

const esBalance = (clave) => clave.startsWith("balance_");
const esMejor = (clave) => clave.startsWith("mejor_");
const esPeor = (clave) => clave.startsWith("peor_");

function filoDeTft(clave) {
  if (esMejor(clave) || esBalance(clave) || clave.startsWith("mas_partidas")) return "filo-victoria";
  if (esPeor(clave)) return "filo-derrota";
  return "";
}

function vacioDeTft(clave) {
  if (CLAVES_MES_TFT.includes(clave)) return { mensaje: VACIO_MES_TFT };
  return { mensaje: VACIO_SEMANA_TFT, reinicio: "Se reinicia el lunes a la 01:00" };
}

function Vacio({ mensaje, reinicio }) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <p className="text-texto-suave text-sm">{mensaje}</p>
      {reinicio && <p className="text-xs text-texto-suave mt-1">{reinicio}</p>}
    </div>
  );
}

export function BloqueDestacadosTft({ id, titulo, nota, children }) {
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

function AmigosTft({ slugs, porSlug, ddragon }) {
  const lista = slugs.map((slug) => amigoDe(porSlug, slug));
  const nombres = lista.map(nombreDe).join(" · ");
  return (
    <div className="flex min-w-0 items-center gap-2">
      <IconosAmigos lista={lista} ddragon={ddragon} />
      <p title={nombres} className="line-clamp-2 min-w-0 font-semibold break-words text-sm">
        {nombres}
      </p>
    </div>
  );
}

function NombresCompletosTft({ slugs, jugadas, porSlug, ddragon }) {
  const lista = slugs.map((slug) => amigoDe(porSlug, slug));
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <IconosAmigos lista={lista} ddragon={ddragon} />
      <p className="min-w-0 text-xs leading-4 break-words">
        {lista.map((a, i) => {
          const cant = jugadas?.[a.slug];
          return (
            <span key={a.slug}>
              {i > 0 && <span className="text-texto-suave"> · </span>}
              <span className="font-semibold">{nombreDe(a)}</span>
              {esNumero(cant) && (
                <span className="text-texto-suave"> ({cant} {cant === 1 ? "partida" : "partidas"})</span>
              )}
            </span>
          );
        })}
      </p>
    </div>
  );
}

export function PartidaDestacadaTft({ t, ddragon, ahora, _mejor, compacta = false }) {
  const estilo = estiloPuesto(t.puesto);
  const unidades = Array.isArray(t.unidades) ? t.unidades.slice(0, 6) : [];

  return (
    <div className={`flex flex-col gap-2 ${compacta ? "" : "mt-auto"}`}>
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold border ${estilo.fondo} ${estilo.texto}`}
        >
          {textoPuesto(t.puesto)} puesto
        </span>
        <span className="text-xs text-texto-suave truncate">
          {t.modo || "TFT"} · Nivel {t.nivel} · Ronda {t.ronda}
          {esNumero(t.duracion) && t.duracion > 0 && ` · ${formatearDuracion(t.duracion)}`}
        </span>
      </div>

      {unidades.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="Unidades principales de la partida">
          {unidades.map((u, idx) => (
            <UnidadTft key={`${u.id}-${idx}`} unidad={u} ddragon={ddragon} compacta />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-texto-suave">
        {esNumero(t.danio) && t.danio > 0 && (
          <span className="cifras font-medium text-texto">
            {t.danio.toLocaleString("es-CL")} daño
          </span>
        )}
        {esNumero(t.eliminados) && t.eliminados > 0 && (
          <span>{t.eliminados} eliminados</span>
        )}
        {esNumero(t.duracion) && t.duracion > 0 && (
          <span className="cifras font-medium text-texto/90">
            ⏱ {formatearDuracion(t.duracion)}
          </span>
        )}
        <time
          dateTime={esNumero(t.fecha) ? new Date(t.fecha).toISOString() : undefined}
          title={fechaCompleta(t.fecha)}
          className="ml-auto"
        >
          {haceCuanto(t.fecha, ahora)}
        </time>
      </div>
    </div>
  );
}

const VALOR = "marcador text-3xl sm:text-4xl leading-none";

function ContenidoTft({ clave, t, ddragon, ahora }) {
  if (clave.startsWith("mejor_jugador") || clave.startsWith("peor_jugador")) {
    return <PartidaDestacadaTft t={t} ddragon={ddragon} ahora={ahora} _mejor={esMejor(clave)} />;
  }

  if (clave.startsWith("mejor_top4")) {
    return (
      <div className="mt-auto">
        <p className={`${VALOR} text-victoria`}>{formatearWinrate(t.top4_pct)}</p>
        <BarraWinrate winrate={t.top4_pct} className="mt-2" />
        <p className="cifras mt-1.5 text-xs sm:text-sm text-texto-suave">
          <span className="text-victoria font-semibold">{t.top4} Top 4</span>
          {esNumero(t.primeros) && t.primeros > 0 && (
            <span> · <span className="text-amber-300 font-semibold">{t.primeros} ★</span></span>
          )}
          <span> en {t.partidas} {t.partidas === 1 ? "partida" : "partidas"}</span>
        </p>
        {esNumero(t.promedio) && (
          <p className="cifras text-xs text-texto-suave mt-0.5">Puesto promedio: {t.promedio}</p>
        )}
      </div>
    );
  }

  if (clave.startsWith("mas_partidas")) {
    return (
      <div className="mt-auto">
        <p className={VALOR}>
          <span className="text-victoria">{t.partidas}</span>{" "}
          <span className="text-sm font-normal text-texto-suave">
            {t.partidas === 1 ? "partida" : "partidas"}
          </span>
        </p>
        <span
          className="relative mt-2 block h-1.5 overflow-hidden rounded-full bg-superficie-alta"
          aria-hidden="true"
        >
          <span className="absolute inset-y-0 left-0 rounded-full bg-victoria w-full" />
        </span>
        <p className="cifras mt-1.5 text-xs text-texto-suave">Mayor actividad en la Convergencia</p>
      </div>
    );
  }

  if (esBalance(clave)) {
    const bot4 = Math.max(0, (t.partidas ?? 0) - (t.top4 ?? 0));
    return (
      <div className="mt-auto">
        <p className={VALOR}>
          <span className="text-victoria">{t.top4} Top 4</span>
          <span className="text-texto-suave mx-1.5 text-2xl font-light">–</span>
          <span className="text-derrota">{bot4} Bot 4</span>
        </p>
        <BarraWinrate winrate={t.top4_pct} className="mt-2" />
        <p className="cifras mt-1.5 text-xs sm:text-sm text-texto-suave">
          <span className="text-victoria font-semibold">{formatearWinrate(t.top4_pct)}</span> grupal ·{" "}
          {t.partidas} {t.partidas === 1 ? "partida" : "partidas"}
        </p>
        {esNumero(t.promedio) && (
          <p className="cifras text-xs text-texto-suave mt-0.5">Puesto promedio: {t.promedio}</p>
        )}
      </div>
    );
  }

  return null;
}

export function TarjetaDestacadoTft({ clave, tarjeta, porSlug, ddragon, ahora, onVerTop = null, refBoton }) {
  const idTitulo = `destacado-tft-${clave}`;
  const clicable = Boolean(tarjeta && onVerTop);
  const caja = tarjeta ? `losa ${filoDeTft(clave)}` : "border-dashed border-borde bg-transparent";

  return (
    <article
      aria-labelledby={idTitulo}
      data-destacado={clave}
      className={`group relative flex h-full flex-col gap-2.5 rounded-lg border p-3 sm:p-4 ${caja}`.trim()}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={idTitulo} className="text-xs sm:text-sm leading-5 text-texto-suave font-medium">
          {TITULOS_TFT[clave] ?? clave}
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
          {esBalance(clave) ? (
            <NombresCompletosTft
              slugs={tarjeta.amigos}
              jugadas={tarjeta.jugadas}
              porSlug={porSlug}
              ddragon={ddragon}
            />
          ) : (
            <AmigosTft slugs={tarjeta.amigos} porSlug={porSlug} ddragon={ddragon} />
          )}
          <ContenidoTft clave={clave} t={tarjeta} ddragon={ddragon} ahora={ahora} />
        </>
      ) : (
        <Vacio {...vacioDeTft(clave)} />
      )}

      {clicable && (
        <button
          ref={refBoton}
          type="button"
          onClick={onVerTop}
          aria-label={`Ver top 5: ${TITULOS_TFT[clave]}`}
          className="absolute -inset-px cursor-pointer rounded-lg border border-transparent hover:border-sapo/60"
        />
      )}
    </article>
  );
}

export function ListaDestacadosTft({ claves, destacados, amigos, ddragon, ahora, nota, claseLista = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" }) {
  const [abierta, setAbierta] = useState(null);
  const botones = useRef({});
  const porSlug = new Map((amigos ?? []).map((a) => [a.slug, a]));

  const topAbierto = abierta ? topDeTft(destacados, abierta) : null;
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
          <li key={clave} className="min-w-0">
            <TarjetaDestacadoTft
              clave={clave}
              tarjeta={destacados[clave]}
              porSlug={porSlug}
              ddragon={ddragon}
              ahora={ahora}
              onVerTop={topDeTft(destacados, clave) ? () => setAbierta(clave) : null}
              refBoton={(el) => {
                botones.current[clave] = el;
              }}
            />
          </li>
        ))}
      </ul>

      {topAbierto && (
        <ModalTopDestacadoTft
          clave={abierta}
          titulo={TITULOS_TFT[abierta]}
          nota={nota}
          top={topAbierto}
          topGlobal={topGlobalDeTft(destacados, abierta)}
          porSlug={porSlug}
          ddragon={ddragon}
          ahora={ahora}
          onCerrar={cerrar}
        />
      )}
    </>
  );
}
