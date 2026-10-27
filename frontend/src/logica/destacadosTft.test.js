import { describe, expect, it } from "vitest";
import {
  CLAVES_SEMANA_TFT,
  destacadosVaciosTft,
  destacadosVigentesTft,
  mesCerradoTft,
  mesVencidoTft,
  semanaVencidaTft,
  topDeTft,
  topGlobalDeTft,
} from "./destacadosTft.js";

describe("destacadosTft", () => {
  const AHORA = 1790884800000;
  const DIA = 24 * 3600 * 1000;

  it("identifica semana vencida tras 7 días", () => {
    expect(semanaVencidaTft(AHORA - 8 * DIA, AHORA)).toBe(true);
    expect(semanaVencidaTft(AHORA - 5 * DIA, AHORA)).toBe(false);
    expect(semanaVencidaTft(null, AHORA)).toBe(false);
  });

  it("identifica mes cerrado y vencido", () => {
    const mes = { desde: AHORA - 20 * DIA, hasta: AHORA - 2 * DIA, cerrado: false };
    expect(mesCerradoTft(mes, AHORA)).toBe(true);
    expect(mesVencidoTft(mes, AHORA)).toBe(false); // apenas 2 días, sigue visible
    expect(mesVencidoTft(mes, AHORA + 2 * DIA)).toBe(true); // 4 días (> 3 días cerrado)
  });

  it("comprueba si los destacados están vacíos", () => {
    expect(destacadosVaciosTft(null, CLAVES_SEMANA_TFT)).toBe(true);
    expect(destacadosVaciosTft({}, CLAVES_SEMANA_TFT)).toBe(true);
    expect(destacadosVaciosTft({ mejor_jugador_semana: { puesto: 1 } }, CLAVES_SEMANA_TFT)).toBe(false);
  });

  it("destacadosVigentes vacía semana si está vencida", () => {
    const d = {
      semana_desde: AHORA - 8 * DIA,
      mejor_jugador_semana: { puesto: 1 },
      mejor_jugador_mes: { puesto: 1 },
      mes: { hasta: AHORA + 10 * DIA },
    };
    const vigentes = destacadosVigentesTft(d, AHORA);
    expect(vigentes.mejor_jugador_semana).toBeNull();
    expect(vigentes.mejor_jugador_mes).toEqual({ puesto: 1 });
  });

  it("obtiene tops y tops globales", () => {
    const d = {
      mejor_jugador_semana: { puesto: 1 },
      tops: { mejor_jugador_semana: [{ puesto: 1 }] },
      tops_global: { mejor_jugador_semana: [{ puesto: 1 }, { puesto: 2 }] },
    };
    expect(topDeTft(d, "mejor_jugador_semana")).toHaveLength(1);
    expect(topGlobalDeTft(d, "mejor_jugador_semana")).toHaveLength(2);
    expect(topDeTft(d, "inexistente")).toBeNull();
  });
});
