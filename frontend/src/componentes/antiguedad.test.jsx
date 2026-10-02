import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { SeccionEnPartida } from "./SeccionEnPartida.jsx";
import { FilaAmigo } from "./FilaAmigo.jsx";
import App from "../App.jsx";
import { antiguedadDatos, MINUTOS_DATOS_CADUCOS, MINUTOS_DATOS_VIEJOS } from "../logica/antiguedad.js";
import { AHORA, crearDatos, ddragon, partidaEnVivo } from "../test/fixtures/lol.js";

const MIN = 60 * 1000;

/** Datos consultados hace `minutos`, con una partida que llevaba 10 min al consultar. */
function escenario(minutos) {
  const actualizadoMs = AHORA - minutos * MIN;
  const partida = { ...partidaEnVivo, inicio: actualizadoMs - 10 * MIN };
  return { actualizadoMs, partida };
}

function renderSeccion(minutos, enVivo) {
  const { actualizadoMs, partida } = escenario(minutos);
  const amigos = crearDatos().amigos;
  return render(
    <SeccionEnPartida
      enVivo={enVivo ?? [partida]}
      ddragon={ddragon}
      amigos={amigos}
      actualizadoMs={actualizadoMs}
      ahora={AHORA}
    />,
  );
}

describe("antigüedad de los datos", () => {
  it("clasifica por umbrales con nombre", () => {
    expect(MINUTOS_DATOS_VIEJOS).toBe(15);
    expect(MINUTOS_DATOS_CADUCOS).toBe(60);
    expect(antiguedadDatos(AHORA - 5 * MIN, AHORA)).toEqual({ nivel: "fresco", minutos: 5 });
    expect(antiguedadDatos(AHORA - 15 * MIN, AHORA).nivel).toBe("fresco");
    expect(antiguedadDatos(AHORA - 16 * MIN, AHORA).nivel).toBe("viejo");
    expect(antiguedadDatos(AHORA - 60 * MIN, AHORA).nivel).toBe("viejo");
    expect(antiguedadDatos(AHORA - 61 * MIN, AHORA).nivel).toBe("caduco");
    expect(antiguedadDatos(null, AHORA)).toEqual({ nivel: "caduco", minutos: null });
    // Reloj del navegador atrasado: no da minutos negativos.
    expect(antiguedadDatos(AHORA + 5 * MIN, AHORA)).toEqual({ nivel: "fresco", minutos: 0 });
  });
});

describe("En partida según la antigüedad", () => {
  it("5 min: todo normal y los minutos siguen el reloj", () => {
    const { container } = renderSeccion(5);
    expect(screen.queryByText(/Puede que estas partidas/)).not.toBeInTheDocument();
    expect(screen.getByText("15 min de partida")).toBeInTheDocument();
    expect(screen.getByRole("article")).not.toHaveClass("opacity-60");
    expect(container.querySelectorAll('[data-en-partida="true"]')).toHaveLength(2);
  });

  it("20 min: aviso, tarjeta atenuada y minutos congelados al consultar", () => {
    const { container } = renderSeccion(20);
    expect(screen.getByText(/Puede que estas partidas ya hayan terminado/)).toHaveTextContent(
      "Datos de hace 20 min. Puede que estas partidas ya hayan terminado.",
    );
    expect(screen.getByText("10 min de partida (al consultar)")).toBeInTheDocument();
    expect(screen.queryByText("30 min de partida")).not.toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveClass("opacity-60");
    // Sigue legible: equipos y amigos presentes, pero sin el anillo animado.
    expect(screen.getByText("Rana Azul#LAS")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-en-partida="true"]')).toHaveLength(0);
  });

  it("los minutos congelados no crecen aunque pase el tiempo", () => {
    const { actualizadoMs, partida } = escenario(20);
    const props = { enVivo: [partida], ddragon, amigos: [], actualizadoMs };
    const { rerender } = render(<SeccionEnPartida {...props} ahora={AHORA} />);
    rerender(<SeccionEnPartida {...props} ahora={AHORA + 10 * MIN} />);
    expect(screen.getByText("10 min de partida (al consultar)")).toBeInTheDocument();
    expect(screen.getByText(/Puede que estas partidas/)).toHaveTextContent("Datos de hace 30 min.");
  });

  it("90 min: oculta las tarjetas y muestra solo el aviso", () => {
    renderSeccion(90);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Partidas en curso" })).not.toBeInTheDocument();
    const aviso = screen.getByText(/No se puede saber quién está en partida ahora/);
    expect(aviso).toHaveTextContent("Datos de hace 1 hora. No se puede saber quién está en partida ahora.");
    expect(aviso.closest(".min-h-32")).not.toBeNull();
    expect(screen.queryByText("(1)")).not.toBeInTheDocument();
  });

  it("datos viejos sin partidas: Nadie en partida con nota de antigüedad", () => {
    renderSeccion(20, []);
    expect(screen.getByText("Nadie en partida.")).toBeInTheDocument();
    expect(screen.getByText("Datos de hace 20 min.")).toBeInTheDocument();
  });

  it("datos frescos sin partidas: sin nota", () => {
    renderSeccion(5, []);
    expect(screen.getByText("Nadie en partida.")).toBeInTheDocument();
    expect(screen.queryByText(/Datos de hace/)).not.toBeInTheDocument();
  });
});

