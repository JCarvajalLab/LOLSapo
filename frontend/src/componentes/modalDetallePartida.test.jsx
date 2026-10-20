import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AHORA, ddragon } from "../test/fixtures/lol.js";
import { FilaPartida } from "./FilaPartida.jsx";
import { ModalDetallePartida } from "./ModalDetallePartida.jsx";

const partidaDetallada = {
  id: "LA2_999",
  fecha: AHORA - 3600 * 1000,
  queue_id: 400,
  campeon: "Ahri",
  campeon_id: 103,
  resultado: "victoria",
  asesinatos: 6,
  muertes: 1,
  asistencias: 9,
  duracion: 36 * 60 + 39,
  modo: "Normal (Reclutamiento)",
  categoria: "normal",
  nivel: 18,
  cs: 307,
  participacion: 29,
  danio: 17200,
  equipo: 100,
  items: [3078, 3111, 3053, 3156, 3026, 3074, 3340],
  hechizos: [4, 14],
  runas: { principal: 8112, secundaria: 8000 },
  equipos: {
    100: {
      victoria: true,
      baneos: [122, 55],
      torres: 11,
      dragones: 3,
      barones: 1,
      heraldos: 1,
      larvas: 5,
      inhibidores: 2,
    },
    200: {
      victoria: false,
      baneos: [86, 11],
      torres: 2,
      dragones: 0,
      barones: 0,
      heraldos: 0,
      larvas: 1,
      inhibidores: 0,
    },
  },
  participantes: [
    {
      campeon_id: 103,
      equipo: 100,
      nombre: "Johnadis#LAS",
      amigo: "johnadis-las",
      nivel: 18,
      asesinatos: 6,
      muertes: 1,
      asistencias: 9,
      cs: 307,
      oro: 17200,
      danio: 17200,
      vision: 47,
      posicion: "MIDDLE",
      items: [3078, 3111, 3053, 3156, 3026, 3074, 3340],
      hechizos: [4, 14],
      runas: { principal: 8112, secundaria: 8000 },
    },
    {
      campeon_id: 22,
      equipo: 100,
      nombre: "Aliado Uno#LAS",
      amigo: null,
      nivel: 17,
      asesinatos: 8,
      muertes: 2,
      asistencias: 10,
      cs: 250,
      oro: 15000,
      danio: 22000,
      vision: 28,
      posicion: "BOTTOM",
      items: [3031, 3006, 0, 0, 0, 0, 3340],
      hechizos: [4, 7],
      runas: { principal: 8000 },
    },
    {
      campeon_id: 54,
      equipo: 200,
      nombre: "Rival Uno#LAS",
      amigo: null,
      nivel: 16,
      asesinatos: 2,
      muertes: 7,
      asistencias: 3,
      cs: 180,
      oro: 9000,
      danio: 11000,
      vision: 19,
      posicion: "TOP",
      items: [3068, 3111, 0, 0, 0, 0, 3340],
      hechizos: [4, 12],
      runas: { principal: 8112 },
    },
  ],
};

describe("ModalDetallePartida", () => {
  it("muestra el modal completo con equipos, objetivos y jugadores", () => {
    const alCerrar = vi.fn();
    render(
      <ModalDetallePartida
        partida={partidaDetallada}
        ddragon={ddragon}
        ahora={AHORA}
        slugPropio="johnadis-las"
        onCerrar={alCerrar}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Equipo Azul/i)).toBeInTheDocument();
    expect(screen.getByText(/Equipo Rojo/i)).toBeInTheDocument();

    // Objetivos del equipo azul
    const torres = screen.getAllByTitle("Torres destruidas");
    expect(torres[0]).toHaveTextContent("11");
    const dragones = screen.getAllByTitle("Dragones asegurados");
    expect(dragones[0]).toHaveTextContent("3");

    // Jugadores
    expect(screen.getByText("Johnadis#LAS")).toBeInTheDocument();
    expect(screen.getByText("Aliado Uno#LAS")).toBeInTheDocument();
    expect(screen.getByText("Rival Uno#LAS")).toBeInTheDocument();

    // KDA coloreado: asesinatos (verde), muertes (rojo), asistencias (dorado/sapo)
    const kills = screen.getAllByText("6");
    expect(kills.some((el) => el.classList.contains("text-victoria"))).toBe(true);
    const muertes = screen.getAllByText("1");
    expect(muertes.some((el) => el.classList.contains("text-derrota"))).toBe(true);
    const asist = screen.getAllByText("9");
    expect(asist.some((el) => el.classList.contains("text-sapo"))).toBe(true);

    // Cierre
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it("al hacer clic en la fila de partida se abre el modal", async () => {
    const user = userEvent.setup();
    render(
      <FilaPartida
        partida={partidaDetallada}
        ddragon={ddragon}
        ahora={AHORA}
        slugPropio="johnadis-las"
      />,
    );

    // Antes de hacer clic no hay diálogo
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Clic en toda la fila de la partida
    const fila = screen.getByRole("article");
    await user.click(fila);

    // Se abre el modal
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("Johnadis#LAS")).toBeInTheDocument();

    // Cerrar con Escape
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
