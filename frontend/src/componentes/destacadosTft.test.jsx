import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeccionDestacadosMesTft } from "./SeccionDestacadosMesTft.jsx";
import { SeccionDestacadosSemanaTft } from "./SeccionDestacadosSemanaTft.jsx";

const AHORA = 1790884800000;

const AMIGOS = [
  { slug: "iskrat-las", riot_id: "ISkrat#LAS", nombre: "ISkrat" },
  { slug: "gralmogeko-las", riot_id: "GralMogeko#LAS", nombre: "Mogeko" },
];

const DESTACADOS_FIXTURE = {
  semana_desde: AHORA - 2 * 24 * 3600 * 1000,
  mejor_jugador_semana: {
    amigos: ["gralmogeko-las"],
    partida_id: "LA2_100",
    puesto: 1,
    nivel: 9,
    ronda: 35,
    danio: 85,
    eliminados: 3,
    duracion: 2100,
    modo: "Clasificatoria",
    fecha: AHORA - 10 * 3600 * 1000,
    unidades: [{ id: "DA_18_Sett", estrellas: 3, rareza: 3, items: [] }],
  },
  mejor_top4_semana: {
    amigos: ["gralmogeko-las"],
    top4_pct: 100.0,
    top4: 3,
    primeros: 1,
    partidas: 3,
    promedio: 2.33,
  },
  mas_partidas_semana: {
    amigos: ["iskrat-las"],
    partidas: 5,
  },
  balance_semana: {
    partidas: 8,
    primeros: 1,
    top4: 6,
    top4_pct: 75.0,
    promedio: 3.25,
    amigos: ["iskrat-las", "gralmogeko-las"],
    jugadas: { "iskrat-las": 5, "gralmogeko-las": 3 },
  },
  peor_jugador_semana: {
    amigos: ["iskrat-las"],
    partida_id: "LA2_101",
    puesto: 8,
    nivel: 7,
    ronda: 24,
    danio: 20,
    eliminados: 0,
    modo: "Clasificatoria",
    fecha: AHORA - 12 * 3600 * 1000,
  },
  mes: {
    anio: 2026,
    mes: 10,
    nombre: "octubre",
    desde: AHORA - 5 * 24 * 3600 * 1000,
    hasta: AHORA + 25 * 24 * 3600 * 1000,
    cerrado: false,
  },
  mejor_jugador_mes: {
    amigos: ["gralmogeko-las"],
    partida_id: "LA2_100",
    puesto: 1,
    nivel: 9,
    ronda: 35,
    danio: 85,
    modo: "Clasificatoria",
    fecha: AHORA - 10 * 3600 * 1000,
  },
  mejor_top4_mes: {
    amigos: ["gralmogeko-las"],
    top4_pct: 80.0,
    top4: 4,
    primeros: 2,
    partidas: 5,
    promedio: 2.6,
  },
  mas_partidas_mes: {
    amigos: ["iskrat-las"],
    partidas: 12,
  },
  balance_mes: {
    partidas: 17,
    primeros: 3,
    top4: 12,
    top4_pct: 70.6,
    promedio: 3.4,
    amigos: ["iskrat-las", "gralmogeko-las"],
    jugadas: { "iskrat-las": 12, "gralmogeko-las": 5 },
  },
  peor_jugador_mes: {
    amigos: ["iskrat-las"],
    puesto: 8,
    nivel: 7,
    ronda: 20,
    danio: 15,
    fecha: AHORA - 15 * 3600 * 1000,
  },
  tops: {
    mejor_jugador_semana: [
      {
        amigos: ["gralmogeko-las"],
        partida_id: "LA2_100",
        puesto: 1,
        nivel: 9,
        ronda: 35,
        danio: 85,
        fecha: AHORA - 10 * 3600 * 1000,
      },
    ],
  },
  tops_global: {
    mejor_jugador_semana: [
      {
        amigos: ["gralmogeko-las"],
        partida_id: "LA2_100",
        puesto: 1,
        nivel: 9,
        ronda: 35,
        danio: 85,
        fecha: AHORA - 10 * 3600 * 1000,
      },
    ],
  },
};

describe("Secciones de Destacados de TFT", () => {
  it("renderiza destacados de la semana con todas sus tarjetas", () => {
    render(
      <SeccionDestacadosSemanaTft
        destacados={DESTACADOS_FIXTURE}
        amigos={AMIGOS}
        ddragon={{}}
        ahora={AHORA}
      />
    );

    expect(screen.getByRole("heading", { name: "Destacados de la semana (TFT)" })).toBeInTheDocument();
    expect(screen.getByText("Mejor partida de la semana")).toBeInTheDocument();
    expect(screen.getByText("Mejor % Top 4 de la semana")).toBeInTheDocument();
    expect(screen.getByText("Balance de TFT de la semana")).toBeInTheDocument();
    expect(screen.getByText("Más partidas de la semana")).toBeInTheDocument();
    expect(screen.getByText("Puesto más bajo de la semana")).toBeInTheDocument();

    // Comprueba el valor de % top 4
    expect(screen.getByText("100%")).toBeInTheDocument();
    // Comprueba 8.º puesto
    expect(screen.getByText("8.º puesto")).toBeInTheDocument();
    // Comprueba que muestra la duración de la partida
    expect(screen.getAllByText(/35 min/).length).toBeGreaterThan(0);
  });

  it("renderiza estado vacío cuando la semana no tiene partidas", () => {
    const vacio = {
      ...DESTACADOS_FIXTURE,
      mejor_jugador_semana: null,
      mejor_top4_semana: null,
      balance_semana: null,
      mas_partidas_semana: null,
      peor_jugador_semana: null,
    };
    render(
      <SeccionDestacadosSemanaTft
        destacados={vacio}
        amigos={AMIGOS}
        ddragon={{}}
        ahora={AHORA}
      />
    );

    expect(
      screen.getByText("No existen partidas registradas de TFT esta semana")
    ).toBeInTheDocument();
  });

  it("renderiza destacados del mes con título de mes y abre el modal de top 5 al hacer clic", () => {
    render(
      <SeccionDestacadosSemanaTft
        destacados={DESTACADOS_FIXTURE}
        amigos={AMIGOS}
        ddragon={{}}
        ahora={AHORA}
      />
    );

    const botonTop = screen.getByRole("button", {
      name: "Ver top 5: Mejor partida de la semana",
    });
    expect(botonTop).toBeInTheDocument();

    fireEvent.click(botonTop);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Top 5/i })).toBeInTheDocument();

    // Cierra modal con botón de cerrar
    const botonCerrar = screen.getByRole("button", { name: "Cerrar" });
    fireEvent.click(botonCerrar);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza destacados del mes correctamente", () => {
    render(
      <SeccionDestacadosMesTft
        destacados={DESTACADOS_FIXTURE}
        amigos={AMIGOS}
        ddragon={{}}
        ahora={AHORA}
      />
    );

    expect(screen.getByRole("heading", { name: /Destacados de octubre/ })).toBeInTheDocument();
    expect(screen.getByText("Mejor partida del mes")).toBeInTheDocument();
    expect(screen.getByText("Balance de TFT del mes")).toBeInTheDocument();
  });
});
