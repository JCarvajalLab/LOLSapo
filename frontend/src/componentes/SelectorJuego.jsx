import { useRef } from "react";

export const JUEGOS = [
  { clave: "lol", etiqueta: "League of Legends" },
  { clave: "tft", etiqueta: "TFT" },
];

export const idPestana = (clave) => `pestana-${clave}`;
export const idPanelJuego = (clave) => `vista-${clave}`;

/**
 * Pestañas League of Legends | TFT con el patrón accesible de tablist:
 * flechas izquierda y derecha (y Inicio/Fin) mueven el foco y activan la pestaña.
 */
export function SelectorJuego({ juego, onCambiar }) {
  const refs = useRef({});

  function alTeclear(e) {
    const actual = JUEGOS.findIndex((j) => j.clave === juego);
    let siguiente = null;
    if (e.key === "ArrowRight") siguiente = (actual + 1) % JUEGOS.length;
    if (e.key === "ArrowLeft") siguiente = (actual - 1 + JUEGOS.length) % JUEGOS.length;
    if (e.key === "Home") siguiente = 0;
    if (e.key === "End") siguiente = JUEGOS.length - 1;
    if (siguiente === null) return;
    e.preventDefault();
    const clave = JUEGOS[siguiente].clave;
    onCambiar(clave);
    refs.current[clave]?.focus();
  }

  return (
    <div role="tablist" aria-label="Juego" className="-ml-3 flex gap-2" onKeyDown={alTeclear}>
      {JUEGOS.map((j) => {
        const activo = j.clave === juego;
        return (
          <button
            key={j.clave}
            ref={(el) => {
              refs.current[j.clave] = el;
            }}
            type="button"
            role="tab"
            id={idPestana(j.clave)}
            aria-selected={activo}
            aria-controls={idPanelJuego(j.clave)}
            tabIndex={activo ? 0 : -1}
            onClick={() => onCambiar(j.clave)}
            className={`pestana min-h-11 px-3 font-titulo text-[0.9375rem] font-bold ${
              activo ? "text-texto" : "text-texto-suave hover:text-texto"
            }`}
          >
            {j.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
