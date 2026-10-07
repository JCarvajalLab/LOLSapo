import { describe, expect, it } from "vitest";
import { AMIGOS_TOPS, crearDestacados, crearTops, partidaTop, recordTop } from "../test/fixtures/lol.js";
import { CLAVES_TOPS, destacadosVigentes, MAX_TOP, topDe, validarDestacados, validarTops } from "./destacados.js";

const SLUGS = new Set(AMIGOS_TOPS.map((a) => a.slug));
const validar = (tops) => validarTops(tops, SLUGS);
const slugsDe = (lista) => lista.map((e) => e.amigos[0]);

describe("validarTops", () => {
  it("sin tops (archivos viejos) o con algo que no es objeto: null", () => {
    expect(validar(undefined)).toBeNull();
    expect(validar(null)).toBeNull();
    expect(validar([])).toBeNull();
    expect(validar("tops")).toBeNull();
    expect(validarDestacados(crearDestacados(), AMIGOS_TOPS).tops).toBeNull();
  });

  it("las rachas no tienen top", () => {
    expect(CLAVES_TOPS).not.toContain("racha_victorias_grupo");
    expect(CLAVES_TOPS).not.toContain("racha_derrotas_grupo");
    expect(CLAVES_TOPS).toHaveLength(10);
  });

  it("acepta los tops completos y respeta el orden del recolector", () => {
    const t = validar(crearTops());
    expect(Object.keys(t).sort()).toEqual([...CLAVES_TOPS].sort());
    expect(slugsDe(t.mejor_jugador_semana)).toEqual([
      "charco-las",
      "sapito-las",
      "rana-azul-las",
      "renacuajo-las",
      "pozo-las",
    ]);
    expect(slugsDe(t.peor_jugador_semana)[0]).toBe("pozo-las");
    expect(t.mas_partidas[0]).toEqual({ amigos: ["rana-azul-las"], partidas: 20, victorias: 12, derrotas: 8, winrate: 60 });
    expect(t.mejor_jugador_hoy[0]).toMatchObject({ campeon: "Ahri", asesinatos: 15, danio: 25000 });
    expect(t.mejor_jugador_hoy[4].danio).toBeNull();
  });

  it("solo las claves conocidas; las que faltan o no son lista quedan vacías", () => {
    const t = validar({ mejor_jugador_hoy: crearTops().mejor_jugador_hoy, otra_cosa: [recordTop("sapito-las", 1, 0)], balance_hoy: "x" });
    expect(t).not.toHaveProperty("otra_cosa");
    expect(t).not.toHaveProperty("racha_victorias_grupo");
    expect(t.mejor_jugador_hoy).toHaveLength(5);
    expect(t.balance_hoy).toEqual([]);
    expect(t.mas_partidas).toEqual([]);
  });

  it("descarta entradas de récord inválidas", () => {
    const t = validar({
      balance_mes: [
        { ...recordTop("sapito-las", 3, 1), partidas: 5 }, // no suma
        { ...recordTop("sapito-las", 3, 1), winrate: 120 },
        { ...recordTop("sapito-las", 3, 1), winrate: null },
        { ...recordTop("sapito-las", 3, 1), victorias: 2.5 },
        { ...recordTop("sapito-las", 0, 0) }, // sin partidas
        { ...recordTop("sapito-las", 3, 1), amigos: ["sapito-las", "charco-las"] }, // dos amigos
        { ...recordTop("sapito-las", 3, 1), amigos: ["desconocido-las"] },
        { ...recordTop("sapito-las", 3, 1), amigos: "sapito-las" },
        null,
        [],
        recordTop("charco-las", 1, 1),
      ],
    });
    expect(t.balance_mes).toEqual([{ amigos: ["charco-las"], partidas: 2, victorias: 1, derrotas: 1, winrate: 50 }]);
  });

  it("descarta partidas inválidas y amigos repetidos", () => {
    const t = validar({
      mejor_jugador_mes: [
        partidaTop("sapito-las", 11, "MasterYi", 12, 2, 4, "remake"),
        partidaTop("sapito-las", 11, "MasterYi", -1, 2, 4, "victoria"),
        partidaTop("sapito-las", 11, "MasterYi", 12, 2, 4, "victoria", { fecha: "ayer" }),
        partidaTop("charco-las", 103, "Ahri", 15, 1, 9, "victoria", { danio: -5 }),
        partidaTop("charco-las", 1, "Annie", 1, 1, 1, "derrota"),
      ],
    });
    expect(t.mejor_jugador_mes).toHaveLength(1);
    expect(t.mejor_jugador_mes[0]).toMatchObject({ amigos: ["charco-las"], campeon: "Ahri", danio: null });
  });

  it("máximo 5 entradas", () => {
    const conSexto = new Set([...SLUGS, "sexto-las"]);
    const seis = [...crearTops().balance_hoy, recordTop("sexto-las", 9, 9)];
    expect(MAX_TOP).toBe(5);
    const t = validarTops({ balance_hoy: seis }, conSexto);
    expect(t.balance_hoy).toHaveLength(5);
    expect(slugsDe(t.balance_hoy)).not.toContain("sexto-las");
    // Si una de las primeras es inválida, entra la sexta.
    const conInvalida = [{ ...seis[0], winrate: 101 }, ...seis.slice(1)];
    expect(slugsDe(validarTops({ balance_hoy: conInvalida }, conSexto).balance_hoy).at(-1)).toBe("sexto-las");
  });

  it("validarDestacados trae los tops validados", () => {
    const d = validarDestacados(crearDestacados({ tops: crearTops() }), AMIGOS_TOPS);
    expect(d.tops.balance_hoy).toHaveLength(5);
  });
});

