import { afterEach, describe, expect, it, vi } from "vitest";
import trabajador, {
  ErrorDisparador,
  MINUTOS_TRABADA,
  cancelarTrabadas,
  configuracion,
  disparar,
} from "./index.js";

// Token falso armado en tiempo de ejecución (así gitleaks no lo confunde con uno real).
const TOKEN = ["github", "pat", "x".repeat(20), "prueba"].join("_");
const ENV = { REPO: "JCarvajalLab/LOLSapo", WORKFLOW: "publicar.yml", RAMA: "main", GH_TOKEN: TOKEN };

function respuesta(status, cuerpo = null) {
  return { status, json: async () => cuerpo };
}

const AHORA = Date.parse("2026-10-06T16:30:00Z");
const MIN = 60 * 1000;

function ejecucion(id, minutosAtras, status = "waiting") {
  return { id, status, updated_at: new Date(AHORA - minutosAtras * MIN).toISOString() };
}

function lista(...ejecuciones) {
  return respuesta(200, { total_count: ejecuciones.length, workflow_runs: ejecuciones });
}

afterEach(() => vi.restoreAllMocks());

describe("disparar", () => {
  it("pide a GitHub ejecutar el workflow en la rama main", async () => {
    const fetchFn = vi.fn().mockResolvedValue(respuesta(204));
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(disparar(ENV, fetchFn)).resolves.toBe(204);

    const [url, opciones] = fetchFn.mock.calls[0];
    expect(url).toBe(
      "https://api.github.com/repos/JCarvajalLab/LOLSapo/actions/workflows/publicar.yml/dispatches",
    );
    expect(opciones.method).toBe("POST");
    expect(opciones.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(opciones.headers["User-Agent"]).toBeTruthy();
    expect(opciones.redirect).toBe("manual");
    expect(JSON.parse(opciones.body)).toEqual({ ref: "main" });
  });

  it("acepta cualquier respuesta 2xx", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(disparar(ENV, vi.fn().mockResolvedValue(respuesta(200)))).resolves.toBe(200);
  });

  it.each([401, 403, 404, 422, 500, 302])("falla con %i sin mostrar el token", async (status) => {
    const fetchFn = vi.fn().mockResolvedValue(respuesta(status));
    const error = await disparar(ENV, fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorDisparador);
    expect(error.message).toContain(String(status));
    expect(error.message).not.toContain(TOKEN);
  });

  it("un error de red no expone el mensaje original", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError(`falló con ${TOKEN}`));
    const error = await disparar(ENV, fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorDisparador);
    expect(error.message).toBe("No se pudo contactar a GitHub (TypeError)");
  });

  it("nunca escribe el token en los logs", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await disparar(ENV, vi.fn().mockResolvedValue(respuesta(204)));
    await disparar(ENV, vi.fn().mockResolvedValue(respuesta(401))).catch(() => {});
    const escrito = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
    expect(escrito).not.toContain(TOKEN);
  });
});

