import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AHORA, AMIGOS_TOPS, crearDatos, crearDestacados, crearTops, ddragon } from "../test/fixtures/lol.js";
import { validarDatos } from "../logica/datos.js";
import { haceCuanto } from "../logica/formato.js";
import { SeccionDestacadosHoy } from "./SeccionDestacadosHoy.jsx";
import { SeccionDestacadosMes } from "./SeccionDestacadosMes.jsx";
import { SeccionDestacadosSemana } from "./SeccionDestacadosSemana.jsx";

const NOTA_SEMANA =
  "Partidas en equipo (2 o más del grupo) de Normal y Ranked, de lunes a domingo · Se reinicia el lunes a la 01:00";

function renderSeccion(Seccion, destacados, ahora = AHORA) {
  const datos = validarDatos(crearDatos({ amigos: AMIGOS_TOPS, destacados }));
  return render(<Seccion destacados={datos.destacados} amigos={datos.amigos} ddragon={datos.ddragon} ahora={ahora} />);
}

const conTops = (cambios = {}, tops = crearTops()) => crearDestacados({ tops, ...cambios });
const tarjeta = (titulo) => screen.getByRole("article", { name: titulo });
const botonTop = (titulo) => screen.queryByRole("button", { name: `Ver top 5: ${titulo}` });
const filas = (dialogo) => within(within(dialogo).getByRole("list")).getAllByRole("listitem");

async function abrir(titulo) {
  await userEvent.click(botonTop(titulo));
  return screen.getByRole("dialog", { name: `Top 5 · ${titulo}` });
}

