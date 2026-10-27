import { useState } from "react";
import { formatearWinrate, isoAMs } from "../logica/formato.js";
import { ordenarAmigosTft, textoRangoTft } from "../logica/tft.js";
import { HASH_TFT } from "../rutas/hash.js";
import { EsqueletoPagina } from "./Esqueleto.jsx";
import { ErrorCarga, EstadoVacio } from "./Estados.jsx";
import { FilaAmigoTft, FilaAmigoTftEsqueleto } from "./FilaAmigoTft.jsx";
import { ModalStatsAmigoTft } from "./ModalStatsAmigoTft.jsx";
import { Ranking } from "./Ranking.jsx";
import { SeccionDestacadosMesTft } from "./SeccionDestacadosMesTft.jsx";
import { SeccionDestacadosSemanaTft } from "./SeccionDestacadosSemanaTft.jsx";
import { SeccionEnPartidaTft } from "./SeccionEnPartidaTft.jsx";
import { TituloSeccion } from "./TituloSeccion.jsx";

/**
 * Vista de Teamfight Tactics (RF-11 a RF-14), con la misma estructura que League:
 * aviso global si lo hay, "En partida", ranking y una fila por amigo con acordeón.
 */
export function VistaTft({ datos, error, ahora, abiertos, alternar, abrir, enfocar }) {
  const [modalAmigo, setModalAmigo] = useState(null);

  if (error && !datos) {
    if (error.tipo === "sin-datos") {
      return (
        <EstadoVacio>
          Todavía no hay datos de TFT. Corre el recolector (
          <code className="rounded bg-fondo px-1 text-texto">python -m lolsapo</code>) para generar datos/tft.json. La
          página revisa de nuevo cada 2 minutos.
        </EstadoVacio>
      );
    }
    return <ErrorCarga error={error} archivo="datos/tft.json" />;
  }
  if (!datos) return <EsqueletoPagina FilaEsqueleto={FilaAmigoTftEsqueleto} etiqueta="Cargando datos de TFT…" />;

  const actualizadoMs = isoAMs(datos.actualizado);

  const handleElegirRanking = (slug, enlace) => {
    const amigo = datos.amigos.find((a) => a.slug === slug);
    if (amigo) {
      setModalAmigo({ amigo, enlace });
    } else {
      abrir(slug, enlace);
    }
  };

  const handleCerrarModal = () => {
    const enlace = modalAmigo?.enlace;
    setModalAmigo(null);
    enlace?.focus?.();
  };

  const handleVerPartidas = () => {
    const slug = modalAmigo?.amigo?.slug;
    const enlace = modalAmigo?.enlace;
    setModalAmigo(null);
    if (slug) {
      abrir(slug, enlace);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      {datos.error && (
        <p role="status" data-tono="aviso" className="canto rounded-lg py-2.5 pr-3 pl-4 text-sm text-sapo" data-aviso-global="true">
          <span aria-hidden="true" className="mr-1">
            ⚠
          </span>
          {datos.error}
        </p>
      )}

      <SeccionEnPartidaTft
        enVivo={datos.en_vivo}
        disponible={datos.en_vivo_disponible}
        amigos={datos.amigos}
        ddragon={datos.ddragon}
        actualizadoMs={actualizadoMs}
        ahora={ahora}
      />

      {datos.destacados && (
        <>
          <SeccionDestacadosSemanaTft
            destacados={datos.destacados}
            amigos={datos.amigos}
            ddragon={datos.ddragon}
            ahora={ahora}
          />
          <SeccionDestacadosMesTft
            destacados={datos.destacados}
            amigos={datos.amigos}
            ddragon={datos.ddragon}
            ahora={ahora}
          />
        </>
      )}

      <div className="grid gap-x-8 gap-y-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <Ranking
          ranking={datos.ranking}
          amigos={datos.amigos}
          onElegir={handleElegirRanking}
          idTitulo="titulo-tft-ranking"
          detalle={detalleTft}
          hrefDe={() => HASH_TFT}
          criterio="Orden: rango de Ranked; sin rango, % de top 4."
        />

        <section aria-labelledby="titulo-tft-amigos" className="min-w-0">
          <TituloSeccion id="titulo-tft-amigos">Amigos</TituloSeccion>
          {datos.amigos.length === 0 ? (
            <EstadoVacio>
              No hay amigos configurados. Agrégalos en el archivo de configuración y ejecuta el script de datos.
            </EstadoVacio>
          ) : (
            <ul className="space-y-3">
              {ordenarAmigosTft(datos.amigos).map((amigo) => (
                <FilaAmigoTft
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

      {modalAmigo && (
        <ModalStatsAmigoTft
          amigo={modalAmigo.amigo}
          ddragon={datos.ddragon}
          onCerrar={handleCerrarModal}
          onVerPartidas={handleVerPartidas}
        />
      )}
    </div>
  );
}

/** Segunda línea del ranking: el rango de Ranked o, sin él, el % de top 4. */
export function detalleTft(fila, amigo) {
  if (fila.criterio === "rango") return textoRangoTft(amigo?.rangos?.ranked) ?? "Por rango";
  return `Sin Ranked · top 4 ${formatearWinrate(amigo?.estadisticas?.total?.top4_pct)}`;
}
