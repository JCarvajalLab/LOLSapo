import { describe, expect, it, vi } from "vitest";
import {
  costoUnidad,
  imagenTftValida,
  nombreCampeonTft,
  nombreDesdeId,
  nombreItemTft,
  nombreRasgoTft,
  urlCampeonTft,
  urlItemTft,
  urlRasgoTft,
} from "./ddragonTft.js";
import { cargarDatosTft, RUTA_DATOS_TFT, validarDatosTft } from "./datosTft.js";
import {
  claseCosto,
  estiloPuesto,
  estiloRasgo,
  formatearPromedio,
  ordenarAmigosTft,
  rasgosParaMostrar,
  resumenTftDe,
  resumenTft,
  textoPuesto,
  textoRangoTft,
  tierTurbo,
  top4DeRango,
} from "./tft.js";
import { FILTROS_TFT } from "./filtros.js";
import { crearDatosTft, ddragonTft } from "../test/fixtures/tft.js";

const BASE = "https://ddragon.leagueoflegends.com/cdn/99.1.1/img";

describe("URLs de Data Dragon para TFT", () => {
  it("arma las URLs de campeón, rasgo e ítem", () => {
    expect(urlCampeonTft(ddragonTft, "TFTX_Charca")).toBe(`${BASE}/tft-champion/TFTX_Charca.TFT_SetX.png`);
    expect(urlRasgoTft(ddragonTft, "TFTX_Anfibio")).toBe(`${BASE}/tft-trait/Trait_Icon_X_Anfibio.png`);
    expect(urlItemTft(ddragonTft, "TFTX_Espada")).toBe(`${BASE}/tft-item/TFTX_Espada.png`);
  });

  it("acepta solo nombres de archivo .png simples", () => {
    expect(imagenTftValida("TFT18_Sivir_splash_centered_61.TFT_Set18.png")).toBe(true);
    for (const malo of [
      "../x.png",
      "a/../../b.png",
      "carpeta/x.png",
      "https://evil.example/x.png",
      "//evil.example/x.png",
      "x.png?y=1",
      "x.png#z",
      ".oculto.png",
      "-x.png",
      "x.svg",
      "x.png.js",
      "a\\b.png",
      "x .png",
      "",
      null,
      42,
    ]) {
      expect(imagenTftValida(malo)).toBe(false);
    }
  });

  it("no arma URL con imagen, versión o id inválidos", () => {
    const dd = {
      ...ddragonTft,
      campeones: {
        TFTX_Malo: { nombre: "Malo", imagen: "../../secreto.png" },
        TFTX_Externo: { nombre: "Externo", imagen: "https://evil.example/x.png" },
      },
    };
    expect(urlCampeonTft(dd, "TFTX_Malo")).toBeNull();
    expect(urlCampeonTft(dd, "TFTX_Externo")).toBeNull();
    expect(urlCampeonTft({ ...ddragonTft, version: "../1" }, "TFTX_Charca")).toBeNull();
    expect(urlCampeonTft({ ...ddragonTft, version: "1.0/x" }, "TFTX_Charca")).toBeNull();
    expect(urlCampeonTft(ddragonTft, "../TFTX_Charca")).toBeNull();
    expect(urlCampeonTft(ddragonTft, "TFTX_NoExiste")).toBeNull();
    expect(urlRasgoTft(null, "TFTX_Anfibio")).toBeNull();
    expect(urlItemTft(undefined, "TFTX_Espada")).toBeNull();
    // Ids heredados del prototipo no cuentan como entradas.
    expect(urlCampeonTft(ddragonTft, "__proto__")).toBeNull();
  });

  it("usa el nombre de Data Dragon o uno legible a partir del id", () => {
    expect(nombreCampeonTft(ddragonTft, "TFTX_Nenufar")).toBe("Nenúfar");
    expect(nombreRasgoTft(ddragonTft, "TFTX_Unico")).toBe("Rey del Pantano");
    expect(nombreItemTft(null, "DA_InfinityEdge")).toBe("InfinityEdge");
    expect(nombreDesdeId("DA_18_Morgana")).toBe("Morgana");
    expect(nombreDesdeId("DA_Brambleback18")).toBe("Brambleback");
    expect(nombreDesdeId("DA_KogMaw18_AD")).toBe("KogMaw");
    expect(nombreDesdeId("DA_18_Maokai_UniqueTrait")).toBe("Maokai");
    expect(nombreDesdeId("TFT_Item_Rabadon")).toBe("Rabadon");
    expect(nombreDesdeId(null)).toBe("Desconocido");
  });

  it("toma el costo de Data Dragon o lo estima con la rareza", () => {
    expect(costoUnidad(ddragonTft, { id: "TFTX_Charca", rareza: 0 })).toBe(4);
    expect(costoUnidad(null, { id: "TFTX_Charca", rareza: 0 })).toBe(1);
    expect(costoUnidad(null, { id: "TFTX_Charca", rareza: 4 })).toBe(5);
    expect(costoUnidad(null, { id: "X", rareza: 6 })).toBe(5);
    expect(costoUnidad(null, { id: "X" })).toBeNull();
    expect(claseCosto(4)).toBe("border-costo-4");
    expect(claseCosto(null)).toBe("border-borde");
  });
});

