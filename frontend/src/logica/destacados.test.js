import { describe, expect, it } from "vitest";
import { crearDatos, crearDestacados } from "../test/fixtures/lol.js";
import { validarDatos } from "./datos.js";
import {
  CLAVES_DESTACADOS,
  destacadosVacios,
  destacadosVigentes,
  hoyVencido,
  fechaRacha,
  colorResultado,
  formatearDanio,
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

  it("vencido: deja en null solo mejor y peor jugador de hoy", () => {
    const d = base(1759298400000);
    const v = destacadosVigentes(d, 1759298400000 + 25 * HORA);
    expect(v.mejor_jugador_hoy).toBeNull();
    expect(v.peor_jugador_hoy).toBeNull();
    expect(v.mas_partidas).toEqual(d.mas_partidas);
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
