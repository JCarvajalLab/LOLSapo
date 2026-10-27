import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilaPartidaCompactaTft } from "./FilaPartidaCompactaTft.jsx";

const ddragonMock = {
  version: "16.21.1",
  campeones: {
    DA_Taric18: { id: "DA_Taric18", nombre: "Taric", costo: 4 },
    DA_18_GnarSmall: { id: "DA_18_GnarSmall", nombre: "Gnar", costo: 4 },
  },
  rasgos: {
    DA_Riftbeast18: { id: "DA_Riftbeast18", nombre: "Criaturas del Abismo" },
  },
  items: {
    DA_Bloodthirster: { id: "DA_Bloodthirster", nombre: "Sanguinaria" },
  },
};

const partidaTftMock = {
  id: "LA2_1623206759",
  fecha: 1789073113935,
  duracion: 2127,
  puesto: 1,
  modo: "Clasificatoria",
  queue_id: 1100,
  nivel: 9,
  danio: 15420,
  eliminados: 3,
  rasgos: [
    { id: "DA_Riftbeast18", estilo: 4, nivel: 3, unidades: 7, unico: false },
  ],
  unidades: [
    { id: "DA_Taric18", estrellas: 3, items: ["DA_Bloodthirster"], rareza: 4 },
    { id: "DA_18_GnarSmall", estrellas: 2, items: [], rareza: 4 },
  ],
  participantes: [
    { amigo: "nic-las", nombre: "Nic", puesto: 1 },
    { amigo: "iskrat-las", nombre: "ISkrat", puesto: 4 },
    { amigo: null, nombre: "Rival#1", puesto: 2 },
  ],
};

describe("FilaPartidaCompactaTft", () => {
  it("renderiza la partida compacta con puesto #1 en oro, nivel, daño y amigos en lobby", () => {
    render(
      <FilaPartidaCompactaTft
        partida={partidaTftMock}
        ddragon={ddragonMock}
        ahora={1789073113935 + 3600000}
        slugPropio="nic-las"
      />,
    );

    // Puesto grande
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Victoria")).toBeInTheDocument();

    // Nivel
    expect(screen.getByText("Nv. 9")).toBeInTheDocument();

    // Daño y eliminados
    expect(screen.getByText(/15\.420/)).toBeInTheDocument();
    expect(screen.getByText(/3 eliminados/i)).toBeInTheDocument();

    // Amigo en lobby (+1 amigo)
    expect(screen.getByText("+1 amigo")).toBeInTheDocument();
  });

  it("renderiza partida con puesto de Top 4 y Bot 4 con sus estilos correspondientes", () => {
    const partidaTop4 = { ...partidaTftMock, puesto: 3 };
    const { rerender } = render(
      <FilaPartidaCompactaTft
        partida={partidaTop4}
        ddragon={ddragonMock}
        ahora={1789073113935 + 3600000}
        slugPropio="nic-las"
      />,
    );

    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("Top 4")).toBeInTheDocument();

    const partidaBot4 = { ...partidaTftMock, puesto: 7 };
    rerender(
      <FilaPartidaCompactaTft
        partida={partidaBot4}
        ddragon={ddragonMock}
        ahora={1789073113935 + 3600000}
        slugPropio="nic-las"
      />,
    );

    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.getByText("Bot 4")).toBeInTheDocument();
  });

  it("completa exactamente 10 slots en el tablero con huecos vacíos si hay menos unidades", () => {
    render(
      <FilaPartidaCompactaTft
        partida={partidaTftMock}
        ddragon={ddragonMock}
        ahora={1789073113935 + 3600000}
        slugPropio="nic-las"
      />,
    );

    const listaUnidades = screen.getByRole("list", { name: "Unidades" });
    // partidaTftMock tiene 2 unidades, por lo que debe haber 10 elementos <li> en total (2 campeones + 8 vacíos)
    expect(listaUnidades.children).toHaveLength(10);
  });
});
