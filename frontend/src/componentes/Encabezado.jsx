import { fechaCompleta, haceCuanto, isoAMs } from "../logica/formato.js";

/**
 * Logo y antigüedad de los datos (RF-08).
 * `actualizado` es cuándo el recolector consultó a Riot, no cuándo cargó la página.
 */
export function Encabezado({ actualizado, ahora, falloActualizar }) {
  const ms = isoAMs(actualizado);
  return (
    <header className="border-b border-borde bg-fondo">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
        <h1 className="font-titulo text-2xl font-extrabold tracking-tight">
          <span aria-hidden="true" className="mr-1">
            🐸
          </span>
          LOL<span className="text-sapo">Sapo</span>
        </h1>
        <div className="text-right text-sm">
          <p className="text-texto-suave">
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
          </p>
          {falloActualizar && (
            <p role="status" className="text-xs text-texto-suave">
              <span aria-hidden="true" className="mr-1 text-derrota">
                ●
              </span>
              No se pudo actualizar, se reintentará en 2 minutos.
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
