import { describe, expect, it } from "vitest";
import {
  calcularWinrate,
  csPorMinuto,
  formatearDuracion,
  formatearWinrate,
  haceCuanto,
  iniciales,
  isoAMs,
  nombreRango,
  ratioKda,
  textoRangoLp,
} from "./formato.js";
import { filtrarPartidas, modosDe, resumenDe, categoriaDe } from "./filtros.js";
import { urlCampeon, urlHechizo, urlIconoPerfil, urlItem, urlRuna, nombreCampeon } from "./ddragon.js";
import { agruparPorEquipo, equiposEnVivo, minutosEnPartida, nombreEquipo, nombresAmigos } from "./partidas.js";
import { cargarDatos, validarDatos } from "./datos.js";
import { hashDeAmigo, slugDesdeHash } from "../rutas/hash.js";
import { AHORA, crearDatos, ddragon, partidaAram, partidaCompleta, partidaEnVivo, partidaRanked } from "../test/fixtures/lol.js";

describe("formato", () => {
  it("traduce el rango a español", () => {
    expect(nombreRango({ tier: "PLATINUM", division: "IV" })).toBe("Platino IV");
    expect(nombreRango({ tier: "MASTER", division: null })).toBe("Maestro");
    expect(nombreRango(null)).toBeNull();
  });

  it("calcula y formatea winrate", () => {
    expect(calcularWinrate(3, 1)).toBe(75);
    expect(calcularWinrate(0, 0)).toBeNull();
    expect(formatearWinrate(36.8)).toBe("37%");
    expect(formatearWinrate(null)).toBe("—");
  });

  it("calcula el ratio KDA y el KDA perfecto", () => {
    expect(ratioKda(17, 6, 3)).toBe("3.33");
    expect(ratioKda(5, 0, 12)).toBe("Perfecto");
    expect(ratioKda(undefined, 1, 1)).toBeNull();
  });

  it("formatea duración y CS por minuto", () => {
    expect(formatearDuracion(31 * 60 + 4)).toBe("31 min");
    expect(formatearDuracion(40)).toBe("40 s");
    expect(formatearDuracion(null)).toBe("—");
    expect(csPorMinuto(177, 1864)).toBe("5.7");
    expect(csPorMinuto(10, 30)).toBeNull();
  });

  it("dice hace cuánto pasó algo", () => {
    expect(haceCuanto(AHORA - 18 * 3600 * 1000, AHORA)).toBe("hace 18 horas");
    expect(haceCuanto(AHORA - 10 * 1000, AHORA)).toBe("ahora");
    expect(haceCuanto(null, AHORA)).toBe("—");
  });

  it("convierte ISO y saca iniciales", () => {
    expect(isoAMs("2026-10-01T18:00:00Z")).toBe(AHORA);
    expect(isoAMs("basura")).toBeNull();
    expect(iniciales("Miss Fortune")).toBe("MF");
    expect(iniciales("Rana Azul#LAS")).toBe("RA");
    expect(iniciales("")).toBe("?");
  });
});

describe("filtros por modo", () => {
  const partidas = [partidaCompleta, partidaRanked, partidaAram, { id: "x", categoria: "arena" }];

  it("filtra partidas por categoría", () => {
    expect(filtrarPartidas(partidas, "todos")).toHaveLength(4);
    expect(filtrarPartidas(partidas, "ranked").map((p) => p.id)).toEqual(["LA2_2"]);
    expect(filtrarPartidas(partidas, "normal").map((p) => p.id)).toEqual(["LA2_1"]);
    expect(filtrarPartidas(partidas, "aram").map((p) => p.id)).toEqual(["LA2_3"]);
    expect(filtrarPartidas(partidas, "otros").map((p) => p.id)).toEqual(["x"]);
    expect(filtrarPartidas(undefined, "todos")).toEqual([]);
  });

  it("manda categorías desconocidas a otros", () => {
    expect(categoriaDe({ categoria: "arena" })).toBe("otros");
    expect(categoriaDe({})).toBe("otros");
  });

  it("entrega el resumen y los modos del filtro", () => {
    const est = crearDatos().amigos[0].estadisticas;
    expect(resumenDe(est, "todos").partidas).toBe(3);
    expect(resumenDe(est, "ranked").winrate).toBe(100);
    expect(resumenDe(null, "ranked")).toEqual({ partidas: 0, victorias: 0, derrotas: 0, remakes: 0, winrate: null });
    expect(resumenDe({ total: {}, por_categoria: {} }, "otros").partidas).toBe(0);
    expect(modosDe(est, "aram").map((m) => m.nombre)).toEqual(["ARAM"]);
    expect(modosDe(est, "todos")).toHaveLength(3);
    expect(modosDe(undefined, "todos")).toEqual([]);
  });
});

