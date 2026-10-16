import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { formatearDescripcionLol } from "../logica/descripcionLol.js";
import { ContenidoTooltipItem, ContenidoTooltipRuna, ElementoConTooltip } from "./TooltipFlotante.jsx";

const ddragonConTooltips = {
  version: "16.1.1",
  items: {
    3156: {
      nombre: "Fauces de Malmortius",
      descripcion: "<stats><attention>60</attention> Daño de ataque</stats><br><passive>Salvavidas:</passive> Otorga escudo.",
      oro: 3100,
      receta: [3155, 3134],
    },
    3155: { nombre: "Sorbechuzos" },
    3134: { nombre: "Daga dentada" },
  },
  runas: {
    8112: {
      nombre: "Electrocutar",
      descripcion: "Golpear a un campeón con 3 ataques otorga daño adaptable.",
    },
  },
};

describe("TooltipFlotante y formateador de Riot", () => {
  it("formatearDescripcionLol formatea tags de stats, attention y passive sin HTML inseguro", () => {
    const elementos = formatearDescripcionLol(
      "<stats><attention>60</attention> AD</stats><br><passive>Pasiva:</passive> Efecto.",
    );
    render(<div>{elementos}</div>);
    expect(screen.getByText("60")).toHaveClass("text-dorado");
    expect(screen.getByText("Pasiva:")).toHaveClass("text-victoria");
    expect(screen.getByText("Efecto.")).toBeInTheDocument();
  });

  it("ContenidoTooltipItem muestra nombre, oro, descripción y componentes de combinación", () => {
    render(<ContenidoTooltipItem itemId={3156} ddragon={ddragonConTooltips} />);
    expect(screen.getByText("Fauces de Malmortius")).toBeInTheDocument();
    expect(screen.getByText(/3\.100 de oro/)).toBeInTheDocument();
    expect(screen.getByText("Salvavidas:")).toBeInTheDocument();
    expect(screen.getByText("Combinación:")).toBeInTheDocument();
  });

  it("ContenidoTooltipRuna muestra nombre y descripción de la runa", () => {
    render(<ContenidoTooltipRuna runaId={8112} ddragon={ddragonConTooltips} />);
    expect(screen.getByText("Electrocutar")).toBeInTheDocument();
    expect(screen.getByText(/Golpear a un campeón/)).toBeInTheDocument();
  });

  it("ElementoConTooltip muestra el contenido flotante al pasar el mouse (hover)", async () => {
    const user = userEvent.setup();
    render(
      <ElementoConTooltip tooltip={<div data-testid="mi-tooltip">Info en español</div>}>
        <button type="button">Objeto</button>
      </ElementoConTooltip>,
    );

    expect(screen.queryByTestId("mi-tooltip")).not.toBeInTheDocument();

    const boton = screen.getByRole("button", { name: "Objeto" });
    await user.hover(boton);

    expect(screen.getByTestId("mi-tooltip")).toBeInTheDocument();
    expect(screen.getByText("Info en español")).toBeInTheDocument();

    await user.unhover(boton);
    expect(screen.queryByTestId("mi-tooltip")).not.toBeInTheDocument();
  });
});
