import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TarjetaRecords } from "./TarjetaRecords.jsx";
import { ModalRecords } from "./ModalRecords.jsx";

const ddragonMock = {
  version: "14.20.1",
  campeones: {
    103: { id: "Ahri", nombre: "Ahri" },
    238: { id: "Zed", nombre: "Zed" },
    412: { id: "Thresh", nombre: "Thresh" },
  },
};

const amigosMock = [
  { slug: "johnadis", nombre: "Johnadis", riot_id: "Johnadis#LAS" },
  { slug: "nico", nombre: "Nico", riot_id: "Nico#LAS" },
];

const recordsMock = {
  anio_actual: 2026,
  por_amigo: {
    johnadis: {
      dias_30: {
        basicos: {
          asesinatos: {
            valor: 22,
            valor_raw: 22,
            campeon: "Zed",
            resultado: "victoria",
            duracion: 1930,
            fecha: 1792149239803,
          },
          kda: {
            valor: "8.00",
            valor_raw: 8.0,
            campeon: "Zed",
            resultado: "victoria",
          },
        },
        impacto: {
          danio: {
            valor: "45.2k",
            valor_raw: 45200,
            campeon: "Zed",
            resultado: "victoria",
          },
        },
        multikills: {},
        duracion: {
          partida_mas_larga: {
            valor: "35:10",
            valor_raw: 2110,
            campeon: "Zed",
            resultado: "derrota",
          },
        },
      },
      anio_2026: {
        basicos: {
          asesinatos: {
            valor: 25,
            valor_raw: 25,
            campeon: "Zed",
            resultado: "victoria",
          },
        },
      },
    },
    nico: {
      dias_30: {
        basicos: {
          kda: {
            valor: "15.50",
            valor_raw: 15.5,
            campeon: "Ahri",
            resultado: "victoria",
            fecha: 1792178039803,
          },
          asesinatos: {
            valor: 14,
            valor_raw: 14,
            campeon: "Ahri",
            resultado: "victoria",
          },
        },
      },
      anio_2026: {
        basicos: {
          kda: {
            valor: "16.00",
            valor_raw: 16.0,
            campeon: "Ahri",
            resultado: "victoria",
          },
        },
      },
    },
  },
};

describe("TarjetaRecords", () => {
  it("renderiza la tarjeta con título, selector de período (30 días por defecto) y lista de destacados", () => {
    const onVer = vi.fn();
    render(
      <TarjetaRecords
        records={recordsMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onVerRecords={onVer}
      />
    );

    expect(screen.getByText("Récords y Marcas")).toBeInTheDocument();
    expect(screen.getByText("30 días")).toBeInTheDocument();
    expect(screen.getByText("KDA más alto")).toBeInTheDocument();
    // Seleccionar Johnadis para verificar sus métricas específicas
    fireEvent.click(screen.getByRole("tab", { name: "Johnadis" }));
    expect(screen.getByText("8.00")).toBeInTheDocument();
    expect(screen.getByText("Más Kills")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
  });

  it("permite cambiar de amigo y dispara onVerRecords al pulsar en ver todos", () => {
    const onVer = vi.fn();
    render(
      <TarjetaRecords
        records={recordsMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onVerRecords={onVer}
      />
    );

    // Clic en pestaña Nico
    fireEvent.click(screen.getByRole("tab", { name: "Nico" }));
    expect(screen.getByText("15.50")).toBeInTheDocument();

    // Clic en ver todos los récords
    fireEvent.click(screen.getByText("Ver todos los récords"));
    expect(onVer).toHaveBeenCalledWith({
      amigo: "nico",
      periodo: "dias_30",
      tab: "records",
    });

    // Clic en botón Comparador
    fireEvent.click(screen.getByText("Comparador"));
    expect(onVer).toHaveBeenCalledWith({
      amigo: "nico",
      periodo: "dias_30",
      tab: "comparar",
    });
  });
});

describe("ModalRecords", () => {
  it("renderiza el modal en pestaña Récords con categorías e ítems", () => {
    const onCerrar = vi.fn();
    render(
      <ModalRecords
        records={recordsMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onCerrar={onCerrar}
      />
    );

    expect(screen.getByRole("heading", { name: /Récords y Marcas/i })).toBeInTheDocument();
    expect(screen.getByText("Básicos")).toBeInTheDocument();
    expect(screen.getByText("Impacto en partida")).toBeInTheDocument();
    expect(screen.getByText("Multikills y Rachas")).toBeInTheDocument();
    expect(screen.getByText("Duración y Supervivencia")).toBeInTheDocument();

    // Comprobar valor registrado de KDA para el primer amigo (Johnadis: 8.00)
    expect(screen.getByText("8.00")).toBeInTheDocument();
  });

  it("permite alternar a la pestaña Comparador Cara a Cara y muestra el marcador", () => {
    const onCerrar = vi.fn();
    render(
      <ModalRecords
        records={recordsMock}
        amigos={amigosMock}
        ddragon={ddragonMock}
        onCerrar={onCerrar}
      />
    );

    // Cambiar a pestaña Comparador
    fireEvent.click(screen.getByText(/Comparador Cara a Cara/i));

    expect(screen.getByText("Marcador Global")).toBeInTheDocument();
    expect(screen.getByLabelText("Jugador A")).toBeInTheDocument();
    expect(screen.getByLabelText("Jugador B")).toBeInTheDocument();

    // Johnadis lidera en el mock
    expect(screen.getByText(/Lidera Johnadis/i)).toBeInTheDocument();
  });
});
