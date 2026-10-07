import { describe, expect, it } from "vitest";
import { crearDatos, crearDestacados } from "../test/fixtures/lol.js";
import { validarDatos } from "./datos.js";
import {
  CLAVES_DESTACADOS,
  CLAVES_HOY,
  CLAVES_MES,
  CLAVES_SEMANA,
  DIAS_MES_CERRADO,
  MESES,
  destacadosVacios,
  destacadosVigentes,
  hoyVencido,
  mesVencido,
  semanaVencida,
  fechaRacha,
  colorResultado,
  formatearDanio,
  formatearKdaDestacado,
  formatearPorcentaje,
  notaJugadas,
  plural,
  validarDestacados,
  validarMes,
} from "./destacados.js";

const AMIGOS = crearDatos().amigos;
const NBSP = String.fromCharCode(0xa0);

describe("validarDestacados", () => {
  it("acepta los destacados completos", () => {
    const d = validarDestacados(crearDestacados(), AMIGOS);
    expect(d.semana_desde).toBe(crearDestacados().semana_desde);
    expect(d.hoy_desde).toBe(crearDestacados().hoy_desde);
    expect(d).not.toHaveProperty("ultimas_partidas");
    for (const clave of CLAVES_DESTACADOS) expect(d[clave]).not.toBeNull();
    expect(d.mejor_winrate).toMatchObject({ winrate: 62.5, victorias: 5, derrotas: 3, partidas: 8 });
    expect(d.racha_victorias_grupo).toEqual(crearDestacados().racha_victorias_grupo);
    expect(d.racha_derrotas_grupo.amigos).toEqual(["rana-azul-las", "sapito-las", "charco-las"]);
    expect(d.racha_derrotas_grupo.partidas).toEqual({ "rana-azul-las": 3, "sapito-las": 3, "charco-las": 1 });
    expect(d).not.toHaveProperty("peor_kda");
    expect(d).not.toHaveProperty("mejor_kda");
    expect(d.mejor_jugador_hoy).toMatchObject({ campeon_id: 11, campeon: "MasterYi", kda: 9.5, resultado: "derrota" });
  });

  it("ignora peor_kda, mejor_kda y las rachas del formato viejo", () => {
    const d = validarDestacados(
      crearDestacados({
        peor_kda: { amigos: ["rana-azul-las"], kda: 1.5, asesinatos: 30, muertes: 40, asistencias: 30, partidas: 9 },
        mejor_kda: { amigos: ["sapito-las"], kda: 3.02, asesinatos: 85, muertes: 48, asistencias: 60, partidas: 8 },
        mejor_jugador_hoy: undefined,
        racha: { amigos: ["rana-azul-las"], racha: 5 },
        racha_victorias: { amigos: ["sapito-las"], racha: 4 },
        racha_derrotas: { amigos: ["rana-azul-las"], racha: 3 },
        racha_victorias_grupo: undefined,
        racha_derrotas_grupo: undefined,
      }),
      AMIGOS,
    );
    expect(d).not.toHaveProperty("peor_kda");
    expect(d).not.toHaveProperty("mejor_kda");
    expect(d).not.toHaveProperty("racha");
    expect(d).not.toHaveProperty("racha_victorias");
    expect(d).not.toHaveProperty("racha_derrotas");
    expect(d.mejor_jugador_hoy).toBeNull();
    expect(d.racha_victorias_grupo).toBeNull();
    expect(d.racha_derrotas_grupo).toBeNull();
  });

  it("ignora mejor_partida, peor_partida y ultimas_partidas de archivos viejos", () => {
    const base = crearDestacados();
    const viejo = {
      ...base,
      mejor_partida: base.mejor_jugador_hoy,
      peor_partida: base.peor_jugador_hoy,
      ultimas_partidas: 10,
    };
    delete viejo.mejor_jugador_hoy;
    delete viejo.peor_jugador_hoy;
    delete viejo.hoy_desde;
    const d = validarDestacados(viejo, AMIGOS);
    expect(d).not.toHaveProperty("mejor_partida");
    expect(d).not.toHaveProperty("peor_partida");
    expect(d).not.toHaveProperty("ultimas_partidas");
    expect(d.mejor_jugador_hoy).toBeNull();
    expect(d.peor_jugador_hoy).toBeNull();
    expect(d.hoy_desde).toBeNull();
    expect(d.mas_partidas).not.toBeNull();
  });

  it.each([undefined, null, 0, -3, 7.5, "1759298400000", 9e15, Number.NaN, Number.POSITIVE_INFINITY, true, {}])(
    "hoy_desde inválido (%s) queda en null",
    (valor) => {
      expect(validarDestacados(crearDestacados({ hoy_desde: valor }), AMIGOS).hoy_desde).toBeNull();
    },
  );

  it("acepta rachas desde 2, sin partidas ni fechas (sin nota ni fecha)", () => {
    const d = validarDestacados(
      crearDestacados({ racha_victorias_grupo: { amigos: ["charco-las", "sapito-las"], racha: 2 } }),
      AMIGOS,
    );
    expect(d.racha_victorias_grupo).toEqual({
      racha: 2,
      amigos: ["charco-las", "sapito-las"],
      partidas: { "charco-las": 2, "sapito-las": 2 },
      desde: null,
      hasta: null,
    });
  });

  it("partidas fuera de rango o inválidas valen la racha completa (sin nota)", () => {
    const d = validarDestacados(
      crearDestacados({
        racha_derrotas_grupo: {
          racha: 3,
          amigos: ["rana-azul-las", "sapito-las", "charco-las"],
          partidas: { "rana-azul-las": 0, "sapito-las": 4, "charco-las": "1", "intruso-las": 1 },
        },
        racha_victorias_grupo: { racha: 3, amigos: ["sapito-las", "charco-las"], partidas: [1, 1] },
      }),
      AMIGOS,
    );
    expect(d.racha_derrotas_grupo.partidas).toEqual({ "rana-azul-las": 3, "sapito-las": 3, "charco-las": 3 });
    expect(d.racha_victorias_grupo.partidas).toEqual({ "sapito-las": 3, "charco-las": 3 });
  });

  it("no hereda partidas del prototipo", () => {
    const d = validarDestacados(
      crearDestacados({ racha_victorias_grupo: { racha: 3, amigos: ["sapito-las"], partidas: Object.create({ "sapito-las": 1 }) } }),
      AMIGOS,
    );
    expect(d.racha_victorias_grupo.partidas).toEqual({ "sapito-las": 3 });
  });

  it("fechas de racha fuera del rango de Date quedan en null", () => {
    const racha = { amigos: ["sapito-las"], racha: 3, desde: 9e15, hasta: 9e15 };
    const d = validarDestacados(crearDestacados({ racha_victorias_grupo: racha }), AMIGOS);
    expect(d.racha_victorias_grupo.desde).toBeNull();
    expect(d.racha_victorias_grupo.hasta).toBeNull();
  });

  it("fechas inválidas quedan en null; con una sola fecha usa la misma para ambas", () => {
    const base = { racha: 2, amigos: ["sapito-las", "rana-azul-las"] };
    for (const malo of [0, -5, 1.5, "1790000000000", Number.NaN, Number.POSITIVE_INFINITY, null, true]) {
      const d = validarDestacados(crearDestacados({ racha_victorias_grupo: { ...base, desde: malo, hasta: malo } }), AMIGOS);
      expect(d.racha_victorias_grupo).toMatchObject({ racha: 2, desde: null, hasta: null });
    }
    const una = validarDestacados(crearDestacados({ racha_victorias_grupo: { ...base, hasta: 1790000000000 } }), AMIGOS);
    expect(una.racha_victorias_grupo).toMatchObject({ desde: 1790000000000, hasta: 1790000000000 });
    const invertidas = validarDestacados(
      crearDestacados({ racha_victorias_grupo: { ...base, desde: 1790000009999, hasta: 1790000000000 } }),
      AMIGOS,
    );
    expect(invertidas.racha_victorias_grupo).toMatchObject({ desde: 1790000000000, hasta: 1790000009999 });
  });

  it("no copia campos extra de la racha", () => {
    const d = validarDestacados(
      crearDestacados({ racha_victorias_grupo: { racha: 2, amigos: ["sapito-las"], html: "<b>x</b>" } }),
      AMIGOS,
    );
    expect(d.racha_victorias_grupo).not.toHaveProperty("html");
  });

  it.each([1, 1759298400000, 8.64e15])("acepta semana_desde = %s", (valor) => {
    expect(validarDestacados(crearDestacados({ semana_desde: valor }), AMIGOS).semana_desde).toBe(valor);
  });

  it.each([undefined, null, 0, -3, 7.5, "1759298400000", 9e15, Number.NaN, Number.POSITIVE_INFINITY, true, {}])(
    "semana_desde inválido (%s) queda en null",
    (valor) => {
      expect(validarDestacados(crearDestacados({ semana_desde: valor }), AMIGOS).semana_desde).toBeNull();
    },
  );

  it("ignora dias y desde de archivos viejos", () => {
    const d = validarDestacados(crearDestacados({ dias: 7, desde: 1759298400000 }), AMIGOS);
    expect(d).not.toHaveProperty("dias");
    expect(d).not.toHaveProperty("desde");
    expect(d.mas_partidas).not.toBeNull();
  });

  it("mejor_winrate acepta varios amigos (empate) y descarta los desconocidos", () => {
    const d = validarDestacados(
      crearDestacados({
        mejor_winrate: {
          amigos: ["sapito-las", "intruso-las", "rana-azul-las", "sapito-las", "charco-las"],
          winrate: 75.0,
          victorias: 3,
          derrotas: 1,
          partidas: 4,
        },
      }),
      AMIGOS,
    );
    expect(d.mejor_winrate).toEqual({
      amigos: ["sapito-las", "rana-azul-las", "charco-las"],
      winrate: 75,
      victorias: 3,
      derrotas: 1,
      partidas: 4,
    });
  });

  it("racha: notaJugadas marca a quien jugó menos que el total", () => {
    const d = validarDestacados(
      crearDestacados({
        racha_victorias_grupo: {
          racha: 7,
          amigos: ["sapito-las", "rana-azul-las", "charco-las"],
          partidas: { "sapito-las": 7, "rana-azul-las": 5, "charco-las": 2 },
        },
      }),
      AMIGOS,
    );
    const r = d.racha_victorias_grupo;
    expect(r.amigos.map((slug) => notaJugadas(r.partidas[slug], r.racha))).toEqual(["", " (5 partidas)", " (2 partidas)"]);
  });

  it.each([1, 1759298400000, 8.64e15])("acepta hoy_desde = %s", (valor) => {
    expect(validarDestacados(crearDestacados({ hoy_desde: valor }), AMIGOS).hoy_desde).toBe(valor);
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
        racha_derrotas_grupo: { amigos: ["intruso-las", "intruso2-las"], racha: 3 },
        racha_victorias_grupo: { amigos: ["intruso-las", "sapito-las"], racha: 3, partidas: { "intruso-las": 1, "sapito-las": 1 } },
        mejor_jugador_hoy: { ...crearDestacados().mejor_jugador_hoy, amigos: "sapito-las" },
      }),
      AMIGOS,
    );
    expect(d.mas_partidas.amigos).toEqual(["sapito-las"]);
    expect(d.racha_derrotas_grupo).toBeNull();
    expect(d.racha_victorias_grupo.amigos).toEqual(["sapito-las"]);
    expect(d.racha_victorias_grupo.partidas).toEqual({ "sapito-las": 1 });
    expect(d.mejor_jugador_hoy).toBeNull();
  });

  it.each([
    ["mas_partidas", { amigos: ["sapito-las"], partidas: -1 }],
    ["mas_partidas", { amigos: ["sapito-las"], partidas: "20" }],
    ["mejor_winrate", { amigos: ["sapito-las"], winrate: 120, victorias: 5, derrotas: 3, partidas: 8 }],
    ["mejor_winrate", { amigos: ["sapito-las"], winrate: Number.NaN, victorias: 5, derrotas: 3, partidas: 8 }],
    ["mejor_jugador_hoy", { ...crearDestacados().mejor_jugador_hoy, kda: -2 }],
    ["mejor_jugador_hoy", { ...crearDestacados().mejor_jugador_hoy, resultado: "<b>gané</b>" }],
    ["mejor_jugador_hoy", { ...crearDestacados().mejor_jugador_hoy, campeon_id: "11" }],
    ["mejor_jugador_hoy", { ...crearDestacados().mejor_jugador_hoy, campeon: { html: "x" } }],
    ["mejor_jugador_hoy", { ...crearDestacados().mejor_jugador_hoy, asesinatos: 1.5 }],
    ["mejor_jugador_hoy", { ...crearDestacados().mejor_jugador_hoy, fecha: "ayer" }],
    ["mejor_jugador_hoy", { amigos: ["sapito-las"], kda: 3.02, asesinatos: 85, muertes: 48, asistencias: 60, partidas: 8 }],
    ["racha_victorias_grupo", { amigos: ["sapito-las"], racha: null }],
    ["racha_victorias_grupo", { amigos: ["sapito-las"], racha: 1 }],
    ["racha_victorias_grupo", { amigos: ["sapito-las"], racha: 2.5 }],
    ["racha_victorias_grupo", { amigos: ["sapito-las"], racha: "3" }],
    ["racha_victorias_grupo", { racha: 3 }],
    ["racha_derrotas_grupo", { amigos: ["sapito-las"], racha: 0 }],
    ["racha_derrotas_grupo", { amigos: ["sapito-las"], racha: -4 }],
    ["racha_derrotas_grupo", { amigos: [], racha: 3 }],
    ["racha_derrotas_grupo", "<b>3</b>"],
    ["peor_jugador_hoy", { ...crearDestacados().peor_jugador_hoy, resultado: "<b>gané</b>" }],
    ["peor_jugador_hoy", { ...crearDestacados().peor_jugador_hoy, campeon_id: "1" }],
    ["peor_jugador_hoy", { ...crearDestacados().peor_jugador_hoy, modo: { html: "x" } }],
    ["peor_jugador_hoy", { ...crearDestacados().peor_jugador_hoy, fecha: "ayer" }],
    // Fuera del rango de Date: formatearla lanzaría RangeError y dejaría la página en blanco.
    ["peor_jugador_hoy", { ...crearDestacados().peor_jugador_hoy, fecha: 9e15 }],
    ["racha_victorias_grupo", [3]],
  ])("descarta %s mal formado", (clave, tarjeta) => {
    const d = validarDestacados(crearDestacados({ [clave]: tarjeta }), AMIGOS);
    expect(d[clave]).toBeNull();
    // Las demás tarjetas no se ven afectadas.
    expect(d.mas_partidas ?? d.mejor_winrate).not.toBeNull();
  });

  it("acepta el daño entero ≥ 0 en mejor y peor partida", () => {
    const d = validarDestacados(crearDestacados(), AMIGOS);
    expect(d.mejor_jugador_hoy.danio).toBe(32450);
    expect(d.peor_jugador_hoy.danio).toBe(4180);
    const cero = validarDestacados(crearDestacados({ peor_jugador_hoy: { ...crearDestacados().peor_jugador_hoy, danio: 0 } }), AMIGOS);
    expect(cero.peor_jugador_hoy.danio).toBe(0);
  });

  it.each([
    ["null", null],
    ["ausente", undefined],
    ["negativo", -5],
    ["decimal", 1234.5],
    ["texto", "32450"],
    ["HTML", "<b>32450</b>"],
    ["NaN", Number.NaN],
    ["infinito", Number.POSITIVE_INFINITY],
    ["objeto", { valor: 1 }],
  ])("daño %s queda en null sin descartar la partida", (_nombre, danio) => {
    const base = crearDestacados();
    const mejor = { ...base.mejor_jugador_hoy, danio };
    const peor = { ...base.peor_jugador_hoy, danio };
    if (danio === undefined) {
      delete mejor.danio;
      delete peor.danio;
    }
    const d = validarDestacados(crearDestacados({ mejor_jugador_hoy: mejor, peor_jugador_hoy: peor }), AMIGOS);
    expect(d.mejor_jugador_hoy).not.toBeNull();
    expect(d.mejor_jugador_hoy.danio).toBeNull();
    expect(d.peor_jugador_hoy).not.toBeNull();
    expect(d.peor_jugador_hoy.danio).toBeNull();
  });

  it("detecta cuando todas las tarjetas vienen vacías", () => {
    const todasNull = Object.fromEntries(CLAVES_DESTACADOS.map((c) => [c, null]));
    expect(destacadosVacios(validarDestacados(crearDestacados(todasNull), AMIGOS))).toBe(true);
    expect(destacadosVacios(validarDestacados(crearDestacados(), AMIGOS))).toBe(false);
  });

  it("por defecto mira solo las tarjetas de la semana", () => {
    const semanaNull = Object.fromEntries(CLAVES_SEMANA.map((c) => [c, null]));
    const d = validarDestacados(crearDestacados(semanaNull), AMIGOS);
    expect(destacadosVacios(d)).toBe(true);
    expect(destacadosVacios(d, CLAVES_HOY)).toBe(false);
  });

  it("las claves de hoy y de la semana están en el orden de las tarjetas", () => {
    expect(CLAVES_HOY).toEqual(["mejor_jugador_hoy", "balance_hoy", "peor_jugador_hoy"]);
    expect(CLAVES_SEMANA).toEqual([
      "mas_partidas",
      "mejor_winrate",
      "mejor_jugador_semana",
      "racha_victorias_grupo",
      "racha_derrotas_grupo",
      "peor_jugador_semana",
    ]);
  });
});

