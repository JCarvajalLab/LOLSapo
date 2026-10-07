import { useState } from "react";
import { useAhora } from "./datos/useAhora.js";
import { useDatosLol } from "./datos/useDatosLol.js";
import { useDatosTft } from "./datos/useDatosTft.js";
import { isoAMs } from "./logica/formato.js";
import { useAmigosAbiertos, useAmigosAbiertosLocal } from "./rutas/useAmigosAbiertos.js";
import { useJuego } from "./rutas/useJuego.js";
import { Encabezado } from "./componentes/Encabezado.jsx";
import { EsqueletoPagina } from "./componentes/Esqueleto.jsx";
import { ErrorCarga, EstadoVacio } from "./componentes/Estados.jsx";
import { FilaAmigo, idBotonAmigo } from "./componentes/FilaAmigo.jsx";
import { ModalSinergia } from "./componentes/ModalSinergia.jsx";
import { Ranking } from "./componentes/Ranking.jsx";
import { SeccionDestacadosHoy } from "./componentes/SeccionDestacadosHoy.jsx";
import { SeccionDestacadosMes } from "./componentes/SeccionDestacadosMes.jsx";
import { SeccionDestacadosSemana } from "./componentes/SeccionDestacadosSemana.jsx";
import { SeccionEnPartida } from "./componentes/SeccionEnPartida.jsx";
import { idPanelJuego, idPestana } from "./componentes/SelectorJuego.jsx";
import { TituloSeccion } from "./componentes/TituloSeccion.jsx";
import { VistaTft } from "./componentes/VistaTft.jsx";

export default function App({ fetchFn }) {
  const { datos, cargando, error } = useDatosLol(fetchFn);
  const ahora = useAhora();
  const amigosAbiertos = useAmigosAbiertos();
  const { juego, cambiar } = useJuego();
  // tft.json solo se pide mientras se mira la pestaña TFT; lo cargado se conserva al volver.
  const tft = useDatosTft(fetchFn, juego === "tft");
  const amigosAbiertosTft = useAmigosAbiertosLocal();
  // El encabezado muestra la antigüedad de los datos del juego que se mira.
  const actual = juego === "tft" ? tft : { datos, cargando, error };

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
      <Encabezado
        actualizado={actual.datos?.actualizado}
        ahora={ahora}
        falloActualizar={Boolean(actual.error && actual.datos)}
        juego={juego}
        onCambiarJuego={cambiar}
      />

      <main id="contenido" tabIndex={-1} aria-busy={actual.cargando} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-12 focus:outline-none sm:pt-8">
        <PanelJuego clave="lol" activo={juego === "lol"}>
          <VistaLol datos={datos} error={error} ahora={ahora} {...amigosAbiertos} />
        </PanelJuego>
        <PanelJuego clave="tft" activo={juego === "tft"}>
          <VistaTft datos={tft.datos} error={tft.error} ahora={ahora} {...amigosAbiertosTft} />
        </PanelJuego>
      </main>

      <footer className="border-t border-borde">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs leading-relaxed text-texto-suave sm:flex-row sm:items-start sm:gap-6">
          <p aria-hidden="true" className="marcador shrink-0 text-base leading-none text-texto">
            LOL<span className="text-sapo">Sapo</span>
          </p>
          <p className="max-w-[72ch]">
            LOLSapo no está respaldado por Riot Games y no refleja las opiniones de Riot Games ni de nadie
            involucrado oficialmente en la producción o gestión de League of Legends. League of Legends y Riot Games
            son marcas registradas de Riot Games, Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Panel de una pestaña de juego. Solo se monta el contenido de la pestaña activa. */
function PanelJuego({ clave, activo, children }) {
  return (
    <div role="tabpanel" id={idPanelJuego(clave)} aria-labelledby={idPestana(clave)} hidden={!activo}>
      {activo && children}
    </div>
  );
}

/** Vista de League of Legends: la página principal. */
function VistaLol({ datos, error, ahora, abiertos, alternar, abrir, enfocar }) {
  // Sinergia abierta: { slug, origen } (origen = enlace del ranking que recibe el foco al cerrar).
  const [sinergiaDe, setSinergiaDe] = useState(null);

  if (error && !datos) return <ErrorCarga error={error} />;
  if (!datos) return <EsqueletoPagina />;

  const actualizadoMs = isoAMs(datos.actualizado);
  const amigoSinergia = sinergiaDe && datos.amigos.find((a) => a.slug === sinergiaDe.slug);

  // Sin sinergia en el JSON (archivo viejo), el ranking abre las partidas como antes.
  const alElegirRanking = (slug, origen) => {
    if (datos.sinergia) setSinergiaDe({ slug, origen });
    else abrir(slug);
  };
  const cerrarSinergia = () => {
    setSinergiaDe(null);
    sinergiaDe?.origen?.focus();
  };
  const verPartidas = () => {
    const { slug } = sinergiaDe;
    setSinergiaDe(null);
    abrir(slug);
    // El foco va al amigo abierto; el desplazamiento lo hace su fila.
    document.getElementById(idBotonAmigo(slug))?.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <SeccionEnPartida
        enVivo={datos.en_vivo}
        ddragon={datos.ddragon}
        amigos={datos.amigos}
        actualizadoMs={actualizadoMs}
        ahora={ahora}
      />

      <SeccionDestacadosHoy destacados={datos.destacados} amigos={datos.amigos} ddragon={datos.ddragon} ahora={ahora} />
      <SeccionDestacadosSemana destacados={datos.destacados} amigos={datos.amigos} ddragon={datos.ddragon} ahora={ahora} />
      <SeccionDestacadosMes destacados={datos.destacados} amigos={datos.amigos} ddragon={datos.ddragon} ahora={ahora} />

      <div className="grid gap-x-8 gap-y-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <Ranking ranking={datos.ranking} amigos={datos.amigos} onElegir={alElegirRanking} />

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
                  actualizadoMs={actualizadoMs}
                  abierto={abiertos.has(amigo.slug)}
                  onAlternar={alternar}
                  enfocar={enfocar?.slug === amigo.slug ? enfocar : null}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {amigoSinergia && (
        <ModalSinergia
          amigo={amigoSinergia}
          sinergia={datos.sinergia}
          amigos={datos.amigos}
          ddragon={datos.ddragon}
          onCerrar={cerrarSinergia}
          onVerPartidas={verPartidas}
        />
      )}
    </div>
  );
}
