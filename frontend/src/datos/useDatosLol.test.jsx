import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { INTERVALO_ACTUALIZACION_MS, useDatosLol } from "./useDatosLol.js";
import App from "../App.jsx";
import { crearDatos } from "../test/fixtures/lol.js";

const DOS_MIN = INTERVALO_ACTUALIZACION_MS;

function respuestaOk(json) {
  return Promise.resolve({ ok: true, json: async () => json });
}

let visibilidad = "visible";

function cambiarVisibilidad(estado) {
  visibilidad = estado;
  document.dispatchEvent(new Event("visibilitychange"));
}

async function avanzar(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("actualización automática", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    visibilidad = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibilidad);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("dura 2 minutos el intervalo", () => {
    expect(DOS_MIN).toBe(120000);
  });

  it("pide de nuevo a los 2 minutos y sin caché", async () => {
    const fetchFn = vi.fn(() => respuestaOk(crearDatos()));
    const { result } = renderHook(() => useDatosLol(fetchFn));
    await avanzar(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.datos.amigos).toHaveLength(3);

    await avanzar(DOS_MIN - 1000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await avanzar(1000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn).toHaveBeenLastCalledWith("./datos/lol.json", { cache: "no-store" });
  });

  it("no pide mientras la pestaña está oculta", async () => {
    const fetchFn = vi.fn(() => respuestaOk(crearDatos()));
    renderHook(() => useDatosLol(fetchFn));
    await avanzar(0);
    act(() => cambiarVisibilidad("hidden"));
    await avanzar(DOS_MIN * 3);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("al volver a la pestaña pide de inmediato si pasaron más de 2 minutos", async () => {
    const fetchFn = vi.fn(() => respuestaOk(crearDatos()));
    renderHook(() => useDatosLol(fetchFn));
    await avanzar(0);
    act(() => cambiarVisibilidad("hidden"));
    await avanzar(DOS_MIN + 30000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await act(async () => cambiarVisibilidad("visible"));
    await avanzar(0);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("al volver antes de 2 minutos no pide de más", async () => {
    const fetchFn = vi.fn(() => respuestaOk(crearDatos()));
    renderHook(() => useDatosLol(fetchFn));
    await avanzar(0);
    act(() => cambiarVisibilidad("hidden"));
    await avanzar(30000);
    await act(async () => cambiarVisibilidad("visible"));
    await avanzar(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("si falla conserva los datos anteriores y luego se recupera", async () => {
    const datos1 = crearDatos();
    const datos3 = crearDatos({ actualizado: "2026-10-01T18:30:00.000Z" });
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(() => respuestaOk(datos1))
      .mockImplementationOnce(() => Promise.reject(new TypeError("sin red")))
      .mockImplementationOnce(() => respuestaOk(datos3));
    const { result } = renderHook(() => useDatosLol(fetchFn));
    await avanzar(0);
    expect(result.current.datos.actualizado).toBe(datos1.actualizado);

    await avanzar(DOS_MIN);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.current.error).toMatch("No se pudo conectar");
    expect(result.current.datos.actualizado).toBe(datos1.actualizado);

    await avanzar(DOS_MIN);
    expect(result.current.error).toBeNull();
    expect(result.current.datos.actualizado).toBe(datos3.actualizado);
  });

  it("la página mantiene los datos y muestra el aviso discreto", async () => {
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(() => respuestaOk(crearDatos()))
      .mockImplementation(() => Promise.resolve({ ok: false, status: 500 }));
    render(<App fetchFn={fetchFn} />);
    await avanzar(0);
    expect(screen.getByRole("button", { name: /Rana Azul#LAS/ })).toBeInTheDocument();
    expect(screen.queryByText(/No se pudo actualizar/)).not.toBeInTheDocument();

    await avanzar(DOS_MIN);
    expect(screen.getByRole("status")).toHaveTextContent("No se pudo actualizar, se reintentará en 2 minutos.");
    expect(screen.getByRole("button", { name: /Rana Azul#LAS/ })).toBeInTheDocument();
  });
});