describe("validarDestacados: balance del grupo hoy", () => {
  const BALANCE = crearDestacados().balance_hoy;
  const validar = (balance) => validarDestacados(crearDestacados({ balance_hoy: balance }), AMIGOS).balance_hoy;

  it("acepta el balance completo y deja solo los campos conocidos", () => {
    expect(validar({ ...BALANCE, extra: "<b>x</b>" })).toEqual({
      partidas: 6,
      victorias: 4,
      derrotas: 2,
      winrate: 66.7,
      amigos: ["sapito-las", "rana-azul-las", "charco-las"],
      jugadas: { "sapito-las": 6, "rana-azul-las": 6, "charco-las": 4 },
    });
  });

  it("jugadas: conserva los enteros de 1 al total y solo de los amigos conocidos", () => {
    const b = validar({
      partidas: 3,
      victorias: 2,
      derrotas: 1,
      winrate: 66.7,
      amigos: ["sapito-las", "charco-las"],
      jugadas: { "sapito-las": 3, "charco-las": 1, "intruso-las": 2 },
    });
    expect(b.jugadas).toEqual({ "sapito-las": 3, "charco-las": 1 });
  });

  it.each([
    ["ausente", undefined],
    ["null", null],
    ["lista", [1, 2]],
    ["texto", "1"],
  ])("jugadas %s: todos valen el total (archivos viejos)", (_nombre, jugadas) => {
    const b = validar({ ...BALANCE, jugadas });
    expect(b.jugadas).toEqual({ "sapito-las": 6, "rana-azul-las": 6, "charco-las": 6 });
  });

  it.each([
    ["cero", 0],
    ["negativo", -1],
    ["mayor que el total", 7],
    ["decimal", 2.5],
    ["texto", "2"],
    ["null", null],
  ])("jugadas con valor %s vale el total solo para ese amigo", (_nombre, valor) => {
    const b = validar({ ...BALANCE, jugadas: { "sapito-las": 6, "rana-azul-las": 2, "charco-las": valor } });
    expect(b.jugadas).toEqual({ "sapito-las": 6, "rana-azul-las": 2, "charco-las": 6 });
  });

  it("un amigo sin entrada en jugadas vale el total", () => {
    const b = validar({ ...BALANCE, jugadas: { "charco-las": 1 } });
    expect(b.jugadas).toEqual({ "sapito-las": 6, "rana-azul-las": 6, "charco-las": 1 });
  });

  it("sin winrate lo calcula con las victorias", () => {
    expect(validar({ ...BALANCE, winrate: null }).winrate).toBeCloseTo(66.667, 2);
    const sinCampo = { ...BALANCE };
    delete sinCampo.winrate;
    expect(validar(sinCampo).winrate).toBeCloseTo(66.667, 2);
  });

  it("descarta los slugs desconocidos o repetidos y conserva los conocidos", () => {
    expect(validar({ ...BALANCE, amigos: ["intruso-las", "sapito-las", "sapito-las", 7] }).amigos).toEqual(["sapito-las"]);
  });

  it.each([
    ["incoherente", { victorias: 4, derrotas: 1 }],
    ["sin partidas", { partidas: 0, victorias: 0, derrotas: 0 }],
    ["con partidas negativas", { partidas: -2, victorias: -1, derrotas: -1 }],
    ["con derrotas negativas", { partidas: 3, victorias: 4, derrotas: -1 }],
    ["con decimales", { partidas: 6.5, victorias: 4.5, derrotas: 2 }],
    ["con texto", { partidas: "6" }],
    ["con winrate fuera de rango", { winrate: 120 }],
    ["con winrate negativo", { winrate: -1 }],
    ["con winrate en texto", { winrate: "66,7" }],
    ["solo con slugs desconocidos", { amigos: ["intruso-las"] }],
    ["sin amigos", { amigos: "sapito-las" }],
  ])("balance %s queda en null", (_nombre, cambios) => {
    expect(validar({ ...BALANCE, ...cambios })).toBeNull();
  });

  it.each([
    ["null", null],
    ["texto", "4 V – 2 D"],
    ["lista", [4, 2]],
  ])("balance %s queda en null", (_nombre, valor) => {
    expect(validar(valor)).toBeNull();
  });
});

