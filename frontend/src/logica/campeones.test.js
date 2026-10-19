import { describe, expect, it } from "vitest";
import { LINEAS, listaCampeones, obtenerBloqueCampeones, PERIODOS, resumenLineas } from "./campeones.js";

describe("campeones logic", () => {
  const mockCampeones = {
    global: {
      todo: {
        total_partidas: 10,
        campeones: [
          { campeon_id: 112, campeon: "Viktor", partidas: 6, winrate: 66.7, kda: 3.2 },
          { campeon_id: 115, campeon: "Ziggs", partidas: 4, winrate: 50.0, kda: 2.8 },
        ],
        por_linea: {
          MIDDLE: [
            { campeon_id: 112, campeon: "Viktor", partidas: 6, winrate: 66.7, kda: 3.2 },
          ],
          BOTTOM: [
            { campeon_id: 115, campeon: "Ziggs", partidas: 4, winrate: 50.0, kda: 2.8 },
          ],
        },
        resumen_lineas: {
          TOP: { posicion: "TOP", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
          JUNGLE: { posicion: "JUNGLE", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
          MIDDLE: { posicion: "MIDDLE", partidas: 6, victorias: 4, derrotas: 2, winrate: 66.7, porcentaje: 60.0 },
          BOTTOM: { posicion: "BOTTOM", partidas: 4, victorias: 2, derrotas: 2, winrate: 50.0, porcentaje: 40.0 },
          UTILITY: { posicion: "UTILITY", partidas: 0, victorias: 0, derrotas: 0, winrate: null, porcentaje: 0 },
        },
      },
      dias_30: {
        total_partidas: 4,
        campeones: [
          { campeon_id: 112, campeon: "Viktor", partidas: 4, winrate: 75.0, kda: 4.0 },
        ],
      },
    },
    por_amigo: {
      "johnadis-las": {
        todo: {
          total_partidas: 6,
          campeones: [
            { campeon_id: 112, campeon: "Viktor", partidas: 6, winrate: 66.7, kda: 3.2 },
          ],
        },
      },
    },
  };

  it("obtiene bloques correctamente para global y por amigo", () => {
    expect(obtenerBloqueCampeones(null)).toBeNull();
    expect(obtenerBloqueCampeones(mockCampeones, "global", "todo")?.total_partidas).toBe(10);
    expect(obtenerBloqueCampeones(mockCampeones, "global", "dias_30")?.total_partidas).toBe(4);
    expect(obtenerBloqueCampeones(mockCampeones, "johnadis-las", "todo")?.total_partidas).toBe(6);
    // Periodo no existente hace fallback a todo
    expect(obtenerBloqueCampeones(mockCampeones, "johnadis-las", "dias_90")?.total_partidas).toBe(6);
  });

  it("lista campeones filtrando por línea o total", () => {
    const bloque = obtenerBloqueCampeones(mockCampeones, "global", "todo");
    expect(listaCampeones(bloque)).toHaveLength(2);
    expect(listaCampeones(bloque, "MIDDLE")).toHaveLength(1);
    expect(listaCampeones(bloque, "TOP")).toHaveLength(0);
    expect(listaCampeones(null)).toEqual([]);
  });

  it("genera resumen de líneas completo", () => {
    const bloque = obtenerBloqueCampeones(mockCampeones, "global", "todo");
    const resumen = resumenLineas(bloque);
    expect(resumen).toHaveLength(5);
    const mid = resumen.find((r) => r.posicion === "MIDDLE");
    expect(mid.partidas).toBe(6);
    expect(mid.porcentaje).toBe(60.0);
  });

  it("constantes definidas", () => {
    expect(PERIODOS).toHaveLength(4);
    expect(LINEAS).toHaveLength(5);
  });
});
