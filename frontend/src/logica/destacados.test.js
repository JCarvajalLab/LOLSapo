import { describe, expect, it } from "vitest";
import { crearDatos, crearDestacados } from "../test/fixtures/lol.js";
import { validarDatos } from "./datos.js";
import {
  CLAVES_DESTACADOS,
  destacadosVacios,
  formatearKdaDestacado,
  formatearPorcentaje,
  plural,
  validarDestacados,
} from "./destacados.js";

const AMIGOS = crearDatos().amigos;
const NBSP = String.fromCharCode(0xa0);

describe("validarDestacados", () => {
  it("acepta los destacados completos", () => {
    const d = validarDestacados(crearDestacados(), AMIGOS);
    expect(d.dias).toBe(7);
    for (const clave of CLAVES_DESTACADOS) expect(d[clave]).not.toBeNull();
    expect(d.mejor_winrate).toMatchObject({ winrate: 62.5, victorias: 5, derrotas: 3, partidas: 8 });
    expect(d.racha.amigos).toEqual(["rana-azul-las", "sapito-las", "charco-las"]);
  });

  it("devuelve null si el archivo no trae el campo", () => {
    expect(validarDestacados(undefined, AMIGOS)).toBeNull();
    expect(validarDestacados(null, AMIGOS)).toBeNull();
    expect(validarDestacados("x", AMIGOS)).toBeNull();
    expect(validarDestacados([], AMIGOS)).toBeNull();
  });

  it("validarDatos la incluye y es compatible con archivos viejos", () => {
    expect(validarDatos(crearDatos()).destacados).toBeNull();
    const d = validarDatos(crearDatos({ destacados: crearDestacados() }));
    expect(d.destacados.mas_partidas.partidas).toBe(20);
  });

  it("ignora slugs desconocidos y deja null si no queda ninguno", () => {
    const d = validarDestacados(
      crearDestacados({
        mas_partidas: { amigos: ["intruso-las", "sapito-las", "sapito-las", 7], partidas: 20 },
        racha: { amigos: ["intruso-las"], racha: 3 },
        mejor_kda: { amigos: "sapito-las", kda: 1, asesinatos: 1, muertes: 1, asistencias: 0, partidas: 5 },
      }),
      AMIGOS,
    );
    expect(d.mas_partidas.amigos).toEqual(["sapito-las"]);
    expect(d.racha).toBeNull();
    expect(d.mejor_kda).toBeNull();
  });

  it.each([
    ["mas_partidas", { amigos: ["sapito-las"], partidas: -1 }],
    ["mas_partidas", { amigos: ["sapito-las"], partidas: "20" }],
    ["mejor_winrate", { amigos: ["sapito-las"], winrate: 120, victorias: 5, derrotas: 3, partidas: 8 }],
    ["mejor_winrate", { amigos: ["sapito-las"], winrate: Number.NaN, victorias: 5, derrotas: 3, partidas: 8 }],
    ["mejor_kda", { amigos: ["sapito-las"], kda: -2, asesinatos: 1, muertes: 1, asistencias: 1, partidas: 5 }],
    ["peor_kda", { amigos: ["sapito-las"], kda: 1, asesinatos: 1.5, muertes: 1, asistencias: 1, partidas: 5 }],
    ["racha", { amigos: ["sapito-las"], racha: null }],
    ["peor_partida", { ...crearDestacados().peor_partida, resultado: "<b>gané</b>" }],
    ["peor_partida", { ...crearDestacados().peor_partida, campeon_id: "1" }],
    ["peor_partida", { ...crearDestacados().peor_partida, modo: { html: "x" } }],
    ["peor_partida", { ...crearDestacados().peor_partida, fecha: "ayer" }],
    ["racha", [3]],
  ])("descarta %s mal formado", (clave, tarjeta) => {
    const d = validarDestacados(crearDestacados({ [clave]: tarjeta }), AMIGOS);
    expect(d[clave]).toBeNull();
    // Las demás tarjetas no se ven afectadas.
    expect(d.mas_partidas ?? d.mejor_winrate).not.toBeNull();
  });

  it("detecta cuando todas las tarjetas vienen vacías", () => {
    const todasNull = Object.fromEntries(CLAVES_DESTACADOS.map((c) => [c, null]));
    expect(destacadosVacios(validarDestacados(crearDestacados(todasNull), AMIGOS))).toBe(true);
    expect(destacadosVacios(validarDestacados(crearDestacados(), AMIGOS))).toBe(false);
  });
});

describe("formato de destacados", () => {
  it("usa coma decimal", () => {
    expect(formatearPorcentaje(62.5)).toBe(`62,5${NBSP}%`);
    expect(formatearPorcentaje(60)).toBe(`60${NBSP}%`);
    expect(formatearKdaDestacado(3.02)).toBe("3,02");
    expect(formatearKdaDestacado(0)).toBe("0,00");
    expect(formatearKdaDestacado(null)).toBe("—");
  });

  it("singular y plural", () => {
    expect(plural(1, "partida")).toBe("1 partida");
    expect(plural(8, "partida")).toBe("8 partidas");
  });
});
