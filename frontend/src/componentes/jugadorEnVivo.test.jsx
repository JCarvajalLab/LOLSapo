import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SeccionEnPartida } from "./SeccionEnPartida.jsx";
import { AHORA, crearDatos, ddragon, partidaEnVivo } from "../test/fixtures/lol.js";

function renderVivo() {
  return render(
    <SeccionEnPartida
      enVivo={[partidaEnVivo]}
      ddragon={ddragon}
      amigos={crearDatos().amigos}
      actualizadoMs={AHORA}
      ahora={AHORA}
    />,
  );
}

function filaDe(texto) {
  return screen.getByText(texto).closest("li");
}

describe("jugador en vivo: winrate, racha y maestría", () => {
  it("muestra el winrate de la temporada con su color bajo el rango", () => {
    renderVivo();
    const fila = filaDe("Rana Azul#LAS");
    const linea = fila.querySelector('[data-winrate="true"]');
    expect(linea).toHaveTextContent("58% · 120 partidas");
    expect(within(linea).getByText("58%")).toHaveClass("text-victoria");
    // En móvil se oculta primero esta línea.
    expect(linea).toHaveClass("hidden", "sm:block");
  });

  it("calcula el winrate si viene null y lo pinta rojo bajo 45%", () => {
    renderVivo();
    const linea = filaDe("Desconocido Uno#AAA").querySelector('[data-winrate="true"]');
    expect(linea).toHaveTextContent("40% · 100 partidas");
    expect(within(linea).getByText("40%")).toHaveClass("text-derrota");
  });

  it("sin rango o con rango sin partidas no muestra la línea de winrate", () => {
    renderVivo();
    expect(filaDe("Ashe").querySelector('[data-winrate="true"]')).toBeNull();
    expect(filaDe("Rival Uno#CCC").querySelector('[data-winrate="true"]')).toBeNull();
  });

  it("marca la racha solo cuando es true", () => {
    renderVivo();
    expect(within(filaDe("Rana Azul#LAS")).getByRole("img", { name: "En racha de victorias" })).toBeInTheDocument();
    expect(within(filaDe("Desconocido Uno#AAA")).queryByRole("img", { name: "En racha de victorias" })).toBeNull();
    expect(screen.getAllByRole("img", { name: "En racha de victorias" })).toHaveLength(1);
  });

  it("muestra la maestría compacta con los puntos completos en el title", () => {
    renderVivo();
    const m = filaDe("Rana Azul#LAS").querySelector('[data-maestria="true"]');
    expect(m).toHaveTextContent("M7 · 150 mil pts");
    expect(m).toHaveAttribute("title", "Maestría 7 · 150.000 puntos");
  });

  it("nivel 0 dice Primera vez", () => {
    renderVivo();
    const m = filaDe("Desconocido Uno#AAA").querySelector('[data-maestria="true"]');
    expect(m).toHaveTextContent("Primera vez");
  });

  it("maestría null no muestra nada", () => {
    renderVivo();
    expect(filaDe("Ashe").querySelector('[data-maestria="true"]')).toBeNull();
    expect(filaDe("Garen").querySelector('[data-maestria="true"]')).toBeNull();
  });

  it("todas las filas mantienen la misma grilla y alto", () => {
    renderVivo();
    const filas = screen.getAllByRole("listitem").filter((li) => li.className.includes("grid-cols-"));
    expect(filas).toHaveLength(5);
    const clases = new Set(filas.map((f) => f.className.replace("bg-sapo-fondo", "").trim()));
    expect(clases.size).toBe(1);
    expect(filas[0]).toHaveClass("h-12");
  });
});
