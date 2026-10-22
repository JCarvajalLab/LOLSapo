import { useState } from "react";
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
import { datosResultado } from "./Etiquetas.jsx";
import { ImagenDD } from "./ImagenDD.jsx";
import { ModalDetallePartida } from "./ModalDetallePartida.jsx";
import {
  ContenidoTooltipArbolRunas,
  ContenidoTooltipItem,
  ContenidoTooltipRuna,
  ElementoConTooltip,
} from "./TooltipFlotante.jsx";

const RESULTADOS_CONOCIDOS = new Set(["victoria", "derrota", "remake"]);

/**
 * Fila compacta de partida estilo OP.GG (vista compilada/condensada).
 * Fila horizontal delgada (~38px) con campeón, hechizos, runas, resultado, KDA,
 * CS, KP, 7 ítems en línea horizontal, tiempos y botón de análisis.
 * Toda la fila abre el modal de detalle al hacer clic o pulsar Enter/Espacio.
 */
export function FilaPartidaCompacta({ partida, ddragon, ahora, slugPropio }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const p = partida ?? {};
  const campeon = nombreCampeon(ddragon, p.campeon_id, p.campeon);
  const r = datosResultado(p.resultado);
  const ratio = ratioKda(p.asesinatos, p.muertes, p.asistencias);
  const hayKda = ratio !== null;
  const porMinuto = csPorMinuto(p.cs, p.duracion);
  const hechizos = Array.isArray(p.hechizos) ? p.hechizos.slice(0, 2) : [];
  const runas = p.runas && typeof p.runas === "object" ? [p.runas.principal, p.runas.secundaria] : [];

  const alHacerClic = () => {
    setModalAbierto(true);
  };

  const alTeclear = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setModalAbierto(true);
    }
  };

  return (
    <>
      <article
        tabIndex={0}
        aria-label={`${campeon}, ${p.modo || "Partida"}, ${r.texto}`}
        aria-haspopup="dialog"
        data-resultado={RESULTADOS_CONOCIDOS.has(p.resultado) ? p.resultado : undefined}
        onClick={alHacerClic}
        onKeyDown={alTeclear}
        className="canto group flex items-center justify-between gap-2 sm:gap-3 rounded py-1.5 px-2 cursor-pointer transition-all hover:brightness-110 hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-dorado/50 select-none text-xs w-full overflow-x-auto sm:overflow-visible"
      >
        {/* Métricas e Ítems alineados en una sola fila continua */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          {/* Campeón, nivel, hechizos y runas compactos */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="relative shrink-0">
              <ImagenDD
                src={urlCampeon(ddragon, p.campeon_id, p.campeon)}
                alt={campeon}
                tamaño={34}
                className="size-8.5 rounded border border-borde/60 shadow-sm"
              />
              {esNumero(p.nivel) && (
                <span
                  className="cifras absolute -right-1 -bottom-1 rounded-full border border-borde bg-fondo px-1 text-[9.5px] leading-3 font-semibold"
                  aria-label={`Nivel ${p.nivel}`}
                >
                  {p.nivel}
                </span>
              )}
            </span>

            {/* Hechizos (2 apilados verticalmente) */}
            {hechizos.length > 0 && (
              <span className="flex flex-col gap-0.5 shrink-0">
                {hechizos.map((h, i) => (
                  <ImagenDD
                    key={i}
                    src={urlHechizo(ddragon, h)}
                    alt={nombreHechizo(ddragon, h)}
                    tamaño={15}
                    className="size-3.5 rounded-sm"
                  />
                ))}
              </span>
            )}

            {/* Runas (2 apiladas verticalmente con tooltips) */}
            {runas.some((ru) => ru !== null && ru !== undefined) && (
              <span className="flex flex-col gap-0.5 shrink-0">
                {runas.map((ru, i) =>
                  ru ? (
                    <ElementoConTooltip
                      key={i}
                      tooltip={
                        i === 0 && (p.runas?.primarias || p.runas?.secundarias) ? (
                          <ContenidoTooltipArbolRunas runas={p.runas} ddragon={ddragon} />
                        ) : (
                          <ContenidoTooltipRuna runaId={ru} ddragon={ddragon} />
                        )
                      }
                    >
                      <ImagenDD
                        src={urlRuna(ddragon, ru)}
                        alt={nombreRuna(ddragon, ru)}
                        sinTitulo
                        tamaño={15}
                        redonda
                        className="size-3.5"
                      />
                    </ElementoConTooltip>
                  ) : null,
                )}
              </span>
            )}
          </div>

          {/* Resultado y Modo de juego */}
          <div className="flex flex-col min-w-[70px] sm:min-w-[85px] max-w-[120px] shrink-0">
            <span className={`font-bold leading-tight ${r.clase}`}>
              {r.texto}
            </span>
            <span
              className="text-[10px] sm:text-[10.5px] text-texto-suave truncate mt-0.5"
              title={p.modo || "Partida"}
            >
              {p.modo || "Partida"}
            </span>
          </div>

          {/* KDA */}
          <div className="flex flex-col min-w-[60px] sm:min-w-[70px] shrink-0">
            <span className="cifras font-semibold leading-tight text-[11px] sm:text-xs whitespace-nowrap">
              {hayKda ? (
                <>
                  <span className="text-victoria">{p.asesinatos}</span>{" "}
                  <span className="font-normal text-texto-suave/60">/</span>{" "}
                  <span className="text-derrota">{p.muertes}</span>{" "}
                  <span className="font-normal text-texto-suave/60">/</span>{" "}
                  <span className="text-sapo">{p.asistencias}</span>
                </>
              ) : (
                "—"
              )}
            </span>
            <span className="cifras text-[10px] sm:text-[10.5px] text-texto-suave whitespace-nowrap mt-0.5">
              {hayKda ? (ratio === "Perfecto" ? "KDA perfecto" : `${ratio} KDA`) : ""}
            </span>
          </div>

          {/* CS / Súbditos */}
          <div className="flex flex-col min-w-[50px] sm:min-w-[58px] shrink-0">
            <span className="cifras font-semibold leading-tight text-texto text-[11px] sm:text-xs whitespace-nowrap">
              {esNumero(p.cs) ? `${p.cs} CS` : "—"}
            </span>
            <span className="cifras text-[10px] sm:text-[10.5px] text-texto-suave whitespace-nowrap mt-0.5">
              {porMinuto ? `${porMinuto}/min` : "—"}
            </span>
          </div>

          {/* Participación en asesinatos (KP) */}
          <div className="flex flex-col min-w-[45px] sm:min-w-[54px] shrink-0">
            <span className="cifras font-semibold leading-tight text-texto text-[11px] sm:text-xs whitespace-nowrap">
              {esNumero(p.participacion) ? `${Math.round(p.participacion)}%` : "—"}
            </span>
            <span className="text-[10px] sm:text-[10.5px] text-texto-suave whitespace-nowrap mt-0.5">
              P. en ases.
            </span>
          </div>

          {/* 6 Ítems + Centinela en una sola fila continua, inmediatamente al lado de KP */}
          <div className="shrink-0">
            <ItemsCompactos items={p.items} ddragon={ddragon} />
          </div>
        </div>

        {/* Lado derecho: Duración/Fecha y Botón análisis */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto pl-2 border-l border-borde/40">
          {/* Tiempos: Duración y Antigüedad */}
          <div className="hidden sm:flex flex-col items-end text-right text-[10px] sm:text-[10.5px] text-texto-suave cifras whitespace-nowrap min-w-[50px]">
            <span className="font-semibold text-texto/85 leading-tight">{formatearDuracion(p.duracion)}</span>
            <time
              dateTime={esNumero(p.fecha) ? new Date(p.fecha).toISOString() : undefined}
              title={fechaCompleta(p.fecha)}
              className="mt-0.5 leading-tight text-texto-suave/80"
            >
              {haceCuanto(p.fecha, ahora)}
            </time>
          </div>

          {/* Botón de análisis / gráfico (abre el modal) */}
          <button
            type="button"
            aria-label={`Ver detalles de la partida con ${campeon}`}
            title="Ver detalles completos de la partida"
            onClick={(e) => {
              e.stopPropagation();
              setModalAbierto(true);
            }}
            className="flex size-6.5 sm:size-7 items-center justify-center rounded border border-borde/60 bg-superficie/60 text-texto-suave hover:border-sapo/60 hover:text-sapo hover:bg-superficie-alta transition-colors shrink-0"
          >
            <svg
              viewBox="0 0 16 16"
              className="size-3.5 fill-current"
              aria-hidden="true"
            >
              <rect x="2" y="9" width="3" height="5" rx="0.5" />
              <rect x="6.5" y="5" width="3" height="9" rx="0.5" />
              <rect x="11" y="2" width="3" height="12" rx="0.5" />
            </svg>
          </button>
        </div>
      </article>

      {modalAbierto && (
        <ModalDetallePartida
          partida={p}
          ddragon={ddragon}
          ahora={ahora}
          slugPropio={slugPropio}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </>
  );
}

/** 6 ítems + centinela colocados en una única fila horizontal */
function ItemsCompactos({ items, ddragon }) {
  if (!Array.isArray(items)) return null;
  const espacios = Array.from({ length: 7 }, (_, i) => (Number.isInteger(items[i]) ? items[i] : 0));

  return (
    <ul className="flex items-center gap-0.5" aria-label="Ítems de la partida">
      {espacios.map((id, i) =>
        id > 0 ? (
          <li key={i} className={i === 6 ? "ml-1" : undefined}>
            <ElementoConTooltip
              tooltip={<ContenidoTooltipItem itemId={id} ddragon={ddragon} />}
            >
              <ImagenDD
                src={urlItem(ddragon, id)}
                alt={nombreItem(ddragon, id)}
                sinTitulo
                tamaño={20}
                className={`size-5 rounded ${i === 6 ? "rounded-full ring-1 ring-borde/60" : "border border-borde/60"}`}
              />
            </ElementoConTooltip>
          </li>
        ) : (
          <li key={i} className={i === 6 ? "ml-1" : undefined}>
            <span
              role="img"
              aria-label="Espacio vacío"
              className={`block size-5 border border-borde/60 bg-fondo/70 ${
                i === 6 ? "rounded-full" : "rounded"
              }`}
            />
          </li>
        ),
      )}
    </ul>
  );
}
