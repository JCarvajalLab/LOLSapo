import {
  CLAVES_MES_TFT,
  destacadosVaciosTft,
  destacadosVigentesTft,
  mesCerradoTft,
  VACIO_MES_TFT,
} from "../logica/destacadosTft.js";
import { BloqueDestacadosTft, ListaDestacadosTft } from "./PiezasDestacadosTft.jsx";

const NOTA = "Partidas individuales y en dúo de TFT del mes";

/**
 * Destacados mensuales de TFT: métricas acumuladas del mes calendario.
 */
export function SeccionDestacadosMesTft({ destacados, amigos, ddragon, ahora }) {
  const mes = destacados?.mes;
  if (!mes) return null;

  const cerrado = mesCerradoTft(mes, ahora);
  const nota = `${NOTA} · ${
    cerrado ? "Mes cerrado; el actual aparece desde el día 4" : "Se actualiza hasta fin de mes"
  }`;
  const vigentes = destacadosVigentesTft(destacados, ahora);

  return (
    <BloqueDestacadosTft
      id="destacados-mes-tft"
      titulo={`Destacados de ${mes.nombre}${cerrado ? " (cerrado)" : ""} (TFT)`}
      nota={nota}
    >
      {destacadosVaciosTft(vigentes, CLAVES_MES_TFT) ? (
        <p className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-borde px-3 text-center text-sm text-texto-suave">
          {VACIO_MES_TFT}
        </p>
      ) : (
        <ListaDestacadosTft
          claves={CLAVES_MES_TFT}
          destacados={vigentes}
          amigos={amigos}
          ddragon={ddragon}
          ahora={ahora}
          nota={nota}
          claseLista="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        />
      )}
    </BloqueDestacadosTft>
  );
}
