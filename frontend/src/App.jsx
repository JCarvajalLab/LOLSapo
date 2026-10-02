import { useAhora } from "./datos/useAhora.js";
import { useDatosLol } from "./datos/useDatosLol.js";
import { isoAMs } from "./logica/formato.js";
import { useAmigosAbiertos } from "./rutas/useAmigosAbiertos.js";
import { Encabezado } from "./componentes/Encabezado.jsx";
import { EsqueletoPagina } from "./componentes/Esqueleto.jsx";
import { ErrorCarga, EstadoVacio } from "./componentes/Estados.jsx";
import { FilaAmigo } from "./componentes/FilaAmigo.jsx";
import { Ranking } from "./componentes/Ranking.jsx";
import { SeccionEnPartida } from "./componentes/SeccionEnPartida.jsx";
import { TituloSeccion } from "./componentes/TituloSeccion.jsx";

export default function App({ fetchFn }) {
  const { datos, cargando, error } = useDatosLol(fetchFn);
  const ahora = useAhora();
  const { abiertos, alternar, abrir, enfocar } = useAmigosAbiertos();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("contenido")?.focus();
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded focus:bg-superficie focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <Encabezado actualizado={datos?.actualizado} ahora={ahora} falloActualizar={Boolean(error && datos)} />

      <main id="contenido" tabIndex={-1} aria-busy={cargando} className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-5 focus:outline-none">
        {error && !datos && <ErrorCarga error={error} />}

        {!datos && !error && <EsqueletoPagina />}

        {datos && (
          <>
            <SeccionEnPartida
              enVivo={datos.en_vivo}
              ddragon={datos.ddragon}
              amigos={datos.amigos}
              actualizadoMs={isoAMs(datos.actualizado)}
              ahora={ahora}
            />

            <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
              <Ranking ranking={datos.ranking} amigos={datos.amigos} onElegir={abrir} />

              <section aria-labelledby="titulo-amigos" className="min-w-0">
                <TituloSeccion id="titulo-amigos">Amigos</TituloSeccion>
                {datos.amigos.length === 0 ? (
                  <EstadoVacio>
                    No hay amigos configurados. Agrégalos en el archivo de configuración y ejecuta el script de datos.
                  </EstadoVacio>
                ) : (
                  <ul className="space-y-3">
                    {datos.amigos.map((amigo) => (
                      <FilaAmigo
                        key={amigo.slug}
                        amigo={amigo}
                        ddragon={datos.ddragon}
                        ahora={ahora}
                        actualizadoMs={isoAMs(datos.actualizado)}
                        abierto={abiertos.has(amigo.slug)}
                        onAlternar={alternar}
                        enfocar={enfocar?.slug === amigo.slug ? enfocar : null}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-borde px-4 py-4 text-center text-xs text-texto-suave">
        LOLSapo no está respaldado por Riot Games y no refleja las opiniones de Riot Games ni de nadie
        involucrado oficialmente en la producción o gestión de League of Legends. League of Legends y Riot Games
        son marcas registradas de Riot Games, Inc.
      </footer>
    </div>
  );
}
