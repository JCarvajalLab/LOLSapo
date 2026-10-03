import { afterEach, describe, expect, it, vi } from "vitest";
import trabajador, { ErrorDisparador, configuracion, disparar } from "./index.js";

// Token falso armado en tiempo de ejecución (así gitleaks no lo confunde con uno real).
const TOKEN = ["github", "pat", "x".repeat(20), "prueba"].join("_");
const ENV = { REPO: "JCarvajalLab/LOLSapo", WORKFLOW: "publicar.yml", RAMA: "main", GH_TOKEN: TOKEN };

function respuesta(status) {
  return { status };
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

describe("handler programado", () => {
  it("lanza el workflow y propaga los errores para que Cloudflare los marque", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchSimulado = vi.spyOn(globalThis, "fetch");
    fetchSimulado.mockResolvedValueOnce(respuesta(204));
    await expect(trabajador.scheduled({}, ENV)).resolves.toBeUndefined();

    fetchSimulado.mockResolvedValueOnce(respuesta(401));
    await expect(trabajador.scheduled({}, ENV)).rejects.toThrow("401");
  });

  it("no tiene handler fetch (sin URL pública)", () => {
    expect(trabajador.fetch).toBeUndefined();
  });
});
