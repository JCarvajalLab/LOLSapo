import { describe, expect, it } from "vitest";
import {
  DEFINICION_METRICAS,
  CATEGORIAS_INFO,
  obtenerBloqueRecords,
  recordsDestacadosTarjeta,
  compararRecords,
} from "./records.js";

describe("records logic", () => {
  const mockRecords = {
    anio_actual: 2026,
    global: {
      anio_2026: {
        basicos: {
          kda: {
            valor_raw: 15.5,
            valor_formateado: "15.50",
            amigo_nombre: "Nico",
            amigo_slug: "nico",
            campeon: "Ahri",
            campeon_id: 103,
            partida_id: "LA2_1",
            victoria: true,
            duracion: "25:30",
            fecha: "2026-03-10",
          },
          asesinatos: {
            valor_raw: 22,
            valor_formateado: "22",
            amigo_nombre: "Johnadis",
            amigo_slug: "johnadis",
            campeon: "Zed",
            campeon_id: 238,
            partida_id: "LA2_2",
            victoria: true,
            duracion: "32:10",
            fecha: "2026-02-15",
          },
          asistencias: {
            valor_raw: 35,
            valor_formateado: "35",
            amigo_nombre: "ISkrat",
            amigo_slug: "iskrat",
            campeon: "Thresh",
            campeon_id: 412,
            partida_id: "LA2_3",
            victoria: true,
            duracion: "38:45",
            fecha: "2026-01-20",
          },
          cs: {
            valor_raw: 340,
            valor_formateado: "340",
            amigo_nombre: "Big Gato",
            amigo_slug: "big-gato",
            campeon: "Sivir",
            campeon_id: 15,
            partida_id: "LA2_4",
            victoria: false,
            duracion: "40:10",
            fecha: "2026-02-01",
          },
        },
        impacto: {
          danio: {
            valor_raw: 65200,
            valor_formateado: "65.2k",
            amigo_nombre: "Johnadis",
            amigo_slug: "johnadis",
            campeon: "Karthus",
            campeon_id: 30,
            partida_id: "LA2_5",
            victoria: true,
            duracion: "42:00",
            fecha: "2026-03-01",
          },
        },
        multikills: {
          pentakills: {
            valor_raw: 1,
            valor_formateado: "1",
            amigo_nombre: "Nico",
            amigo_slug: "nico",
            campeon: "Jinx",
            campeon_id: 222,
            partida_id: "LA2_6",
            victoria: true,
            duracion: "30:00",
            fecha: "2026-03-12",
          },
        },
        duracion: {
          partida_mas_larga: {
            valor_raw: 2850,
            valor_formateado: "47:30",
            amigo_nombre: "GralMogeko",
            amigo_slug: "gralmogeko",
            campeon: "Nasus",
            campeon_id: 75,
            partida_id: "LA2_7",
            victoria: true,
            duracion: "47:30",
            fecha: "2026-01-10",
          },
          victoria_mas_rapida: {
            valor_raw: 980,
            valor_formateado: "16:20",
            amigo_nombre: "Nico",
            amigo_slug: "nico",
            campeon: "Draven",
            campeon_id: 119,
            partida_id: "LA2_8",
            victoria: true,
            duracion: "16:20",
            fecha: "2026-02-28",
          },
        },
      },
      todo: {
        basicos: {
          asesinatos: {
            valor_raw: 30,
            valor_formateado: "30",
          },
        },
      },
    },
    por_amigo: {
      nico: {
        anio_2026: {
          basicos: {
            kda: { valor_raw: 15.5, valor_formateado: "15.50" },
            asesinatos: { valor_raw: 18, valor_formateado: "18" },
          },
          duracion: {
            victoria_mas_rapida: { valor_raw: 980, valor_formateado: "16:20" },
          },
        },
        todo: {
          basicos: {
            kda: { valor_raw: 16.0, valor_formateado: "16.00" },
          },
        },
      },
      johnadis: {
        anio_2026: {
          basicos: {
            kda: { valor_raw: 12.0, valor_formateado: "12.00" },
            asesinatos: { valor_raw: 22, valor_formateado: "22" },
          },
          duracion: {
            victoria_mas_rapida: { valor_raw: 1100, valor_formateado: "18:20" },
          },
        },
      },
    },
  };

  it("exporta DEFINICION_METRICAS y CATEGORIAS_INFO estructuradas", () => {
    expect(DEFINICION_METRICAS.length).toBeGreaterThan(10);
    expect(CATEGORIAS_INFO.length).toBe(4);
    const catKeys = CATEGORIAS_INFO.map((c) => c.clave);
    expect(catKeys).toEqual(["basicos", "impacto", "multikills", "duracion"]);
  });

  describe("obtenerBloqueRecords", () => {
    it("obtiene el bloque global de 2026 por defecto o por año", () => {
      const bloque = obtenerBloqueRecords(mockRecords, "global", "anio_actual");
      expect(bloque).toBeDefined();
      expect(bloque.basicos.kda.valor_raw).toBe(15.5);

      const bloqueAnio = obtenerBloqueRecords(mockRecords, "global", "2026");
      expect(bloqueAnio).toBe(bloque);
    });

    it("obtiene el bloque para un amigo específico", () => {
      const bloqueNico = obtenerBloqueRecords(mockRecords, "nico", "anio_actual");
      expect(bloqueNico).toBeDefined();
      expect(bloqueNico.basicos.asesinatos.valor_raw).toBe(18);
    });

    it("retorna fallback si el período específico no existe", () => {
      const bloqueNico = obtenerBloqueRecords(mockRecords, "nico", "dias_30");
      // Fallback a anio_2026 o todo
      expect(bloqueNico).toBeDefined();
      expect(bloqueNico.basicos.kda.valor_raw).toBe(15.5);
    });

    it("retorna null si los records o amigo no son válidos", () => {
      expect(obtenerBloqueRecords(null)).toBeNull();
      expect(obtenerBloqueRecords(undefined)).toBeNull();
      expect(obtenerBloqueRecords(mockRecords, "amigo_fantasma")).toBeNull();
    });
  });

  describe("recordsDestacadosTarjeta", () => {
    it("extrae las métricas principales para mostrar en la tarjeta resumen", () => {
      const bloque = mockRecords.global.anio_2026;
      const destacados = recordsDestacadosTarjeta(bloque);

      expect(destacados.length).toBe(5);
      const labels = destacados.map((d) => d.metrica_titulo);
      expect(labels).toContain("KDA más alto");
      expect(labels).toContain("Más Kills");
      expect(labels).toContain("Más Daño");
      expect(labels).toContain("Más Asistencias");
      expect(labels).toContain("Más Súbditos (CS)");
    });

    it("maneja bloques vacíos o nulos sin lanzar errores", () => {
      expect(recordsDestacadosTarjeta(null)).toEqual([]);
      expect(recordsDestacadosTarjeta({})).toEqual([]);
    });
  });

  describe("compararRecords", () => {
    it("compara dos amigos y calcula correctamente el ganador en métricas mayores y menores", () => {
      const bloqueA = mockRecords.por_amigo.nico.anio_2026;
      const bloqueB = mockRecords.por_amigo.johnadis.anio_2026;

      const resultado = compararRecords(bloqueA, bloqueB, "Nico", "Johnadis");
      expect(resultado.nombreA).toBe("Nico");
      expect(resultado.nombreB).toBe("Johnadis");

      // Nico tiene mejor KDA (15.5 > 12.0) -> A gana
      const compKDA = resultado.comparaciones.find((c) => c.metrica.clave === "kda");
      expect(compKDA.ganador).toBe("A");

      // Johnadis tiene más Kills (22 > 18) -> B gana
      const compKills = resultado.comparaciones.find((c) => c.metrica.clave === "asesinatos");
      expect(compKills.ganador).toBe("B");

      // Victoria más rápida: menor es mejor (980 < 1100) -> Nico (A) gana
      const compVicRapida = resultado.comparaciones.find((c) => c.metrica.clave === "victoria_mas_rapida");
      expect(compVicRapida.ganador).toBe("A");

      expect(resultado.marcador.victoriasA).toBe(2);
      expect(resultado.marcador.victoriasB).toBe(1);
    });

    it("maneja empates y métricas presentes sólo en uno de los jugadores", () => {
      const bloqueA = {
        basicos: {
          asesinatos: { valor_raw: 15 },
          asistencias: { valor_raw: 20 },
        },
      };
      const bloqueB = {
        basicos: {
          asesinatos: { valor_raw: 15 }, // empate
          kda: { valor_raw: 5.0 }, // solo en B
        },
      };

      const resultado = compararRecords(bloqueA, bloqueB, "A", "B");
      const compKills = resultado.comparaciones.find((c) => c.metrica.clave === "asesinatos");
      expect(compKills.ganador).toBe("empate");

      const compAsistencias = resultado.comparaciones.find((c) => c.metrica.clave === "asistencias");
      expect(compAsistencias.ganador).toBe("A");

      const compKDA = resultado.comparaciones.find((c) => c.metrica.clave === "kda");
      expect(compKDA.ganador).toBe("B");

      expect(resultado.marcador.empates).toBe(1);
      expect(resultado.marcador.victoriasA).toBe(1);
      expect(resultado.marcador.victoriasB).toBe(1);
    });
  });
});
