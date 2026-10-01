import { fechaCompleta, haceCuanto, isoAMs } from "../logica/formato.js";

/** Logo, botón "Actualizar" y la marca de última actualización (RF-08). */
export function Encabezado({ actualizado, ahora, cargando, onActualizar }) {
  const ms = isoAMs(actualizado);
  return (
    <header className="border-b border-borde bg-fondo/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <h1 className="font-titulo text-2xl font-extrabold tracking-tight">
          <span aria-hidden="true" className="mr-1">
            🐸
          </span>
          LOL<span className="text-sapo">Sapo</span>
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <p className="text-texto-suave" aria-live="polite">
            {cargando ? (
              "Actualizando…"
            ) : ms ? (
              <>
                Actualizado{" "}
                <time dateTime={actualizado} title={fechaCompleta(ms)}>
                  {haceCuanto(ms, ahora)}
                </time>
              </>
            ) : (
              "Sin fecha de actualización"
            )}
          </p>
          <button
            type="button"
            onClick={onActualizar}
            disabled={cargando}
            className="rounded-md border border-sapo/60 px-3 py-1.5 font-semibold text-sapo hover:bg-sapo-fondo disabled:cursor-wait disabled:opacity-60"
          >
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>
    </header>
  );
}