describe("Data Dragon", () => {
  it("arma URLs solo del dominio oficial", () => {
    expect(urlCampeon(ddragon, 21)).toBe("https://ddragon.leagueoflegends.com/cdn/16.1.1/img/champion/MissFortune.png");
    expect(urlIconoPerfil(ddragon, 29)).toBe("https://ddragon.leagueoflegends.com/cdn/16.1.1/img/profileicon/29.png");
    expect(urlItem(ddragon, 1001)).toBe("https://ddragon.leagueoflegends.com/cdn/16.1.1/img/item/1001.png");
    expect(urlHechizo(ddragon, 4)).toBe("https://ddragon.leagueoflegends.com/cdn/16.1.1/img/spell/SummonerFlash.png");
    expect(urlRuna(ddragon, 8112)).toBe(
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Domination/Electrocute/Electrocute.png",
    );
  });

  it("devuelve null ante datos ausentes o sospechosos", () => {
    expect(urlCampeon(null, 21)).toBeNull();
    expect(urlItem(ddragon, 0)).toBeNull();
    expect(urlCampeon({ ...ddragon, version: "../evil" }, 21)).toBeNull();
    expect(urlCampeon({ ...ddragon, campeones: { 5: { id: "x/../y" } } }, 5)).toBeNull();
    expect(urlRuna({ runas: { 1: { icono: "../../otro.png" } } }, 1)).toBeNull();
    expect(urlRuna({ runas: { 1: { icono: "https://malo.com/a.png" } } }, 1)).toBeNull();
    // Igual que el recolector: solo rutas dentro de perk-images/.
    expect(urlRuna({ runas: { 1: { icono: "otra-carpeta/Runa.png" } } }, 1)).toBeNull();
    expect(urlRuna({ runas: { 1: { icono: "perk-images/a-b/Runa.png" } } }, 1)).toBeNull();
    expect(urlRuna({ runas: { 1: { icono: "perk-images.png" } } }, 1)).toBeNull();
    expect(urlRuna({ runas: { 1: { icono: "perk-images/Styles/7201_Precision.png" } } }, 1)).toBe(
      "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/7201_Precision.png",
    );
  });

  it("usa el id de la partida si falta el campeón en Data Dragon", () => {
    expect(urlCampeon(ddragon, 9999, "Zed")).toContain("/champion/Zed.png");
    expect(nombreCampeon(null, 9999, "Zed")).toBe("Zed");
    expect(nombreCampeon(null, 9999)).toBe("Campeón desconocido");
  });
});

