import { useState } from "react";
import { urlIconoPerfil } from "../logica/ddragon.js";
import { formatearWinrate } from "../logica/formato.js";
import { Barra } from "./Barra.jsx";
import { Dialogo } from "./Dialogo.jsx";
import { BarraWinrate } from "./Etiquetas.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { PartidaDestacadaTft } from "./PiezasDestacadosTft.jsx";

const esPartida = (clave) => clave.startsWith("mejor_jugador") || clave.startsWith("peor_jugador");
const esMejor = (clave) => clave.startsWith("mejor_");

const VISTAS = [
  { clave: "global", etiqueta: "Global" },
  { clave: "jugador", etiqueta: "Por jugador" },
];

function ayudaVista(vista, mejor) {
  if (vista === "info") return "Criterio de desempate para elegir la peor actuación";
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
  const [mostrarInfo, setMostrarInfo] = useState(false);
  const idTitulo = `titulo-top-tft-${clave}`;
  const conPestañas = Array.isArray(topGlobal) && topGlobal.length > 0;
  const global = conPestañas && vista === "global";
  const lista = global ? topGlobal : top;
  const maximo = Math.max(1, ...lista.map((e) => e.partidas ?? 0));
  const esPeorJugador = clave.startsWith("peor_jugador");

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
      {conPestañas ? (
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2">
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

            {esPeorJugador && (
              <button
                type="button"
                onClick={() => setMostrarInfo((prev) => !prev)}
                aria-expanded={mostrarInfo}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  mostrarInfo
                    ? "border-sapo bg-sapo-fondo text-sapo"
                    : "border-borde bg-superficie text-texto-suave hover:border-sapo/60 hover:text-texto"
                }`}
              >
                <span aria-hidden="true" className="font-bold">ℹ</span>
                <span>¿Cómo funciona?</span>
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-texto-suave">{ayudaVista(vista, esMejor(clave))}</p>
        </div>
      ) : (
        esPeorJugador && (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => setMostrarInfo((prev) => !prev)}
              aria-expanded={mostrarInfo}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                mostrarInfo
                  ? "border-sapo bg-sapo-fondo text-sapo"
                  : "border-borde bg-superficie text-texto-suave hover:border-sapo/60 hover:text-texto"
              }`}
            >
              <span aria-hidden="true" className="font-bold">ℹ</span>
              <span>¿Cómo funciona?</span>
            </button>
          </div>
        )
      )}

      {esPeorJugador && mostrarInfo && (
        <div
          role="region"
          aria-label="Información del criterio"
          className="relative mb-3 rounded-lg border border-sapo/50 bg-superficie-alta p-3.5 shadow-lg shadow-black/40 ring-1 ring-sapo/30"
        >
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-borde/60 pb-2">
            <div className="flex items-center gap-1.5 font-semibold text-sapo text-xs sm:text-sm">
              <span aria-hidden="true" className="text-base leading-none">ℹ</span>
              <h4>¿Cómo se calcula el puesto más bajo?</h4>
            </div>
            <button
              type="button"
              onClick={() => setMostrarInfo(false)}
              aria-label="Cerrar información"
              className="flex size-6 items-center justify-center rounded text-texto-suave hover:bg-superficie hover:text-texto text-xs"
            >
              ✕
            </button>
          </div>
          <p className="mb-2 text-xs text-texto-suave leading-relaxed">
            Las partidas se ordenan de peor a mejor siguiendo estos criterios en estricto orden:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-texto-suave">
            <li>
              <strong className="text-texto font-medium">Puesto oficial obtenido:</strong> El puesto de la partida es el factor rey. Un <strong>8.º puesto</strong> (primer eliminado) siempre es peor que un <strong>7.º puesto</strong>, sin importar cuánto duró la partida.
            </li>
            <li>
              <strong className="text-texto font-medium">Ronda de eliminación (supervivencia):</strong> Si dos amigos sacaron el mismo puesto (ej. ambos quedaron 8.º), queda peor quien cayó en una <strong>ronda más temprana</strong> (aguantó menos tiempo con vida).
            </li>
            <li>
              <strong className="text-texto font-medium">Menor daño a rivales:</strong> A igual puesto y ronda, va primero quien infligió menos daño total a otros jugadores.
            </li>
            <li>
              <strong className="text-texto font-medium">Partida más reciente:</strong> Si empatan en todo lo anterior, se muestra la más reciente.
            </li>
          </ol>
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
                _mejor={esMejor(clave)}
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
      {porPartidas ? (
        <Barra ancho={(t.partidas / (maximo || 1)) * 100} clase="bg-victoria" />
      ) : (
        <BarraWinrate winrate={porcentaje} />
      )}
    </div>
  );
}