describe("puesto, rango y rasgos", () => {
  it("colorea el puesto: 1.º dorado, 2.º a 4.º verde, 5.º a 8.º rojo", () => {
    expect(estiloPuesto(1).texto).toBe("text-oro");
    for (const p of [2, 3, 4]) expect(estiloPuesto(p).texto).toBe("text-victoria");
    for (const p of [5, 6, 7, 8]) expect(estiloPuesto(p).texto).toBe("text-derrota");
    for (const p of [0, 9, null, "1", 2.5]) expect(estiloPuesto(p).grupo).toBe("desconocido");
    expect(textoPuesto(1)).toBe("1.º");
    expect(textoPuesto(null)).toBe("—");
  });

  it("formatea promedio, top 4 y rangos", () => {
    expect(formatearPromedio(4.3)).toBe("4,3");
    expect(formatearPromedio(4)).toBe("4,0");
    expect(formatearPromedio(null)).toBe("—");
    expect(top4DeRango({ top4: 55, partidas: 100 })).toBe(55);
    expect(top4DeRango({ top4: 1, partidas: 3 })).toBe(33.3);
    expect(top4DeRango({ top4: 0, partidas: 0 })).toBeNull();
    expect(top4DeRango(null)).toBeNull();
    expect(textoRangoTft({ tier: "PLATINUM", division: "III", lp: 38 })).toBe("Platino III · 38 LP");
    expect(textoRangoTft(null)).toBeNull();
    expect(tierTurbo({ tier: "PURPLE" })).toEqual({ nombre: "Morado", clase: "text-costo-4" });
    expect(tierTurbo({ tier: "ORANGE" }).clase).toBe("text-naranja");
    expect(tierTurbo(null)).toBeNull();
  });

  it("pone los rasgos únicos al final y nombra el estilo", () => {
    const orden = rasgosParaMostrar(crearDatosTft().amigos[0].partidas[0].rasgos).map((r) => r.id);
    expect(orden).toEqual(["TFTX_Anfibio", "TFTX_Saltarin", "TFTX_Unico"]);
    expect(rasgosParaMostrar(null)).toEqual([]);
    expect(estiloRasgo(1).nombre).toBe("bronce");
    expect(estiloRasgo(4)).toEqual({ nombre: "prismático", fondo: "bg-rasgo-prisma" });
  });

  it("resume la fila de un amigo", () => {
    const [croac, renacuaja] = crearDatosTft().amigos;
    expect(resumenTft(croac)).toEqual({ rango: "Platino II", lp: 61, top4: 58.3, promedio: 3.9, partidas: 12 });
    expect(resumenTft(renacuaja)).toEqual({ rango: null, lp: null, top4: null, promedio: null, partidas: 0 });
    expect(resumenTft({})).toEqual({ rango: null, lp: null, top4: null, promedio: null, partidas: 0 });
  });
});

describe("lectura de tft.json", () => {
  it("rechaza un archivo sin amigos", () => {
    expect(() => validarDatosTft(null)).toThrow("formato esperado");
    expect(() => validarDatosTft({ amigos: "x" })).toThrow("formato esperado");
  });

  it("rellena lo que falta y conserva los avisos", () => {
    const d = validarDatosTft({ amigos: [{ slug: "a" }, null, { sin: "slug" }] });
    expect(d).toMatchObject({ error: null, en_vivo_disponible: true, ddragon: null, en_vivo: [], ranking: [] });
    expect(d.amigos).toHaveLength(1);
    const conAvisos = validarDatosTft({ amigos: [], error: "Falló Riot.", en_vivo_disponible: false });
    expect(conAvisos.error).toBe("Falló Riot.");
    expect(conAvisos.en_vivo_disponible).toBe(false);
  });

  it("pide la ruta relativa y trata 404 como sin datos", async () => {
    const fetchFn = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    await expect(cargarDatosTft(fetchFn)).rejects.toMatchObject({ tipo: "sin-datos" });
    expect(fetchFn).toHaveBeenCalledWith(RUTA_DATOS_TFT, { cache: "no-store" });
    expect(RUTA_DATOS_TFT).toBe("./datos/tft.json");
  });
});

