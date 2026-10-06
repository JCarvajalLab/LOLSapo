import { describe, expect, it } from "vitest";
import {
  anchoPartidas,
  esWinratePositivo,
  filasConTodos,
  formatearTasa,
  ordenarSinergia,
  siguienteOrden,
  validarPeriodoSinergia,
  validarSinergia,
} from "./sinergia.js";
import { validarDatos } from "./datos.js";
import { crearDatos } from "../test/fixtures/lol.js";

const AMIGOS = [{ slug: "rana-las" }, { slug: "sapo-las" }, { slug: "charco-las" }];
const fila = (amigo, partidas, victorias, derrotas, winrate) => ({ amigo, partidas, victorias, derrotas, winrate });

describe("validarPeriodoSinergia", () => {
  it("devuelve null si falta, es null o no es un objeto", () => {
    expect(validarPeriodoSinergia(undefined, AMIGOS)).toBeNull();
    expect(validarPeriodoSinergia(null, AMIGOS)).toBeNull();
    expect(validarPeriodoSinergia([], AMIGOS)).toBeNull();
    expect(validarPeriodoSinergia("hola", AMIGOS)).toBeNull();
  });

  it("deja una lista por amigo conocido y descarta slugs desconocidos", () => {
    const r = validarPeriodoSinergia(
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
    const r = validarPeriodoSinergia(
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
    const r = validarPeriodoSinergia(
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
    const r = validarPeriodoSinergia(JSON.parse('{"__proto__": [], "constructor": []}'), [{ slug: "constructor" }]);
    expect(r).toEqual({ constructor: [] });
  });

});

describe("validarSinergia", () => {
  const periodo30 = { "rana-las": [fila("sapo-las", 4, 1, 3, 25)] };
  const periodoTodo = { "rana-las": [fila("sapo-las", 10, 6, 4, 60), fila("charco-las", 2, 2, 0, 100)] };

  it("devuelve null si falta, no es un objeto o no trae ningún período", () => {
    expect(validarSinergia(undefined, AMIGOS)).toBeNull();
    expect(validarSinergia(null, AMIGOS)).toBeNull();
    expect(validarSinergia([], AMIGOS)).toBeNull();
    expect(validarSinergia({ ultimos_30_dias: null, todo: null }, AMIGOS)).toBeNull();
    expect(validarSinergia({ ultimos_30_dias: [], todo: "x" }, AMIGOS)).toBeNull();
  });

  it("valida cada período por separado con las mismas reglas", () => {
    const r = validarSinergia(
      {
        ultimos_30_dias: { ...periodo30, "sapo-las": [fila("sapo-las", 1, 1, 0, 100), fila("intruso-las", 3, 1, 2, 33.3)] },
        todo: { ...periodoTodo, "charco-las": [fila("rana-las", 3, 2, 2, 50)] },
      },
      AMIGOS,
    );
    expect(r.ultimos_30_dias).toEqual({ "rana-las": [fila("sapo-las", 4, 1, 3, 25)], "sapo-las": [], "charco-las": [] });
    expect(r.todo["rana-las"]).toEqual([fila("sapo-las", 10, 6, 4, 60), fila("charco-las", 2, 2, 0, 100)]);
    expect(r.todo["charco-las"]).toEqual([]); // 2 + 2 != 3
    expect(r.todo["sapo-las"]).toEqual([]);
  });

  it("un período que falta o es null queda en null y el otro se conserva", () => {
    expect(validarSinergia({ todo: periodoTodo }, AMIGOS).ultimos_30_dias).toBeNull();
    const r = validarSinergia({ ultimos_30_dias: periodo30, todo: null }, AMIGOS);
    expect(r.todo).toBeNull();
    expect(r.ultimos_30_dias["rana-las"]).toEqual([fila("sapo-las", 4, 1, 3, 25)]);
  });

  it("compatibilidad: el formato viejo { slug: filas } se toma como «todo»", () => {
    const r = validarSinergia(periodoTodo, AMIGOS);
    expect(r.ultimos_30_dias).toBeNull();
    expect(r.todo["rana-las"]).toEqual([fila("sapo-las", 10, 6, 4, 60), fila("charco-las", 2, 2, 0, 100)]);
    expect(r.todo["sapo-las"]).toEqual([]);
    // Un objeto viejo vacío sigue siendo válido: todos sin compañeros.
    expect(validarSinergia({}, AMIGOS)).toEqual({
      ultimos_30_dias: null,
      todo: { "rana-las": [], "sapo-las": [], "charco-las": [] },
    });
  });

  it("validarDatos la incluye y deja null en archivos sin sinergia", () => {
    expect(validarDatos(crearDatos()).sinergia).toBeNull();
    const datos = validarDatos(
      crearDatos({
        sinergia: {
          ultimos_30_dias: { "rana-azul-las": [fila("sapito-las", 2, 1, 1, 50), fila("nadie-las", 1, 1, 0, 100)] },
          todo: null,
        },
      }),
    );
    expect(datos.sinergia.ultimos_30_dias["rana-azul-las"]).toEqual([fila("sapito-las", 2, 1, 1, 50)]);
    expect(datos.sinergia.ultimos_30_dias["charco-las"]).toEqual([]);
    expect(datos.sinergia.todo).toBeNull();
  });
});

describe("filasConTodos", () => {
  const filas = [fila("b", 5, 4, 1, 80), fila("a", 10, 4, 6, 40)];
  const slugs = (lista) => lista.map((f) => f.amigo);

  it("incluye a todos los compañeros y deja al final, en orden del grupo, a los sin partidas", () => {
    const r = filasConTodos(filas, ["c", "a", "d", "b"], "partidas", "desc");
    expect(slugs(r)).toEqual(["a", "b", "c", "d"]);
    expect(r[2]).toEqual({ amigo: "c", partidas: 0, victorias: 0, derrotas: 0, winrate: null, sinPartidas: true });
    expect(r[0].sinPartidas).toBeUndefined();
  });

  it("los sin partidas siguen al final en cualquier orden", () => {
    expect(slugs(filasConTodos(filas, ["c", "a", "b"], "winrate", "asc"))).toEqual(["a", "b", "c"]);
    expect(slugs(filasConTodos(filas, ["c", "a", "b"], "partidas", "asc"))).toEqual(["b", "a", "c"]);
  });

  it("ignora filas de quien no está entre los compañeros y tolera listas vacías", () => {
    expect(slugs(filasConTodos(filas, ["b"]))).toEqual(["b"]);
    expect(filasConTodos(null, null)).toEqual([]);
    expect(slugs(filasConTodos([], ["x"]))).toEqual(["x"]);
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
