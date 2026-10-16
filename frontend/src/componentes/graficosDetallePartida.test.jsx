import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  GraficoDanioInfligido,
  GraficoVentajaOro,
} from "./GraficosDetallePartida.jsx";

const ddragonMock = {
  campeones: {
    14: { id: "Sion", nombre: "Sion" },
    777: { id: "Yone", nombre: "Yone" },
  },
  version: "14.20.1",
};

const jugadoresAzulMock = [
  {
    nombre: "InBoX#4705",
    campeon_id: 14,
    posicion: "TOP",
    danio: 19522,
    oro: 9500,
  },
  {
    nombre: "EwardoFinn#LAS",
    campeon_id: 57,
    posicion: "JUNGLE",
    danio: 25495,
    oro: 12900,
  },
  {
    nombre: "Guzzman#Ing",
    campeon_id: 517,
    posicion: "MIDDLE",
    danio: 36688,
    oro: 16200,
  },
  {
    nombre: "El Kuako#AKSA",
    campeon_id: 236,
    posicion: "BOTTOM",
    danio: 38596,
    oro: 16600,
  },
  {
    nombre: "Nami Ła Contes#LAS",
    campeon_id: 902,
    posicion: "UTILITY",
    danio: 6668,
    oro: 9800,
  },
];

const jugadoresRojoMock = [
  {
    nombre: "Big Gato#LAS",
    campeon_id: 777,
    posicion: "TOP",
    danio: 53594,
    oro: 19300,
  },
  {
    nombre: "GralMogeko#LAS",
    campeon_id: 107,
    posicion: "JUNGLE",
    danio: 35111,
    oro: 17100,
  },
  {
    nombre: "Johnadis#LAS",
    campeon_id: 805,
    posicion: "MIDDLE",
    danio: 33269,
    oro: 14800,
  },
  {
    nombre: "ISkrat#LAS",
    campeon_id: 51,
    posicion: "BOTTOM",
    danio: 29571,
    oro: 15100,
  },
  {
    nombre: "Nicø#LAS",
    campeon_id: 53,
    posicion: "UTILITY",
    danio: 12658,
    oro: 11100,
  },
];

describe("GraficosDetallePartida", () => {
  it("GraficoVentajaOro muestra título, ejes y responde a interacción del mouse", () => {
    const partidaMock = {
      duracion: 2160,
      curva_oro: [0, 200, -500, -1200, -3500, -8000, -12449],
    };

    render(
      <GraficoVentajaOro
        partida={partidaMock}
        jugadoresAzul={jugadoresAzulMock}
        jugadoresRojo={jugadoresRojoMock}
      />,
    );

    expect(screen.getByText("Ventaja de oro del equipo")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);

    const contenedor = screen.getByText("Ventaja de oro del equipo").nextSibling;
    contenedor.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 520,
      height: 220,
      right: 520,
      bottom: 220,
    });
    // Simular movimiento de mouse sobre el gráfico
    fireEvent.mouseMove(contenedor, { clientX: 200, clientY: 100 });

    // Verifica que aparezca el tooltip de minuto y ventaja de oro
    expect(screen.getByText("2:00")).toBeInTheDocument();
    expect(screen.getByText("-500")).toBeInTheDocument();

    // Al salir el mouse se oculta el tooltip
    fireEvent.mouseLeave(contenedor);
    expect(screen.queryByText(/\d+:00/)).not.toBeInTheDocument();
  });

  it("GraficoDanioInfligido muestra título, barras y responde a hover de jugador", () => {
    render(
      <GraficoDanioInfligido
        jugadoresAzul={jugadoresAzulMock}
        jugadoresRojo={jugadoresRojoMock}
        ddragon={ddragonMock}
      />,
    );

    expect(screen.getByText("Daño infligido")).toBeInTheDocument();

    // Las barras deben estar presentes en el SVG
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();

    // Hover sobre un grupo de barra de jugador
    const gruposBarras = svg.querySelectorAll("g.cursor-pointer");
    expect(gruposBarras.length).toBe(10);

    // Hover en la primera barra (Sion / InBoX)
    fireEvent.mouseEnter(gruposBarras[0]);
    expect(screen.getByText(/19\.522 daño/)).toBeInTheDocument();
    expect(screen.getByText(/Carril Superior/)).toBeInTheDocument();

    // Hover en la sexta barra (Yone / Big Gato)
    fireEvent.mouseEnter(gruposBarras[5]);
    expect(screen.getByText(/53\.594 daño/)).toBeInTheDocument();

    // Mouse leave oculta el tooltip
    fireEvent.mouseLeave(gruposBarras[5]);
    expect(screen.queryByText(/53\.594 daño/)).not.toBeInTheDocument();
  });
});
