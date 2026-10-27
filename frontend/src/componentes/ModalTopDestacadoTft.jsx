import { useState } from "react";
import { urlIconoPerfil } from "../logica/ddragon.js";
import { formatearWinrate } from "../logica/formato.js";
import { Barra } from "./Barra.jsx";
import { Dialogo } from "./Dialogo.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { PartidaDestacadaTft } from "./PiezasDestacadosTft.jsx";

const esPartida = (clave) => clave.startsWith("mejor_jugador") || clave.startsWith("peor_jugador");
const esMejor = (clave) => clave.startsWith("mejor_");

const VISTAS = [
  { clave: "global", etiqueta: "Global" },
  { clave: "jugador", etiqueta: "Por jugador" },
];

function ayudaVista(vista, mejor) {
  const adjetivo = mejor ? "mejor" : "peor";
  return vista === "global"
    ? `Global: las ${adjetivo}es partidas, aunque se repita un jugador`
    : `Por jugador: la ${adjetivo} partida de cada uno`;
}

export function ModalTopDestacadoTft({
  clave,
  titulo,
  nota,
  top,
  topGlobal = null,
  porSlug,
  ddragon,
  ahora,
  onCerrar,
}) {
  const [vista, setVista] = useState("global");
  const idTitulo = `titulo-top-tft-${clave}`;
  const conPestañas = Array.isArray(topGlobal) && topGlobal.length > 0;
  const global = conPestañas && vista === "global";
  const lista = global ? topGlobal : top;
  const maximo = Math.max(1, ...lista.map((e) => e.partidas ?? 0));

  return (
    <Dialogo
      idTitulo={idTitulo}
      onCerrar={onCerrar}
      titulo={
        <>
          <h2 id={idTitulo} className="titulo-seccion text-lg break-words">
            Top 5 <span className="text-texto-suave">·</span> {titulo}
          </h2>
          {nota && <p className="mt-1 text-xs break-words text-texto-suave">{nota}</p>}
        </>
      }
    >
      {conPestañas && (
        <div className="mb-3">
          <div role="group" aria-label="Vista del top" className="segmentos">
            {VISTAS.map((v) => {
              const activo = v.clave === vista;
              return (
                <button
                  key={v.clave}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setVista(v.clave)}
                  className="segmento min-h-9"
                >
                  {v.etiqueta}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-texto-suave">{ayudaVista(vista, esMejor(clave))}</p>
        </div>
      )}

      <ol className="cascada space-y-2.5">
        {lista.map((entrada, i) => (
          <FilaTopTft
            key={global ? `${i}-${entrada.partida_id ?? ""}` : entrada.amigos[0]}
            posicion={i + 1}
            amigo={porSlug.get(entrada.amigos[0])}
            slug={entrada.amigos[0]}
            ddragon={ddragon}
          >
            {esPartida(clave) ? (
              <PartidaDestacadaTft
                t={entrada}
                ddragon={ddragon}
                ahora={ahora}
                mejor={esMejor(clave)}
                compacta
              />
            ) : (
              <RecordTft
                t={entrada}
                porPartidas={clave.startsWith("mas_partidas")}
                maximo={maximo}
              />
            )}
          </FilaTopTft>
        ))}
      </ol>
    </Dialogo>
  );
}

function FilaTopTft({ posicion, amigo, slug, ddragon, children }) {
  const primero = posicion === 1;
  const riotId = amigo?.riot_id ?? slug;
  const nombre = amigo?.nombre || riotId;

  return (
    <li
      className={`rounded-lg border p-3 ${
        primero ? "border-sapo/50 bg-superficie shadow-xs" : "border-borde bg-superficie/60"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-borde/50 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`marcador text-base ${
              primero ? "text-sapo font-bold" : "text-texto-suave"
            }`}
          >
            #{posicion}
          </span>
          <ImagenDD
            src={urlIconoPerfil(ddragon, amigo?.perfil?.icono)}
            alt={`Ícono de ${riotId}`}
            respaldo={riotId}
            tamaño={24}
            redonda
          />
          <span className="truncate text-sm font-semibold">{nombre}</span>
        </div>
      </div>
      {children}
    </li>
  );
}

function RecordTft({ t, porPartidas, maximo }) {
  const porcentaje = t.top4_pct !== null && t.top4_pct !== undefined ? t.top4_pct : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="cifras font-semibold">
          {porPartidas ? (
            `${t.partidas} ${t.partidas === 1 ? "partida" : "partidas"}`
          ) : (
            <span className="text-victoria text-sm">{formatearWinrate(porcentaje)} Top 4</span>
          )}
        </span>
        <span className="cifras text-texto-suave">
          {t.top4} Top 4 · {t.partidas} {t.partidas === 1 ? "partida" : "partidas"}
          {t.promedio && ` · Promedio: ${t.promedio}`}
        </span>
      </div>
      <Barra valor={t.partidas} maximo={maximo} color="bg-victoria" />
    </div>
  );
}