describe("topDe", () => {
  const d = validarDestacados(crearDestacados({ tops: crearTops({ balance_hoy: [] }) }), AMIGOS_TOPS);

  it("devuelve el top si la tarjeta tiene datos y la lista no está vacía", () => {
    expect(topDe(d, "mejor_jugador_semana")).toHaveLength(5);
  });

  it("null para rachas, listas vacías, tarjetas vacías y archivos sin tops", () => {
    expect(topDe(d, "racha_victorias_grupo")).toBeNull();
    expect(topDe(d, "balance_hoy")).toBeNull();
    expect(topDe({ ...d, mejor_jugador_semana: null }, "mejor_jugador_semana")).toBeNull();
    expect(topDe({ ...d, tops: null }, "mejor_jugador_semana")).toBeNull();
    expect(topDe(null, "mejor_jugador_semana")).toBeNull();
  });
});

describe("destacadosVigentes con tops", () => {
  const HORA = 3600 * 1000;
  const DIA = 24 * HORA;
  const d = validarDestacados(crearDestacados({ tops: crearTops() }), AMIGOS_TOPS);

  it("día vencido: anula solo los tops de hoy, sin tocar el original", () => {
    const v = destacadosVigentes(d, d.hoy_desde + 25 * HORA);
    expect(v.tops.mejor_jugador_hoy).toBeNull();
    expect(v.tops.peor_jugador_hoy).toBeNull();
    expect(v.tops.balance_hoy).toBeNull();
    expect(v.tops.mejor_jugador_semana).toHaveLength(5);
    expect(v.tops.balance_mes).toHaveLength(5);
    expect(d.tops.mejor_jugador_hoy).toHaveLength(5);
    expect(topDe(v, "mejor_jugador_hoy")).toBeNull();
  });

  it("semana vencida: anula los tops de la semana", () => {
    const v = destacadosVigentes(d, d.semana_desde + 7 * DIA);
    for (const clave of ["mas_partidas", "mejor_winrate", "mejor_jugador_semana", "peor_jugador_semana"]) {
      expect(v.tops[clave]).toBeNull();
    }
    expect(v.tops).not.toHaveProperty("racha_victorias_grupo");
  });

  it("mes vencido: anula los tops del mes", () => {
    const v = destacadosVigentes(d, d.mes.hasta + 3 * DIA);
    expect(v.tops.mejor_jugador_mes).toBeNull();
    expect(v.tops.peor_jugador_mes).toBeNull();
    expect(v.tops.balance_mes).toBeNull();
  });

  it("sin tops sigue funcionando", () => {
    const viejo = validarDestacados(crearDestacados(), AMIGOS_TOPS);
    expect(destacadosVigentes(viejo, viejo.hoy_desde + 25 * HORA).tops).toBeNull();
  });
});
