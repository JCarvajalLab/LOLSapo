import { describe, expect, it } from "vitest";
import { claseWinrate, temporadaRanked, textoMaestria, WINRATE_BUENO, WINRATE_MALO } from "./formato.js";

describe("color del winrate", () => {
  it("usa umbrales con nombre", () => {
    expect(WINRATE_BUENO).toBe(55);
    expect(WINRATE_MALO).toBe(45);
  });

  it("verde desde 55, neutro de 45 a 54, rojo bajo 45", () => {
    expect(claseWinrate(70)).toBe("text-victoria");
    expect(claseWinrate(55)).toBe("text-victoria");
    expect(claseWinrate(54.9)).toBe("text-texto");
    expect(claseWinrate(45)).toBe("text-texto");
    expect(claseWinrate(44.9)).toBe("text-derrota");
    expect(claseWinrate(0)).toBe("text-derrota");
    expect(claseWinrate(null)).toBe("text-texto-suave");
  });
});

describe("temporada ranked", () => {
  it("usa el winrate entregado y suma las partidas", () => {
    expect(temporadaRanked({ victorias: 70, derrotas: 50, winrate: 58.3 })).toEqual({ winrate: 58.3, partidas: 120 });
  });

  it("calcula el winrate si viene null", () => {
    expect(temporadaRanked({ victorias: 40, derrotas: 60, winrate: null })).toEqual({ winrate: 40, partidas: 100 });
  });

  it("devuelve null sin rango, sin partidas o con el formato anterior", () => {
    expect(temporadaRanked(null)).toBeNull();
    expect(temporadaRanked({ victorias: 0, derrotas: 0 })).toBeNull();
    expect(temporadaRanked({ tier: "GOLD", division: "I", lp: 0 })).toBeNull();
  });
});

describe("maestría", () => {
  it("formatea nivel y puntos en notación compacta", () => {
    const m = textoMaestria({ nivel: 7, puntos: 150000 });
    expect(m.primeraVez).toBe(false);
    expect(m.corto).toBe("M7 · 150 mil pts");
    expect(m.titulo).toBe("Maestría 7 · 150.000 puntos");
  });

  it("nivel 0 es primera vez", () => {
    expect(textoMaestria({ nivel: 0, puntos: 0 })).toMatchObject({ primeraVez: true, corto: "Primera vez" });
  });

  it("null o sin nivel no muestra nada", () => {
    expect(textoMaestria(null)).toBeNull();
    expect(textoMaestria({ puntos: 10 })).toBeNull();
  });
});
