import { describe, expect, it } from "vitest";
import { AMIGOS_TOPS, crearDestacados, crearTops, crearTopsGlobal, partidaTop } from "../test/fixtures/lol.js";
import {
  CLAVES_TOPS_GLOBAL,
  destacadosVigentes,
  MAX_TOP,
  topGlobalDe,
  validarDestacados,
  validarTopsGlobal,
} from "./destacados.js";

const SLUGS = new Set(AMIGOS_TOPS.map((a) => a.slug));
const validar = (tops) => validarTopsGlobal(tops, SLUGS);
const slugsDe = (lista) => lista.map((e) => e.amigos[0]);

describe("validarTopsGlobal", () => {
  it("sin tops_global (archivos viejos) o con algo que no es objeto: null", () => {
    expect(validar(undefined)).toBeNull();
    expect(validar(null)).toBeNull();
    expect(validar([])).toBeNull();
    expect(validar("tops")).toBeNull();
    expect(validarDestacados(crearDestacados({ tops: crearTops() }), AMIGOS_TOPS).tops_global).toBeNull();
  });

  it("solo las 6 claves de mejor y peor jugador; las desconocidas se ignoran", () => {
    expect([...CLAVES_TOPS_GLOBAL].sort()).toEqual(
      [
        "mejor_jugador_hoy",
        "peor_jugador_hoy",
        "mejor_jugador_semana",
        "peor_jugador_semana",
        "mejor_jugador_mes",
        "peor_jugador_mes",
      ].sort(),
    );
    const t = validar(
      crearTopsGlobal({ balance_hoy: [partidaTop("charco-las", 1, "Annie", 1, 1, 1, "victoria")], otra: [] }),
    );
    expect(Object.keys(t).sort()).toEqual([...CLAVES_TOPS_GLOBAL].sort());
  });

  it("permite el mismo amigo repetido y respeta el orden del recolector", () => {
    const t = validar(crearTopsGlobal());
    expect(slugsDe(t.mejor_jugador_semana)).toEqual([
      "charco-las",
      "charco-las",
      "sapito-las",
      "rana-azul-las",
      "renacuajo-las",
    ]);
    expect(t.mejor_jugador_semana[1]).toMatchObject({ campeon: "Akali", modo: "ARAM" });
  });

  it("descarta entradas inválidas, slugs desconocidos y varios amigos", () => {
    const buena = partidaTop("pozo-las", 1, "Annie", 4, 4, 4, "derrota");
    const t = validar({
      mejor_jugador_hoy: [
        null,
        "x",
        { ...buena, amigos: ["desconocido-las"] },
        { ...buena, amigos: ["pozo-las", "charco-las"] },
        { ...buena, kda: -1 },
        { ...buena, resultado: "remake" },
        buena,
      ],
      peor_jugador_hoy: "no es lista",
    });
    expect(slugsDe(t.mejor_jugador_hoy)).toEqual(["pozo-las"]);
    expect(t.peor_jugador_hoy).toEqual([]);
    expect(t.mejor_jugador_mes).toEqual([]);
  });

  it("deja como máximo 5", () => {
    const muchas = Array.from({ length: 8 }, (_, i) =>
      partidaTop("charco-las", 100 + i, "Ahri", 10 - i, 1, 1, "victoria"),
    );
    const t = validar({ mejor_jugador_mes: muchas });
    expect(t.mejor_jugador_mes).toHaveLength(MAX_TOP);
    expect(t.mejor_jugador_mes.map((e) => e.campeon_id)).toEqual([100, 101, 102, 103, 104]);
  });
});

describe("topGlobalDe", () => {
  const d = validarDestacados(
    crearDestacados({ tops: crearTops(), tops_global: crearTopsGlobal({ peor_jugador_semana: [] }) }),
    AMIGOS_TOPS,
  );

  it("devuelve la lista de mejor/peor jugador", () => {
    expect(topGlobalDe(d, "mejor_jugador_semana")).toHaveLength(5);
  });

  it("null para récords, listas vacías, tarjetas vacías y archivos sin tops_global", () => {
    expect(topGlobalDe(d, "balance_hoy")).toBeNull();
    expect(topGlobalDe(d, "peor_jugador_semana")).toBeNull();
    expect(topGlobalDe({ ...d, mejor_jugador_semana: null }, "mejor_jugador_semana")).toBeNull();
    expect(topGlobalDe({ ...d, tops_global: null }, "mejor_jugador_semana")).toBeNull();
    expect(topGlobalDe(null, "mejor_jugador_semana")).toBeNull();
  });
});

describe("destacadosVigentes con tops_global", () => {
  const HORA = 3600 * 1000;
  const DIA = 24 * HORA;
  const d = validarDestacados(crearDestacados({ tops: crearTops(), tops_global: crearTopsGlobal() }), AMIGOS_TOPS);

  it("día vencido: anula solo los de hoy, sin tocar el original", () => {
    const v = destacadosVigentes(d, d.hoy_desde + 25 * HORA);
    expect(v.tops_global.mejor_jugador_hoy).toBeNull();
    expect(v.tops_global.peor_jugador_hoy).toBeNull();
    expect(v.tops_global.mejor_jugador_semana).toHaveLength(5);
    expect(v.tops_global).not.toHaveProperty("balance_hoy");
    expect(d.tops_global.mejor_jugador_hoy).toHaveLength(5);
    expect(topGlobalDe(v, "mejor_jugador_hoy")).toBeNull();
  });

  it("semana y mes vencidos: anula los suyos", () => {
    const s = destacadosVigentes(d, d.semana_desde + 7 * DIA);
    expect(s.tops_global.mejor_jugador_semana).toBeNull();
    expect(s.tops_global.peor_jugador_semana).toBeNull();
    const m = destacadosVigentes(d, d.mes.hasta + 3 * DIA);
    expect(m.tops_global.mejor_jugador_mes).toBeNull();
    expect(m.tops_global.peor_jugador_mes).toBeNull();
  });

  it("sin tops_global sigue funcionando", () => {
    const viejo = validarDestacados(crearDestacados({ tops: crearTops() }), AMIGOS_TOPS);
    expect(destacadosVigentes(viejo, viejo.hoy_desde + 25 * HORA).tops_global).toBeNull();
  });
});