/** Amigo mínimo inventado para probar el orden. */
const amigoOrden = (riot_id, partidas, top4_pct) => ({
  riot_id,
  slug: riot_id.toLowerCase(),
  estadisticas: { total: { partidas, top4_pct } },
});

describe("orden de amigos en TFT", () => {
  it("más partidas registradas primero", () => {
    const lista = [amigoOrden("Pocas#LAS", 3, 90), amigoOrden("Muchas#LAS", 40, 10), amigoOrden("Medio#LAS", 12, 50)];
    expect(ordenarAmigosTft(lista).map((a) => a.riot_id)).toEqual(["Muchas#LAS", "Medio#LAS", "Pocas#LAS"]);
  });

  it("empate en partidas: mayor top 4 % primero y sin dato al final", () => {
    const lista = [amigoOrden("Nulo#LAS", 10, null), amigoOrden("Bajo#LAS", 10, 20), amigoOrden("Alto#LAS", 10, 75)];
    expect(ordenarAmigosTft(lista).map((a) => a.riot_id)).toEqual(["Alto#LAS", "Bajo#LAS", "Nulo#LAS"]);
  });

  it("empate total: Riot ID alfabético sin distinguir mayúsculas", () => {
    const lista = [amigoOrden("zeta#LAS", 5, 40), amigoOrden("Beta#LAS", 5, 40), amigoOrden("alfa#LAS", 5, 40)];
    expect(ordenarAmigosTft(lista).map((a) => a.riot_id)).toEqual(["alfa#LAS", "Beta#LAS", "zeta#LAS"]);
  });

  it("dos sin top 4 % se ordenan por Riot ID", () => {
    const lista = [amigoOrden("Sapo#LAS", 0, null), amigoOrden("rana#LAS", 0, null)];
    expect(ordenarAmigosTft(lista).map((a) => a.riot_id)).toEqual(["rana#LAS", "Sapo#LAS"]);
  });

  it("tolera estadísticas faltantes (cuentan como 0 partidas) y no modifica la lista", () => {
    const sinDatos = { riot_id: "Vacio#LAS", slug: "vacio-las" };
    const lista = [sinDatos, amigoOrden("Uno#LAS", 1, null)];
    const copia = [...lista];
    expect(ordenarAmigosTft(lista).map((a) => a.riot_id)).toEqual(["Uno#LAS", "Vacio#LAS"]);
    expect(lista).toEqual(copia);
    expect(ordenarAmigosTft(null)).toEqual([]);
  });

  it("con el fixture: Croac (12), Lodo (3), Renacuaja (0)", () => {
    expect(ordenarAmigosTft(crearDatosTft().amigos).map((a) => a.slug)).toEqual(["croac-las", "lodo-las", "renacuaja-las"]);
  });
});

describe("filtros por modo en TFT", () => {
  const estadisticas = {
    total: { partidas: 13, primeros: 2, top4: 8, top4_pct: 61.5, promedio: 3.85 },
    por_modo: [
      { queue_id: 1100, nombre: "Clasificatoria", categoria: "ranked", partidas: 6, primeros: 1, top4: 4, top4_pct: 66.7, promedio: 3.5 },
      { queue_id: 1160, nombre: "Dúo dinámico", categoria: "ranked", partidas: 4, primeros: 1, top4: 2, top4_pct: 50, promedio: 4 },
      { queue_id: 1090, nombre: "Normal", categoria: "normal", partidas: 3, primeros: 0, top4: 2, top4_pct: 66.7, promedio: 4.2 },
    ],
  };

  it("las opciones de TFT no incluyen ARAM", () => {
    expect(FILTROS_TFT.map((f) => f.clave)).toEqual(["todos", "ranked", "normal", "otros"]);
  });

  it("Todos usa el total tal cual", () => {
    expect(resumenTftDe(estadisticas, "todos")).toEqual(estadisticas.total);
  });

  it("una categoría suma sus modos y pondera el promedio", () => {
    expect(resumenTftDe(estadisticas, "ranked")).toEqual({ partidas: 10, primeros: 2, top4: 6, top4_pct: 60, promedio: 3.7 });
    expect(resumenTftDe(estadisticas, "normal")).toEqual({ partidas: 3, primeros: 0, top4: 2, top4_pct: 66.7, promedio: 4.2 });
  });

  it("categoría sin modos o sin estadísticas: resumen vacío", () => {
    const vacio = { partidas: 0, primeros: 0, top4: 0, top4_pct: null, promedio: null };
    expect(resumenTftDe(estadisticas, "otros")).toEqual(vacio);
    expect(resumenTftDe(null, "ranked")).toEqual(vacio);
    expect(resumenTftDe({ total: null, por_modo: null }, "ranked")).toEqual(vacio);
  });
});