describe("Top 5 de los destacados", () => {
  it("la tarjeta clicable abre la ventana con título, nota y 5 filas numeradas en el orden recibido", async () => {
    renderSeccion(SeccionDestacadosSemana, conTops());
    const t = tarjeta("Mejor jugador de la semana");
    expect(within(t).getByText("Top 5 ›")).toBeInTheDocument();
    const dialogo = await abrir("Mejor jugador de la semana");
    expect(within(dialogo).getByRole("heading", { level: 2 })).toHaveTextContent("Top 5 · Mejor jugador de la semana");
    expect(dialogo).toHaveTextContent(NOTA_SEMANA);
    const lista = filas(dialogo);
    expect(lista).toHaveLength(5);
    expect(within(dialogo).getByRole("list").tagName).toBe("OL");
    expect(lista.map((f) => f.textContent.slice(0, 2))).toEqual(["#1", "#2", "#3", "#4", "#5"]);
    ["Charco#LAS", "Sapito#LAS", "Rana Azul#LAS", "Renacuajo#LAS", "Pozo#LAS"].forEach((riotId, i) => {
      expect(within(lista[i]).getAllByRole("img")[0]).toHaveAccessibleName(`Ícono de ${riotId}`);
    });
  });

  it("resalta solo la fila #1", async () => {
    renderSeccion(SeccionDestacadosSemana, conTops());
    const lista = filas(await abrir("Mejor winrate"));
    expect(lista[0]).toHaveAttribute("data-primero");
    expect(lista[0]).toHaveClass("border-sapo/60", "bg-sapo-fondo");
    for (const f of lista.slice(1)) {
      expect(f).not.toHaveAttribute("data-primero");
      expect(f).not.toHaveClass("bg-sapo-fondo");
    }
  });

  it("fila de partida: amigo, campeón, K/D/A, KDA, daño en color del resultado, modo, fecha y resultado", async () => {
    renderSeccion(SeccionDestacadosSemana, conTops());
    const lista = filas(await abrir("Mejor jugador de la semana"));
    const f = lista[0];
    expect(within(f).getByText("Charco")).toBeInTheDocument();
    expect(f).toHaveTextContent("Ahri · 15 / 1 / 9");
    expect(within(f).getByText("KDA 24")).toHaveClass("text-victoria");
    expect(within(f).getByText("Daño: 25.000")).toHaveClass("text-victoria");
    expect(f).toHaveTextContent("Clasificatoria Solo/Dúo");
    expect(within(f).getByText(haceCuanto(AHORA - 3 * 3600 * 1000, AHORA))).toBeInTheDocument();
    expect(within(f).getByText("Victoria")).toBeInTheDocument();
    expect(within(f).getByAltText("Ahri")).toHaveAttribute(
      "src",
      `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/Ahri.png`,
    );
    // Partida con derrota: el daño en color derrota; sin daño, sin línea.
    expect(within(lista[2]).getByText("Daño: 19.000")).toHaveClass("text-derrota");
    expect(within(lista[2]).getByText("Derrota")).toBeInTheDocument();
    expect(lista[4].querySelector("[data-danio]")).toBeNull();
  });

  it("peor jugador: el KDA va en color derrota", async () => {
    renderSeccion(SeccionDestacadosSemana, conTops());
    const lista = filas(await abrir("Peor jugador de la semana"));
    expect(within(lista[0]).getByText("Pozo")).toBeInTheDocument();
    expect(within(lista[0]).getByText(/^KDA /)).toHaveClass("text-derrota");
  });

  it("fila de récord: «3 V – 1 D», % con un decimal, partidas y barra de winrate con su color", async () => {
    renderSeccion(SeccionDestacadosHoy, conTops());
    const lista = filas(await abrir("Balance del grupo hoy"));
    const f = lista[0];
    expect(within(f).getByText("Sapito")).toBeInTheDocument();
    expect(f).toHaveTextContent("3 V – 1 D");
    expect(within(f).getByText("3 victorias y 1 derrota")).toHaveClass("sr-only");
    expect(within(f).getByText("75,0 %")).toHaveClass("text-victoria");
    expect(f).toHaveTextContent("4 partidas");
    const barra = f.querySelector("[data-barra]");
    expect(barra).toHaveClass("bg-victoria");
    expect(barra.style.width).toBe("75%");
    // 50 % cuenta como positivo; menos de 50 %, derrota.
    expect(lista[1].querySelector("[data-barra]")).toHaveClass("bg-victoria");
    expect(within(lista[2]).getByText("33,3 %")).toHaveClass("text-derrota");
    expect(lista[2].querySelector("[data-barra]")).toHaveClass("bg-derrota");
    expect(lista[4].querySelector("[data-barra]").style.width).toBe("0%");
  });

  it("más partidas: la barra es proporcional a las partidas", async () => {
    renderSeccion(SeccionDestacadosSemana, conTops());
    const lista = filas(await abrir("Más partidas"));
    const anchos = lista.map((f) => f.querySelector("[data-barra]").style.width);
    expect(anchos).toEqual(["100%", "50%", "25%", "10%", "5%"]);
    for (const f of lista) expect(f.querySelector("[data-barra]")).toHaveClass("bg-ranked");
    expect(lista[0]).toHaveTextContent("20 partidas");
  });

  it("las rachas no son clicables", () => {
    renderSeccion(SeccionDestacadosSemana, conTops());
    for (const titulo of ["Racha de victorias en equipo", "Racha de derrotas en equipo"]) {
      expect(within(tarjeta(titulo)).queryByRole("button")).toBeNull();
      expect(within(tarjeta(titulo)).queryByText("Top 5 ›")).toBeNull();
    }
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("tarjetas vacías y tops vacíos no son clicables", () => {
    renderSeccion(SeccionDestacadosHoy, conTops({ peor_jugador_hoy: null }, crearTops({ balance_hoy: [] })));
    expect(botonTop("Peor jugador de la partida - Hoy")).toBeNull();
    expect(botonTop("Balance del grupo hoy")).toBeNull();
    expect(botonTop("Mejor jugador de la partida - Hoy")).not.toBeNull();
  });

  it("sin tops (archivos viejos) ninguna tarjeta es clicable", () => {
    renderSeccion(SeccionDestacadosSemana, crearDestacados());
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByText("Top 5 ›")).toBeNull();
  });

  it("se cierra con Esc y el foco vuelve a la tarjeta", async () => {
    renderSeccion(SeccionDestacadosMes, conTops());
    const boton = botonTop("Balance del grupo del mes");
    await abrir("Balance del grupo del mes");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(boton).toHaveFocus();
  });

  it("se cierra con ✕ y el foco vuelve a la tarjeta", async () => {
    renderSeccion(SeccionDestacadosMes, conTops());
    const boton = botonTop("Peor jugador del mes");
    const dialogo = await abrir("Peor jugador del mes");
    expect(dialogo).toHaveTextContent("Se actualiza hasta fin de mes");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(boton).toHaveFocus();
  });

  it("si el top abierto desaparece se cierra y no se reabre solo cuando vuelve", async () => {
    const datosCon = validarDatos(crearDatos({ amigos: AMIGOS_TOPS, destacados: conTops() }));
    const datosSin = validarDatos(
      crearDatos({ amigos: AMIGOS_TOPS, destacados: conTops({}, crearTops({ mejor_jugador_mes: null })) }),
    );
    const vista = (datos) => (
      <SeccionDestacadosMes destacados={datos.destacados} amigos={datos.amigos} ddragon={datos.ddragon} ahora={AHORA} />
    );
    const { rerender } = render(vista(datosCon));
    await abrir("Mejor jugador del mes");
    rerender(vista(datosSin));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(botonTop("Mejor jugador del mes")).toBeNull();
    expect(tarjeta("Mejor jugador del mes")).toHaveTextContent("Caitlyn");
    rerender(vista(datosCon));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(botonTop("Mejor jugador del mes")).toBeInTheDocument();
    const dialogo = await abrir("Mejor jugador del mes");
    expect(dialogo).toBeInTheDocument();
  });

  it("si el top abierto vence por la hora, se cierra y no se reabre al volver datos vigentes", async () => {
    const datos = validarDatos(crearDatos({ amigos: AMIGOS_TOPS, destacados: conTops() }));
    const vista = (ahora) => (
      <SeccionDestacadosHoy destacados={datos.destacados} amigos={datos.amigos} ddragon={datos.ddragon} ahora={ahora} />
    );
    const { rerender } = render(vista(AHORA));
    await abrir("Mejor jugador de la partida - Hoy");
    rerender(vista(AHORA + 24 * 3600 * 1000));
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(vista(AHORA));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("si el día venció, las tarjetas de hoy quedan vacías y sin clic", () => {
    renderSeccion(SeccionDestacadosHoy, conTops(), AHORA + 24 * 3600 * 1000);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