describe("indicador En partida en la fila del amigo", () => {
  const amigo = {
    ...crearDatos().amigos[0],
    jugando: { partida_id: "LA2_99", campeon_id: 103, queue_id: 450 },
  };

  function renderFila(minutos) {
    return render(
      <ul>
        <FilaAmigo
          amigo={amigo}
          ddragon={ddragon}
          ahora={AHORA}
          actualizadoMs={AHORA - minutos * MIN}
          abierto={false}
          onAlternar={() => {}}
        />
      </ul>,
    );
  }

  it("5 min: normal, con anillo", () => {
    const { container } = renderFila(5);
    const texto = screen.getByText(/En partida · Ahri/);
    expect(texto).not.toHaveClass("opacity-50");
    expect(container.querySelector(".saco-vocal")).not.toBeNull();
  });

  it("20 min: atenuado y sin anillo", () => {
    const { container } = renderFila(20);
    const texto = screen.getByText(/En partida · Ahri/);
    expect(texto).toHaveClass("opacity-50");
    expect(texto).toHaveTextContent("(datos de hace 20 min)");
    expect(container.querySelector(".saco-vocal")).toBeNull();
  });

  it("90 min: no se muestra", () => {
    const { container } = renderFila(90);
    expect(screen.queryByText(/En partida/)).not.toBeInTheDocument();
    expect(container.querySelector(".saco-vocal")).toBeNull();
  });
});

describe("con el reloj real de la página", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("el aviso depende de actualizado y avanza con el reloj, aunque se recarguen los datos", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
    const actualizadoMs = AHORA - 10 * MIN;
    const datos = crearDatos({
      actualizado: new Date(actualizadoMs).toISOString(),
      en_vivo: [{ ...partidaEnVivo, inicio: actualizadoMs - 10 * MIN }],
    });
    // El recolector está detenido: cada recarga trae el mismo archivo.
    const fetchFn = vi.fn(() => Promise.resolve({ ok: true, json: async () => datos }));
    render(<App fetchFn={fetchFn} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("20 min de partida")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * MIN);
    });
    expect(fetchFn.mock.calls.length).toBeGreaterThan(1);
    expect(screen.getByText("10 min de partida (al consultar)")).toBeInTheDocument();
    expect(screen.getByText(/Puede que estas partidas/)).toHaveTextContent("Datos de hace 20 min.");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(45 * MIN);
    });
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText(/No se puede saber quién está en partida ahora/)).toBeInTheDocument();
  });
});
