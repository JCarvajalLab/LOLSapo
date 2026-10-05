import { describe, expect, it } from "vitest";
import {
  anchoPartidas,
  esWinratePositivo,
  formatearTasa,
  ordenarSinergia,
  siguienteOrden,
  validarSinergia,
} from "./sinergia.js";
import { validarDatos } from "./datos.js";
import { crearDatos } from "../test/fixtures/lol.js";

const AMIGOS = [{ slug: "rana-las" }, { slug: "sapo-las" }, { slug: "charco-las" }];
const fila = (amigo, partidas, victorias, derrotas, winrate) => ({ amigo, partidas, victorias, derrotas, winrate });

describe("validarSinergia", () => {
  it("devuelve null si falta, es null o no es un objeto", () => {
    expect(validarSinergia(undefined, AMIGOS)).toBeNull();
    expect(validarSinergia(null, AMIGOS)).toBeNull();
    expect(validarSinergia([], AMIGOS)).toBeNull();
    expect(validarSinergia("hola", AMIGOS)).toBeNull();
  });

  it("deja una lista por amigo conocido y descarta slugs desconocidos", () => {
    const r = validarSinergia(
      {
        "rana-las": [fila("sapo-las", 10, 6, 4, 60), fila("intruso-las", 50, 25, 25, 50)],
        "intruso-las": [fila("rana-las", 3, 1, 2, 33.3)],
      },
      AMIGOS,
    );
    expect(Object.keys(r).sort()).toEqual(["charco-las", "rana-las", "sapo-las"]);
    expect(r["rana-las"]).toEqual([fila("sapo-las", 10, 6, 4, 60)]);
    expect(r["sapo-las"]).toEqual([]);
  });

  it("descarta al propio amigo, repetidos y filas incoherentes", () => {
    const r = validarSinergia(
      {
        "rana-las": [
          fila("rana-las", 5, 3, 2, 60), // él mismo
          fila("sapo-las", 4, 3, 2, 75), // 3 + 2 != 4
          fila("sapo-las", 0, 0, 0, null), // sin partidas
          fila("sapo-las", 2.5, 1, 1.5, 40), // no enteros
          fila("sapo-las", 2, -1, 3, 0), // negativo
          fila("sapo-las", 2, 1, 1, 150), // winrate fuera de rango
          fila("sapo-las", 2, 1, 1, "50"), // winrate no numérico
          null,
          "texto",
          fila("charco-las", 4, 1, 3, 25),
          fila("charco-las", 9, 9, 0, 100), // repetido: queda el primero
        ],
      },
      AMIGOS,
    );
    expect(r["rana-las"]).toEqual([fila("charco-las", 4, 1, 3, 25)]);
  });

  it("calcula el winrate si viene null u omitido, y ordena por partidas", () => {
    const r = validarSinergia(
      {
        "sapo-las": [
          { amigo: "rana-las", partidas: 3, victorias: 2, derrotas: 1 },
          fila("charco-las", 8, 4, 4, null),
        ],
      },
      AMIGOS,
    );
    expect(r["sapo-las"]).toEqual([fila("charco-las", 8, 4, 4, 50), fila("rana-las", 3, 2, 1, 66.7)]);
  });

  it("ignora claves heredadas del prototipo", () => {
    const r = validarSinergia(JSON.parse('{"__proto__": [], "constructor": []}'), [{ slug: "constructor" }]);
    expect(r).toEqual({ constructor: [] });
  });

  it("validarDatos la incluye y deja null en archivos viejos", () => {
    expect(validarDatos(crearDatos()).sinergia).toBeNull();
    const datos = validarDatos(
      crearDatos({ sinergia: { "rana-azul-las": [fila("sapito-las", 2, 1, 1, 50), fila("nadie-las", 1, 1, 0, 100)] } }),
    );
    expect(datos.sinergia["rana-azul-las"]).toEqual([fila("sapito-las", 2, 1, 1, 50)]);
    expect(datos.sinergia["charco-las"]).toEqual([]);
  });
});

describe("orden de la tabla", () => {
  const filas = [fila("a", 10, 4, 6, 40), fila("b", 5, 4, 1, 80), fila("c", 10, 6, 4, 60), fila("d", 2, 1, 1, 50)];
  const slugs = (lista) => lista.map((f) => f.amigo);

  it("ordena por partidas y desempata por más partidas y luego slug", () => {
    expect(slugs(ordenarSinergia(filas, "partidas", "desc"))).toEqual(["a", "c", "b", "d"]);
    expect(slugs(ordenarSinergia(filas, "partidas", "asc"))).toEqual(["d", "b", "a", "c"]);
  });

  it("ordena por tasa de victorias en ambos sentidos sin mutar la lista", () => {
    const copia = [...filas];
    expect(slugs(ordenarSinergia(filas, "winrate", "desc"))).toEqual(["b", "c", "d", "a"]);
    expect(slugs(ordenarSinergia(filas, "winrate", "asc"))).toEqual(["a", "d", "c", "b"]);
    expect(filas).toEqual(copia);
  });

  it("el primer clic ordena descendente y el segundo ascendente", () => {
    const inicio = { columna: "partidas", direccion: "desc" };
    expect(siguienteOrden(inicio, "winrate")).toEqual({ columna: "winrate", direccion: "desc" });
    expect(siguienteOrden({ columna: "winrate", direccion: "desc" }, "winrate")).toEqual({
      columna: "winrate",
      direccion: "asc",
    });
    expect(siguienteOrden({ columna: "winrate", direccion: "asc" }, "winrate").direccion).toBe("desc");
  });
});

describe("formato de la tabla", () => {
  it("barra de jugadas proporcional al máximo", () => {
    expect(anchoPartidas(65, 65)).toBe(100);
    expect(anchoPartidas(13, 65)).toBe(20);
    expect(anchoPartidas(5, 0)).toBe(0);
    expect(anchoPartidas(null, 10)).toBe(0);
  });

  it("verde desde 50 %", () => {
    expect(esWinratePositivo(50)).toBe(true);
    expect(esWinratePositivo(49.9)).toBe(false);
    expect(esWinratePositivo(null)).toBe(false);
  });

  it("tasa con un decimal y coma", () => {
    const nb = String.fromCharCode(0xa0);
    expect(formatearTasa(47.7)).toBe(`47,7${nb}%`);
    expect(formatearTasa(50)).toBe(`50,0${nb}%`);
    expect(formatearTasa(null)).toBe("—");
  });
});
