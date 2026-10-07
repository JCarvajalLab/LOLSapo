import { useState } from "react";
import { urlIconoPerfil } from "../logica/ddragon.js";
import { esTopDePartida, plural } from "../logica/destacados.js";
import { anchoPartidas, esWinratePositivo, formatearTasa } from "../logica/sinergia.js";
import { Barra } from "./Barra.jsx";
import { Dialogo } from "./Dialogo.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { PartidaDestacada } from "./PartidaDestacada.jsx";

const esMejor = (clave) => clave.startsWith("mejor_jugador");

/** Pestañas del top de mejor/peor jugador: una entrada por amigo o las partidas del período. */
const VISTAS = [
  { clave: "jugador", etiqueta: "Por jugador" },
  { clave: "global", etiqueta: "Global" },
];

function ayudaVista(vista, mejor) {
  const adjetivo = mejor ? "mejor" : "peor";
  return vista === "global"
    ? `Global: las ${adjetivo}es partidas, aunque se repita un jugador`
    : `Por jugador: la ${adjetivo} partida de cada uno`;
}

/**
 * Top 5 del grupo de una tarjeta de destacados, en el `Dialogo` común (foco, Esc, clic fuera, ✕).
 * `top` ya viene validado y ordenado por el recolector (`logica/destacados.js`); la fila #1
 * es la de la tarjeta y va resaltada. Devolver el foco le toca a quien la abre.
 * Con `topGlobal` (mejor/peor jugador) aparecen las pestañas «Por jugador» (`top`, por
 * defecto) y «Global» (las mejores/peores partidas, aunque se repita un amigo).
 */
export function ModalTopDestacado({ clave, titulo, nota, top, topGlobal = null, porSlug, ddragon, ahora, onCerrar }) {
  const [vista, setVista] = useState("jugador");
  const idTitulo = `titulo-top-${clave}`;
  const conPestañas = Array.isArray(topGlobal) && topGlobal.length > 0;
  const global = conPestañas && vista === "global";
  const lista = global ? topGlobal : top;
  const maximo = Math.max(0, ...lista.map((e) => e.partidas ?? 0));
  return (
    <Dialogo
      idTitulo={idTitulo}
      onCerrar={onCerrar}
      titulo={
        <>
          <h2 id={idTitulo} className="font-titulo text-lg leading-tight font-bold break-words">
            Top 5 <span className="text-texto-suave">·</span> {titulo}
          </h2>
          {nota && <p className="mt-1 text-xs break-words text-texto-suave">{nota}</p>}
        </>
      }
    >
      {conPestañas && (
        <div className="mb-3">
          <div role="group" aria-label="Vista del top" className="inline-flex rounded-md border border-borde p-0.5">
            {VISTAS.map((v) => {
              const activo = v.clave === vista;
              return (
                <button
                  key={v.clave}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setVista(v.clave)}
                  className={`min-h-9 rounded px-3 py-1 text-sm ${
                    activo ? "bg-sapo-fondo font-semibold text-sapo" : "text-texto-suave hover:text-texto"
                  }`}
                >
                  {v.etiqueta}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-texto-suave">{ayudaVista(vista, esMejor(clave))}</p>
        </div>
      )}
      <ol className="space-y-2">
        {lista.map((entrada, i) => (
          <FilaTop
            key={global ? `${i}-${entrada.partida_id ?? ""}` : entrada.amigos[0]}
            posicion={i + 1}
            amigo={porSlug.get(entrada.amigos[0])}
            slug={entrada.amigos[0]}
            ddragon={ddragon}
          >
            {esTopDePartida(clave) ? (
              <PartidaDestacada t={entrada} ddragon={ddragon} ahora={ahora} mejor={esMejor(clave)} compacta />
            ) : (
              <Record t={entrada} porPartidas={clave === "mas_partidas"} maximo={maximo} />
            )}
          </FilaTop>
        ))}
      </ol>
    </Dialogo>
  );
}

/** Una fila numerada: «#1», ícono y nombre del amigo y debajo su partida o su récord. */
function FilaTop({ posicion, amigo, slug, ddragon, children }) {
  const primero = posicion === 1;
  const riotId = amigo?.riot_id ?? slug;
  const nombre = amigo?.nombre || riotId;
  return (
    <li
      data-primero={primero ? "" : undefined}
      className={`flex gap-2 rounded-md border p-2 sm:gap-3 ${
        primero ? "border-sapo/60 bg-sapo-fondo" : "border-borde bg-fondo"
      }`}
    >
      <span
        className={`cifras w-7 shrink-0 pt-0.5 font-titulo text-base font-bold ${primero ? "text-sapo" : "text-texto-suave"}`}
      >
        #{posicion}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex min-w-0 items-center gap-2">
          <ImagenDD
            src={urlIconoPerfil(ddragon, amigo?.perfil?.icono)}
            alt={`Ícono de ${riotId}`}
            respaldo={riotId}
            tamaño={24}
            redonda
          />
          <span className="min-w-0 font-semibold break-words">{nombre}</span>
        </p>
        {children}
      </div>
    </li>
  );
}

/**
 * Récord de un amigo: «3 V – 1 D · 75,0 % · 4 partidas» y una barra. En «Más partidas» la
 * barra es proporcional a las partidas (respecto del que más jugó); en el resto, al winrate
 * (verde desde 50 %). El texto dice siempre el número; la barra y el color solo lo refuerzan.
 */
function Record({ t, porPartidas, maximo }) {
  const positivo = esWinratePositivo(t.winrate);
  const colorTasa = positivo ? "text-victoria" : "text-derrota";
  return (
    <div>
      <p className="cifras flex flex-wrap items-baseline gap-x-2 text-sm">
        <span>
          <span aria-hidden="true">
            <span className="font-semibold text-victoria">{t.victorias} V</span> <span className="text-texto-suave">–</span>{" "}
            <span className="font-semibold text-derrota">{t.derrotas} D</span>
          </span>
          <span className="sr-only">
            {plural(t.victorias, "victoria")} y {plural(t.derrotas, "derrota")}
          </span>
        </span>
        <span data-tasa="" className={`font-semibold ${colorTasa}`}>
          {formatearTasa(t.winrate)}
        </span>
        <span className={porPartidas ? "font-semibold text-texto" : "text-texto-suave"}>{plural(t.partidas, "partida")}</span>
      </p>
      <div className="mt-1">
        {porPartidas ? (
          <Barra ancho={anchoPartidas(t.partidas, maximo)} clase="bg-ranked" />
        ) : (
          <Barra ancho={t.winrate} clase={positivo ? "bg-victoria" : "bg-derrota"} />
        )}
      </div>
    </div>
  );
}
