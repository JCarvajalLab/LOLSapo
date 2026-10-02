import { TituloSeccion } from "./TituloSeccion.jsx";

/**
 * Vista de Teamfight Tactics. Por ahora es un aviso: el contenido llega en la fase 6
 * (RF-11 a RF-14: rango, partidas y "jugando ahora" de TFT).
 */
export function VistaTft() {
  return (
    <section aria-labelledby="titulo-tft">
      <TituloSeccion id="titulo-tft">Teamfight Tactics</TituloSeccion>
      <div className="flex min-h-32 items-center justify-center rounded-lg border border-borde bg-superficie p-4">
        <p className="max-w-md text-center text-texto-suave">
          Próximamente: rango, top 4 y últimas 10 partidas de TFT de cada amigo.
        </p>
      </div>
    </section>
  );
}
