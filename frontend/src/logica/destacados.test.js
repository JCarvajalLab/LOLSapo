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
    expect(d.ultimas_partidas).toBe(10);
    for (const clave of CLAVES_DESTACADOS) expect(d[clave]).not.toBeNull();
    expect(d.mejor_winrate).toMatchObject({ winrate: 62.5, victorias: 5, derrotas: 3, partidas: 8 });
    expect(d.racha_victorias).toEqual({ amigos: ["sapito-las"], racha: 4 });
    expect(d.racha_derrotas.amigos).toEqual(["rana-azul-las", "sapito-las", "charco-las"]);
    expect(d).not.toHaveProperty("peor_kda");
    expect(d).not.toHaveProperty("mejor_kda");
    expect(d.mejor_partida).toMatchObject({ campeon_id: 11, campeon: "MasterYi", kda: 9.5, resultado: "derrota" });
  });

  it("ignora peor_kda, mejor_kda y la racha del formato viejo", () => {
    const d = validarDestacados(
      crearDestacados({
        peor_kda: { amigos: ["rana-azul-las"], kda: 1.5, asesinatos: 30, muertes: 40, asistencias: 30, partidas: 9 },
        mejor_kda: { amigos: ["sapito-las"], kda: 3.02, asesinatos: 85, muertes: 48, asistencias: 60, partidas: 8 },
        mejor_partida: undefined,
        racha: { amigos: ["rana-azul-las"], racha: 5 },
        racha_victorias: undefined,
      }),
      AMIGOS,
    );
    expect(d).not.toHaveProperty("peor_kda");
    expect(d).not.toHaveProperty("mejor_kda");
    expect(d).not.toHaveProperty("racha");
    expect(d.mejor_partida).toBeNull();
    expect(d.racha_victorias).toBeNull();
  });

  it("usa 7 últimas partidas si el campo falta (archivos viejos)", () => {
    const sinCampo = crearDestacados();
    delete sinCampo.ultimas_partidas;
    expect(validarDestacados(sinCampo, AMIGOS).ultimas_partidas).toBe(7);
  });

  it.each([0, -3, 51, 7.5, "7", null, Number.NaN, Number.POSITIVE_INFINITY, true])(
    "usa 7 si ultimas_partidas es inválido (%s)",
    (valor) => {
      expect(validarDestacados(crearDestacados({ ultimas_partidas: valor }), AMIGOS).ultimas_partidas).toBe(7);
    },
  );

  it("acepta rachas desde 2", () => {
    const d = validarDestacados(crearDestacados({ racha_victorias: { amigos: ["charco-las"], racha: 2 } }), AMIGOS);
    expect(d.racha_victorias.racha).toBe(2);
  });

  it.each([1, 7, 50])("acepta ultimas_partidas = %s", (valor) => {
    expect(validarDestacados(crearDestacados({ ultimas_partidas: valor }), AMIGOS).ultimas_partidas).toBe(valor);
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
        racha_derrotas: { amigos: ["intruso-las", "intruso2-las"], racha: 3 },
        mejor_partida: { ...crearDestacados().mejor_partida, amigos: "sapito-las" },
      }),
      AMIGOS,
    );
    expect(d.mas_partidas.amigos).toEqual(["sapito-las"]);
    expect(d.racha_derrotas).toBeNull();
    expect(d.mejor_partida).toBeNull();
  });

  it.each([
    ["mas_partidas", { amigos: ["sapito-las"], partidas: -1 }],
    ["mas_partidas", { amigos: ["sapito-las"], partidas: "20" }],
    ["mejor_winrate", { amigos: ["sapito-las"], winrate: 120, victorias: 5, derrotas: 3, partidas: 8 }],
    ["mejor_winrate", { amigos: ["sapito-las"], winrate: Number.NaN, victorias: 5, derrotas: 3, partidas: 8 }],
    ["mejor_partida", { ...crearDestacados().mejor_partida, kda: -2 }],
    ["mejor_partida", { ...crearDestacados().mejor_partida, resultado: "<b>gané</b>" }],
    ["mejor_partida", { ...crearDestacados().mejor_partida, campeon_id: "11" }],
    ["mejor_partida", { ...crearDestacados().mejor_partida, campeon: { html: "x" } }],
    ["mejor_partida", { ...crearDestacados().mejor_partida, asesinatos: 1.5 }],
    ["mejor_partida", { ...crearDestacados().mejor_partida, fecha: "ayer" }],
    ["mejor_partida", { amigos: ["sapito-las"], kda: 3.02, asesinatos: 85, muertes: 48, asistencias: 60, partidas: 8 }],
    ["racha_victorias", { amigos: ["sapito-las"], racha: null }],
    ["racha_victorias", { amigos: ["sapito-las"], racha: 1 }],
    ["racha_victorias", { amigos: ["sapito-las"], racha: 2.5 }],
    ["racha_victorias", { amigos: ["sapito-las"], racha: "3" }],
    ["racha_victorias", { racha: 3 }],
    ["racha_derrotas", { amigos: ["sapito-las"], racha: 0 }],
    ["racha_derrotas", { amigos: ["sapito-las"], racha: -4 }],
    ["racha_derrotas", { amigos: [], racha: 3 }],
    ["racha_derrotas", "<b>3</b>"],
    ["peor_partida", { ...crearDestacados().peor_partida, resultado: "<b>gané</b>" }],
    ["peor_partida", { ...crearDestacados().peor_partida, campeon_id: "1" }],
    ["peor_partida", { ...crearDestacados().peor_partida, modo: { html: "x" } }],
    ["peor_partida", { ...crearDestacados().peor_partida, fecha: "ayer" }],
    ["racha_victorias", [3]],
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
    expect(formatearKdaDestacado(9.5)).toBe("9,5");
    expect(formatearKdaDestacado(2.3333)).toBe("2,33");
    expect(formatearKdaDestacado(0)).toBe("0");
    expect(formatearKdaDestacado(null)).toBe("—");
  });

  it("singular y plural", () => {
    expect(plural(1, "partida")).toBe("1 partida");
    expect(plural(8, "partida")).toBe("8 partidas");
  });
});
