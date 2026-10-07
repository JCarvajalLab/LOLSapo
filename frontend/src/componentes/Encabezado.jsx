import { antiguedadDatos } from "../logica/antiguedad.js";
import { fechaCompleta, haceCuanto, isoAMs } from "../logica/formato.js";
import { SelectorJuego } from "./SelectorJuego.jsx";

/** Color del punto junto a la antigüedad: el texto ya dice cuánto hace; el punto solo lo refuerza. */
const PUNTO = {
  fresco: "bg-texto-suave",
  viejo: "bg-sapo",
  caduco: "bg-derrota",
};

/**
 * Logo y antigüedad de los datos (RF-08).
 * `actualizado` es cuándo el recolector consultó a Riot, no cuándo cargó la página.
 * Debajo van las pestañas de juego, siempre visibles. La antigüedad es la del juego que se mira.
 */
export function Encabezado({ actualizado, ahora, falloActualizar, juego = "lol", onCambiarJuego }) {
  const ms = isoAMs(actualizado);
  const { nivel } = antiguedadDatos(ms, ahora);
  const punto = falloActualizar ? PUNTO.caduco : ms ? PUNTO[nivel] : PUNTO.fresco;
  return (
    <header className="border-b border-borde">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-4 pb-2 sm:pt-5">
        <h1 className="marcador flex items-center gap-2 text-[1.75rem] leading-none">
          <span aria-hidden="true">🐸</span>
          <span>
            LOL<span className="text-sapo">Sapo</span>
          </span>
        </h1>
        <div className="text-sm">
          <p className="inline-flex items-center gap-2 rounded-full border border-borde bg-superficie px-3 py-1 text-texto-suave">
            <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${punto}`} data-punto-antiguedad={nivel} />
            <span>
              {ms ? (
                <>
                  Datos de Riot:{" "}
                  <time dateTime={actualizado} title={fechaCompleta(ms)} className="text-texto">
                    {haceCuanto(ms, ahora)}
                  </time>
                </>
              ) : (
                "Datos de Riot: sin fecha"
              )}
            </span>
          </p>
          {falloActualizar && (
            <p role="status" className="mt-1 text-right text-xs text-texto-suave">
              <span aria-hidden="true" className="mr-1 text-derrota">
                ●
              </span>
              No se pudo actualizar, se reintentará en 2 minutos.
            </p>
          )}
        </div>
      </div>
      <nav aria-label="Juego" className="mx-auto max-w-6xl px-4">
        <SelectorJuego juego={juego} onCambiar={onCambiarJuego ?? (() => {})} />
      </nav>
    </header>
  );
}