describe("validarDestacados: mejor y peor jugador de la semana", () => {
  it("se validan con la misma forma que los de hoy", () => {
    const d = validarDestacados(crearDestacados(), AMIGOS);
    expect(d.mejor_jugador_semana).toMatchObject({ amigos: ["charco-las"], campeon_id: 103, kda: 24, danio: 41200 });
    expect(d.peor_jugador_semana).toMatchObject({ amigos: ["sapito-las"], campeon: "Ashe", resultado: "derrota" });
  });

  it("partidas inválidas o de slugs desconocidos quedan en null", () => {
    const base = crearDestacados();
    const d = validarDestacados(
      crearDestacados({
        mejor_jugador_semana: { ...base.mejor_jugador_semana, resultado: "remake" },
        peor_jugador_semana: { ...base.peor_jugador_semana, amigos: ["intruso-las"] },
      }),
      AMIGOS,
    );
    expect(d.mejor_jugador_semana).toBeNull();
    expect(d.peor_jugador_semana).toBeNull();
  });

  it("archivos sin las claves nuevas dejan balance y jugadores de la semana en null", () => {
    const viejo = crearDestacados();
    delete viejo.balance_hoy;
    delete viejo.mejor_jugador_semana;
    delete viejo.peor_jugador_semana;
    const d = validarDestacados(viejo, AMIGOS);
    expect(d.balance_hoy).toBeNull();
    expect(d.mejor_jugador_semana).toBeNull();
    expect(d.peor_jugador_semana).toBeNull();
    expect(d.mas_partidas).not.toBeNull();
  });
});