describe("configuracion", () => {
  it.each([
    [{ REPO: "sin-barra" }, "REPO"],
    [{ REPO: "a/b/c" }, "REPO"],
    [{ REPO: "a/b?x=1" }, "REPO"],
    [{ WORKFLOW: "../ci.yml" }, "WORKFLOW"],
    [{ WORKFLOW: "publicar" }, "WORKFLOW"],
    [{ RAMA: "" }, "RAMA"],
    [{ RAMA: "main/../x" }, "RAMA"],
    [{ GH_TOKEN: "" }, "GH_TOKEN"],
    [{ GH_TOKEN: undefined }, "GH_TOKEN"],
  ])("rechaza %o", (cambio, campo) => {
    expect(() => configuracion({ ...ENV, ...cambio })).toThrow(campo);
  });

  it("sin configuración no llama a GitHub", async () => {
    const fetchFn = vi.fn();
    await expect(disparar({}, fetchFn)).rejects.toBeInstanceOf(ErrorDisparador);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("cancelarTrabadas", () => {
  it(`cancela solo las que llevan más de ${MINUTOS_TRABADA} min en "waiting"`, async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(lista(ejecucion(934, 420), ejecucion(1020, 5), ejecucion(7, 60, "queued")))
      .mockResolvedValueOnce(respuesta(202));

    await expect(cancelarTrabadas(ENV, fetchFn, AHORA)).resolves.toEqual([934]);

    const [urlLista, opcionesLista] = fetchFn.mock.calls[0];
    expect(urlLista).toBe(
      "https://api.github.com/repos/JCarvajalLab/LOLSapo/actions/workflows/publicar.yml/runs?status=waiting&per_page=20&exclude_pull_requests=true",
    );
    expect(opcionesLista.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(opcionesLista.redirect).toBe("manual");
    const [urlCancelar, opcionesCancelar] = fetchFn.mock.calls[1];
    expect(urlCancelar).toBe("https://api.github.com/repos/JCarvajalLab/LOLSapo/actions/runs/934/cancel");
    expect(opcionesCancelar.method).toBe("POST");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("sin trabadas no cancela nada", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(lista(ejecucion(1, 3)));
    await expect(cancelarTrabadas(ENV, fetchFn, AHORA)).resolves.toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("cancela como máximo 5 por vez", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const muchas = Array.from({ length: 8 }, (_, i) => ejecucion(i + 1, 60));
    const fetchFn = vi.fn().mockResolvedValueOnce(lista(...muchas)).mockResolvedValue(respuesta(202));
    await expect(cancelarTrabadas(ENV, fetchFn, AHORA)).resolves.toHaveLength(5);
  });

  it.each([
    ["GitHub responde un error", () => Promise.resolve(respuesta(500))],
    ["falla la red", () => Promise.reject(new TypeError(`falló con ${TOKEN}`))],
    ["la respuesta no tiene la forma esperada", () => Promise.resolve(respuesta(200, { x: 1 }))],
  ])("si %s, no lanza ni muestra el token", async (_caso, falla) => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchFn = vi.fn().mockImplementationOnce(falla);
    await expect(cancelarTrabadas(ENV, fetchFn, AHORA)).resolves.toEqual([]);
    expect(JSON.stringify(error.mock.calls)).not.toContain(TOKEN);
  });

  it("ignora ids o fechas raros", async () => {
    const raras = [
      { id: "934", status: "waiting", updated_at: "2026-10-06T09:00:00Z" },
      { id: -1, status: "waiting", updated_at: "2026-10-06T09:00:00Z" },
      { id: 5, status: "waiting", updated_at: "ayer" },
    ];
    const fetchFn = vi.fn().mockResolvedValueOnce(lista(...raras));
    await expect(cancelarTrabadas(ENV, fetchFn, AHORA)).resolves.toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("handler programado", () => {
  it("primero libera las trabadas y después lanza el workflow", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchSimulado = vi.spyOn(globalThis, "fetch");
    fetchSimulado
      .mockResolvedValueOnce(lista(ejecucion(934, 60 * 24 * 365)))
      .mockResolvedValueOnce(respuesta(202))
      .mockResolvedValueOnce(respuesta(204));
    await expect(trabajador.scheduled({}, ENV)).resolves.toBeUndefined();
    const urls = fetchSimulado.mock.calls.map(([url]) => url);
    expect(urls[1]).toContain("/actions/runs/934/cancel");
    expect(urls[2]).toContain("/dispatches");
  });

  it("si revisar las trabadas falla, igual lanza el workflow", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSimulado = vi.spyOn(globalThis, "fetch");
    fetchSimulado.mockResolvedValueOnce(respuesta(500)).mockResolvedValueOnce(respuesta(204));
    await expect(trabajador.scheduled({}, ENV)).resolves.toBeUndefined();
    expect(fetchSimulado.mock.calls[1][0]).toContain("/dispatches");
  });

  it("propaga los errores del disparo para que Cloudflare los marque", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSimulado = vi.spyOn(globalThis, "fetch");
    fetchSimulado.mockResolvedValueOnce(lista()).mockResolvedValueOnce(respuesta(401));
    await expect(trabajador.scheduled({}, ENV)).rejects.toThrow("401");
  });

  it("no tiene handler fetch (sin URL pública)", () => {
    expect(trabajador.fetch).toBeUndefined();
  });
});

describe("cancelarTrabadas, casos extra", () => {
  it("sin configuración no lanza ni llama a GitHub", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchFn = vi.fn();
    await expect(cancelarTrabadas({}, fetchFn, AHORA)).resolves.toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("las consultas llevan timeout", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(lista(ejecucion(1, 60)))
      .mockResolvedValueOnce(respuesta(202));
    await cancelarTrabadas(ENV, fetchFn, AHORA);
    for (const [, opciones] of fetchFn.mock.calls) {
      expect(opciones.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("mide desde updated_at: una creada hace mucho pero recién en espera no se cancela", async () => {
    const reciente = {
      id: 9,
      status: "waiting",
      created_at: new Date(AHORA - 120 * MIN).toISOString(),
      updated_at: new Date(AHORA - 2 * MIN).toISOString(),
    };
    const fetchFn = vi.fn().mockResolvedValueOnce(lista(reciente));
    await expect(cancelarTrabadas(ENV, fetchFn, AHORA)).resolves.toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