describe("partidas en vivo y equipos", () => {
  it("calcula minutos desde inicio", () => {
    expect(minutosEnPartida(partidaEnVivo, null, AHORA)).toBe(14);
  });

  it("sin inicio suma duración y tiempo desde la actualización", () => {
    const p = { inicio: null, duracion: 600 };
    expect(minutosEnPartida(p, AHORA - 5 * 60 * 1000, AHORA)).toBe(15);
    expect(minutosEnPartida({}, AHORA, AHORA)).toBeNull();
  });

  it("agrupa por equipo de forma genérica (Arena)", () => {
    const jugadores = [
      { campeon_id: 1, equipo: 3 },
      { campeon_id: 2, equipo: 1 },
      { campeon_id: 3, equipo: 3 },
      { campeon_id: 4, equipo: 2 },
      null,
    ];
    const grupos = agruparPorEquipo(jugadores);
    expect(grupos.map((g) => g.equipo)).toEqual([1, 2, 3]);
    expect(grupos[2].jugadores).toHaveLength(2);
    expect(agruparPorEquipo(undefined)).toEqual([]);
    expect(nombreEquipo(100, 0)).toBe("Equipo azul");
    expect(nombreEquipo(200, 1)).toBe("Equipo rojo");
    expect(nombreEquipo(3, 2)).toBe("Equipo 3");
  });

  it("normaliza los equipos en vivo con sus baneos", () => {
    const equipos = equiposEnVivo(partidaEnVivo);
    expect(equipos.map((e) => e.jugadores.length)).toEqual([3, 2]);
    expect(equipos.map((e) => e.bloqueos)).toEqual([[51, 21], []]);
    expect(equiposEnVivo({ equipos: [{ equipo: 100, bloqueos: [-1, 0, 5], jugadores: [{ campeon_id: 1 }] }] })[0]).toEqual({
      equipo: 100,
      jugadores: [{ campeon_id: 1, equipo: 100 }],
      bloqueos: [5],
    });
    expect(equiposEnVivo({})).toEqual([]);
  });

  it("nombra a los amigos de la partida", () => {
    const amigos = crearDatos().amigos;
    expect(nombresAmigos(["rana-azul-las", "sapito-las"], amigos)).toBe("Rana Azul y Sapito");
    expect(nombresAmigos(["rana-azul-las", "sapito-las", "charco-las"], amigos)).toBe("Rana Azul, Sapito y Charco");
    expect(nombresAmigos(["otro-las"], amigos)).toBe("otro-las");
    expect(nombresAmigos([], amigos)).toBe("");
  });

  it("formatea rango con LP", () => {
    expect(textoRangoLp({ tier: "DIAMOND", division: "IV", lp: 45 })).toBe("Diamante IV · 45 LP");
    expect(textoRangoLp({ tier: "CHALLENGER", division: null, lp: 1200 })).toBe("Retador · 1200 LP");
    expect(textoRangoLp(null)).toBeNull();
  });
});

describe("datos y rutas", () => {
  it("valida la forma mínima y rellena lo que falta", () => {
    const d = validarDatos({ amigos: [{ slug: "a" }, null, { sin: "slug" }] });
    expect(d.amigos).toHaveLength(1);
    expect(d.en_vivo).toEqual([]);
    expect(d.ranking).toEqual([]);
    expect(d.ddragon).toBeNull();
    expect(() => validarDatos({})).toThrow("formato esperado");
  });

  it("pide el JSON sin caché y solo a la ruta local", async () => {
    const llamadas = [];
    const fetchFn = async (url, opciones) => {
      llamadas.push([url, opciones]);
      return { ok: true, json: async () => crearDatos() };
    };
    const datos = await cargarDatos(fetchFn);
    expect(datos.amigos).toHaveLength(3);
    expect(llamadas).toEqual([["./datos/lol.json", { cache: "no-store" }]]);
  });

  it("explica los errores de carga", async () => {
    await expect(cargarDatos(async () => ({ ok: false, status: 404 }))).rejects.toMatchObject({
      tipo: "sin-datos",
      message: "Todavía no hay datos.",
    });
    await expect(cargarDatos(async () => ({ ok: false, status: 500 }))).rejects.toMatchObject({ tipo: "red" });
    await expect(cargarDatos(async () => ({ ok: false, status: 500 }))).rejects.toThrow("código 500");
    // En desarrollo, Vite responde index.html (200) cuando el archivo no existe.
    await expect(
      cargarDatos(async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        json: async () => ({}),
      })),
    ).rejects.toMatchObject({ tipo: "sin-datos" });
    await expect(
      cargarDatos(async () => {
        throw new TypeError("red");
      }),
    ).rejects.toMatchObject({ tipo: "red", message: "No se pudo conectar con el servidor." });
    await expect(
      cargarDatos(async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError("x");
        },
      })),
    ).rejects.toMatchObject({ tipo: "formato" });
    await expect(cargarDatos(async () => ({ ok: true, json: async () => ({}) }))).rejects.toMatchObject({
      tipo: "formato",
    });
  });

  it("lee el slug del hash y rechaza valores raros", () => {
    expect(slugDesdeHash("#/amigo/rana-azul-las")).toBe("rana-azul-las");
    expect(slugDesdeHash("#/")).toBeNull();
    expect(slugDesdeHash("#/amigo/<script>")).toBeNull();
    expect(slugDesdeHash("#/amigo/%E0%A4%A")).toBeNull();
    expect(hashDeAmigo("rana-azul-las")).toBe("#/amigo/rana-azul-las");
  });
});