describe("fechaRacha", () => {
  it("muestra un solo día si la racha empieza y termina el mismo día (hora local)", () => {
    expect(fechaRacha(new Date(2026, 9, 1, 0, 5).getTime(), new Date(2026, 9, 1, 23, 50).getTime())).toBe("1 oct");
  });

  it("muestra un rango si cruza la medianoche local", () => {
    // ICU escribe "sept" o "sep" según la versión.
    expect(fechaRacha(new Date(2026, 8, 30, 23, 0).getTime(), new Date(2026, 9, 2, 1, 0).getTime())).toMatch(
      /^30 sept? – 2 oct$/,
    );
    expect(fechaRacha(new Date(2026, 9, 1, 23, 0).getTime(), new Date(2026, 9, 2, 0, 30).getTime())).toBe("1 oct – 2 oct");
  });

  it("sin fechas devuelve null", () => {
    expect(fechaRacha(null, null)).toBeNull();
    expect(fechaRacha(1790000000000, undefined)).toBeNull();
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

  it("daño con punto de miles o null", () => {
    expect(formatearDanio(32450)).toBe("Daño: 32.450");
    expect(formatearDanio(1234567)).toBe("Daño: 1.234.567");
    expect(formatearDanio(0)).toBe("Daño: 0");
    expect(formatearDanio(null)).toBeNull();
    expect(formatearDanio(undefined)).toBeNull();
    expect(formatearDanio(-1)).toBeNull();
    expect(formatearDanio(2.5)).toBeNull();
    expect(formatearDanio("32450")).toBeNull();
  });

  it("color según el resultado de la partida", () => {
    expect(colorResultado("victoria")).toBe("text-victoria");
    expect(colorResultado("derrota")).toBe("text-derrota");
    expect(colorResultado("remake")).toBe("text-texto");
    expect(colorResultado(undefined)).toBe("text-texto");
  });

  it("singular y plural", () => {
    expect(plural(1, "partida")).toBe("1 partida");
    expect(plural(8, "partida")).toBe("8 partidas");
  });
});

describe("notaJugadas", () => {
  it("con menos partidas que el total: singular o plural entre paréntesis", () => {
    expect(notaJugadas(1, 3)).toBe(" (1 partida)");
    expect(notaJugadas(2, 4)).toBe(" (2 partidas)");
  });

  it("sin nota si jugó todas o no hay dato", () => {
    expect(notaJugadas(3, 3)).toBe("");
    expect(notaJugadas(undefined, 3)).toBe("");
    expect(notaJugadas(null, 3)).toBe("");
    expect(notaJugadas(1, undefined)).toBe("");
  });
});

describe("hoyVencido", () => {
  const DIA = 24 * 3600 * 1000;
  const INICIO = 1759298400000;

  it("justo antes de 24 h no está vencido", () => {
    expect(hoyVencido(INICIO, INICIO + DIA - 1)).toBe(false);
    expect(hoyVencido(INICIO, INICIO)).toBe(false);
  });

  it("con 24 h exactas o más está vencido", () => {
    expect(hoyVencido(INICIO, INICIO + DIA)).toBe(true);
    expect(hoyVencido(INICIO, INICIO + 25 * 3600 * 1000)).toBe(true);
  });

  it.each([null, undefined])("hoy_desde %s no está vencido", (valor) => {
    expect(hoyVencido(valor, INICIO + 3 * DIA)).toBe(false);
  });

  it("sin ahora no está vencido", () => {
    expect(hoyVencido(INICIO, undefined)).toBe(false);
  });
});

describe("destacadosVigentes", () => {
  const HORA = 3600 * 1000;
  const base = (hoyDesde) => validarDestacados(crearDestacados({ hoy_desde: hoyDesde }), AMIGOS);

  it("vencido: deja en null solo las tarjetas de hoy (incluido el balance)", () => {
    const d = base(1759298400000);
    const v = destacadosVigentes(d, 1759298400000 + 25 * HORA);
    expect(v.mejor_jugador_hoy).toBeNull();
    expect(v.peor_jugador_hoy).toBeNull();
    expect(v.balance_hoy).toBeNull();
    expect(v.mas_partidas).toEqual(d.mas_partidas);
    expect(v.mejor_jugador_semana).toEqual(d.mejor_jugador_semana);
    expect(v.peor_jugador_semana).toEqual(d.peor_jugador_semana);
    expect(d.mejor_jugador_hoy).not.toBeNull();
  });

  it("vigente o sin hoy_desde: devuelve lo mismo", () => {
    const d = base(1759298400000);
    expect(destacadosVigentes(d, 1759298400000 + HORA)).toBe(d);
    const viejo = base(null);
    expect(destacadosVigentes(viejo, 1759298400000 + 100 * HORA)).toBe(viejo);
    expect(destacadosVigentes(null, 0)).toBeNull();
  });
});

describe("semanaVencida", () => {
  const SEMANA = 7 * 24 * 3600 * 1000;
  const INICIO = 1759107600000;

  it("justo antes de 7 días no está vencida", () => {
    expect(semanaVencida(INICIO, INICIO + SEMANA - 1)).toBe(false);
    expect(semanaVencida(INICIO, INICIO)).toBe(false);
  });

  it("con 7 días exactos o más está vencida", () => {
    expect(semanaVencida(INICIO, INICIO + SEMANA)).toBe(true);
    expect(semanaVencida(INICIO, INICIO + 8 * 24 * 3600 * 1000)).toBe(true);
  });

  it.each([null, undefined, "1759107600000", Number.NaN])("semana_desde %s no está vencida", (valor) => {
    expect(semanaVencida(valor, INICIO + 3 * SEMANA)).toBe(false);
  });

  it("sin ahora no está vencida", () => {
    expect(semanaVencida(INICIO, undefined)).toBe(false);
    expect(semanaVencida(INICIO, null)).toBe(false);
  });
});

describe("destacadosVigentes con la semana vencida", () => {
  const DIA = 24 * 3600 * 1000;
  const AHORA_T = 1759298400000;
  const base = (cambios) => validarDestacados(crearDestacados(cambios), AMIGOS);

  it("semana vencida y día vigente: anula solo las tarjetas de la semana, sin mutar", () => {
    const d = base({ semana_desde: AHORA_T - 8 * DIA, hoy_desde: AHORA_T - 2 * 3600 * 1000 });
    const copia = structuredClone(d);
    const v = destacadosVigentes(d, AHORA_T);
    expect(v).not.toBe(d);
    for (const clave of CLAVES_SEMANA) expect(v[clave]).toBeNull();
    for (const clave of CLAVES_HOY) expect(v[clave]).toEqual(d[clave]);
    expect(d).toEqual(copia);
  });

  it("día vencido y semana vigente: anula solo las tarjetas de hoy", () => {
    const d = base({ semana_desde: AHORA_T - 2 * DIA, hoy_desde: AHORA_T - 25 * 3600 * 1000 });
    const v = destacadosVigentes(d, AHORA_T);
    for (const clave of CLAVES_HOY) expect(v[clave]).toBeNull();
    for (const clave of CLAVES_SEMANA) expect(v[clave]).toEqual(d[clave]);
  });

  it("ambos vencidos: anula hoy y semana, deja el mes vigente y conserva las fechas", () => {
    const d = base({ semana_desde: AHORA_T - 9 * DIA, hoy_desde: AHORA_T - 30 * 3600 * 1000 });
    const copia = structuredClone(d);
    const v = destacadosVigentes(d, AHORA_T);
    for (const clave of [...CLAVES_HOY, ...CLAVES_SEMANA]) expect(v[clave]).toBeNull();
    for (const clave of CLAVES_MES) expect(v[clave]).toEqual(d[clave]);
    expect(v.semana_desde).toBe(d.semana_desde);
    expect(v.hoy_desde).toBe(d.hoy_desde);
    expect(d).toEqual(copia);
  });

  it("sin semana_desde (archivos viejos) no anula la semana", () => {
    const d = base({ semana_desde: null, hoy_desde: null });
    expect(destacadosVigentes(d, AHORA_T + 100 * DIA)).toBe(d);
  });
});

describe("validarMes", () => {
  const MES = crearDestacados().mes;

  it("acepta el mes completo y deja solo los campos conocidos", () => {
    expect(validarMes({ ...MES, extra: "<b>x</b>" })).toEqual(MES);
    expect(validarMes({ ...MES, cerrado: true }).cerrado).toBe(true);
    expect(validarDestacados(crearDestacados(), AMIGOS).mes).toEqual(MES);
  });

  it("los 12 meses en español, en orden", () => {
    expect(MESES).toHaveLength(12);
    expect(MESES[0]).toBe("enero");
    expect(MESES[8]).toBe("septiembre");
    expect(MESES[11]).toBe("diciembre");
    expect(validarMes({ ...MES, mes: 1, nombre: "enero", anio: 2027 })).not.toBeNull();
    expect(validarMes({ ...MES, mes: 12, nombre: "diciembre", anio: 2100 })).not.toBeNull();
  });

  it.each([
    ["sin mes", undefined],
    ["null", null],
    ["texto", "octubre"],
    ["lista", []],
    ["año antes de 2026", { ...MES, anio: 2025 }],
    ["año después de 2100", { ...MES, anio: 2101 }],
    ["año decimal", { ...MES, anio: 2026.5 }],
    ["año en texto", { ...MES, anio: "2026" }],
    ["mes 0", { ...MES, mes: 0 }],
    ["mes 13", { ...MES, mes: 13, nombre: "diciembre" }],
    ["nombre de otro mes", { ...MES, nombre: "noviembre" }],
    ["nombre con mayúscula", { ...MES, nombre: "Octubre" }],
    ["nombre inventado", { ...MES, nombre: "<script>" }],
    ["sin nombre", { ...MES, nombre: undefined }],
    ["desde igual a hasta", { ...MES, desde: MES.hasta }],
    ["desde después de hasta", { ...MES, desde: MES.hasta + 1 }],
    ["desde decimal", { ...MES, desde: MES.desde + 0.5 }],
    ["hasta fuera del rango de Date", { ...MES, hasta: 9e15 }],
    ["desde negativo", { ...MES, desde: -1 }],
    ["cerrado en texto", { ...MES, cerrado: "false" }],
    ["sin cerrado", { ...MES, cerrado: undefined }],
  ])("%s: null", (_, valor) => {
    expect(validarMes(valor)).toBeNull();
    expect(validarDestacados(crearDestacados({ mes: valor }), AMIGOS).mes).toBeNull();
  });

  it("valida las tres tarjetas del mes con los validadores de hoy", () => {
    const d = validarDestacados(
      crearDestacados({
        mejor_jugador_mes: { ...crearDestacados().mejor_jugador_mes, resultado: "empate" },
        peor_jugador_mes: { ...crearDestacados().peor_jugador_mes, amigos: ["intruso-las"] },
        balance_mes: { ...crearDestacados().balance_mes, victorias: 20 },
      }),
      AMIGOS,
    );
    for (const clave of CLAVES_MES) expect(d[clave]).toBeNull();

    const ok = validarDestacados(crearDestacados(), AMIGOS);
    expect(ok.balance_mes).toEqual({
      partidas: 28,
      victorias: 15,
      derrotas: 13,
      winrate: 53.6,
      amigos: ["sapito-las", "rana-azul-las", "charco-las"],
      jugadas: { "sapito-las": 28, "rana-azul-las": 25, "charco-las": 9 },
    });
    expect(ok.mejor_jugador_mes).toMatchObject({ campeon_id: 51, kda: 12, danio: 52300 });
    expect(ok.peor_jugador_mes).toMatchObject({ campeon_id: 54, kda: 0.27, danio: 3900 });
  });

  it("las claves del mes están en el orden de las tarjetas", () => {
    expect(CLAVES_MES).toEqual(["mejor_jugador_mes", "balance_mes", "peor_jugador_mes"]);
  });
});

describe("mesVencido", () => {
  const DIA = 24 * 3600 * 1000;
  const MES = crearDestacados().mes;

  it("durante el mes y los 3 días siguientes no está vencido", () => {
    expect(DIAS_MES_CERRADO).toBe(3);
    expect(mesVencido(MES, MES.desde)).toBe(false);
    expect(mesVencido(MES, MES.hasta)).toBe(false);
    expect(mesVencido(MES, MES.hasta + 3 * DIA - 1)).toBe(false);
  });

  it("desde 3 días después de hasta está vencido", () => {
    expect(mesVencido(MES, MES.hasta + 3 * DIA)).toBe(true);
    expect(mesVencido(MES, MES.hasta + 40 * DIA)).toBe(true);
  });

  it("sin mes o sin ahora no está vencido", () => {
    expect(mesVencido(null, MES.hasta + 40 * DIA)).toBe(false);
    expect(mesVencido(undefined, MES.hasta + 40 * DIA)).toBe(false);
    expect(mesVencido(MES, undefined)).toBe(false);
    expect(mesVencido(MES, null)).toBe(false);
  });
});

describe("destacadosVigentes con el mes vencido", () => {
  const DIA = 24 * 3600 * 1000;
  const MES = crearDestacados().mes;

  it("anula solo las tarjetas del mes, sin mutar, y conserva el mes", () => {
    const ahora = MES.hasta + 3 * DIA;
    const d = validarDestacados(crearDestacados({ hoy_desde: ahora - DIA / 2, semana_desde: ahora - DIA }), AMIGOS);
    const copia = structuredClone(d);
    const v = destacadosVigentes(d, ahora);
    for (const clave of CLAVES_MES) expect(v[clave]).toBeNull();
    for (const clave of [...CLAVES_HOY, ...CLAVES_SEMANA]) expect(v[clave]).toEqual(d[clave]);
    expect(v.mes).toEqual(d.mes);
    expect(d).toEqual(copia);
  });

  it("sin mes válido no anula las tarjetas del mes", () => {
    const d = validarDestacados(crearDestacados({ mes: null, hoy_desde: null, semana_desde: null }), AMIGOS);
    expect(destacadosVigentes(d, MES.hasta + 100 * DIA)).toBe(d);
  });
});
