import { describe, expect, it } from "vitest";
import {
  extraerActividad,
  fechaAClaveIso,
  formatearFechaCorta,
  formatearTiempoJugado,
  generarEtiquetasMeses,
  generarMatrizActividad,
  nivelCalor,
} from "./calendarioActividad.js";

describe("calendarioActividad", () => {
  it("extraerActividad devuelve actividad si existe o fallback de partidas si no", () => {
    const act = { "2026-10-09": { partidas: 3 } };
    expect(extraerActividad(act, [])).toEqual(act);

    const partidas = [
      { fecha: new Date(2026, 9, 9, 14).getTime(), resultado: "victoria", duracion: 1200 },
      { fecha: new Date(2026, 9, 9, 16).getTime(), resultado: "derrota", duracion: 1800 },
    ];
    const sintetizada = extraerActividad(null, partidas);
    expect(sintetizada["2026-10-09"]).toBeDefined();
    expect(sintetizada["2026-10-09"].partidas).toBe(2);
    expect(sintetizada["2026-10-09"].victorias).toBe(1);
    expect(sintetizada["2026-10-09"].derrotas).toBe(1);
    expect(sintetizada["2026-10-09"].duracion).toBe(3000);
  });
  it("fechaAClaveIso formatea correctamente en YYYY-MM-DD", () => {
    const d = new Date(2026, 9, 9); // 9 de octubre de 2026
    expect(fechaAClaveIso(d)).toBe("2026-10-09");
  });

  it("formatearFechaCorta convierte YYYY-MM-DD a DD/MM/YYYY", () => {
    expect(formatearFechaCorta("2026-10-09")).toBe("09/10/2026");
    expect(formatearFechaCorta("")).toBe("—");
  });

  it("nivelCalor clasifica según la cantidad de partidas", () => {
    expect(nivelCalor(0)).toBe(0);
    expect(nivelCalor(null)).toBe(0);
    expect(nivelCalor(1)).toBe(1);
    expect(nivelCalor(2)).toBe(1);
    expect(nivelCalor(3)).toBe(2);
    expect(nivelCalor(5)).toBe(2);
    expect(nivelCalor(6)).toBe(3);
    expect(nivelCalor(20)).toBe(3);
  });

  it("formatearTiempoJugado devuelve horas y minutos amigables", () => {
    expect(formatearTiempoJugado(0)).toBe("0 min");
    expect(formatearTiempoJugado(1800)).toBe("30 min");
    expect(formatearTiempoJugado(3600)).toBe("1 h");
    expect(formatearTiempoJugado(11340)).toBe("3 h 9 min"); // ~3 horas y 9 minutos
  });

  it("generarMatrizActividad genera la cantidad requerida de semanas con 7 días cada una", () => {
    // 22 de octubre de 2026 (jueves)
    const ahora = new Date(2026, 9, 22).getTime();
    const actividadMock = {
      "2026-10-22": { partidas: 5, victorias: 3, derrotas: 2, duracion: 7500 },
      "2026-10-20": { partidas: 2, victorias: 1, derrotas: 1, duracion: 3000 },
    };

    const semanas = generarMatrizActividad(actividadMock, ahora, 15);
    expect(semanas).toHaveLength(15);
    semanas.forEach((sem) => {
      expect(sem).toHaveLength(7);
      // Los días van de 0 (Lunes) a 6 (Domingo)
      sem.forEach((dia, idx) => {
        expect(dia.diaSemana).toBe(idx);
      });
    });

    // El día 2026-10-22 debe tener sus datos
    const todasLasCeldas = semanas.flat();
    const celdaHoy = todasLasCeldas.find((c) => c.fechaIso === "2026-10-22");
    expect(celdaHoy).toBeDefined();
    expect(celdaHoy.partidas).toBe(5);
    expect(celdaHoy.victorias).toBe(3);
    expect(celdaHoy.derrotas).toBe(2);
    expect(celdaHoy.esFuturo).toBe(false);

    // Los días posteriores a hoy en la misma semana deben ser esFuturo: true
    const celdaViernes = todasLasCeldas.find((c) => c.fechaIso === "2026-10-23");
    if (celdaViernes) {
      expect(celdaViernes.esFuturo).toBe(true);
    }
  });

  it("generarEtiquetasMeses extrae etiquetas en columnas donde cambia el mes", () => {
    const ahora = new Date(2026, 9, 22).getTime();
    const semanas = generarMatrizActividad({}, ahora, 15);
    const etiquetas = generarEtiquetasMeses(semanas);

    expect(etiquetas.length).toBeGreaterThanOrEqual(3);
    expect(etiquetas[0]).toHaveProperty("columna");
    expect(etiquetas[0]).toHaveProperty("etiqueta");
  });
});
