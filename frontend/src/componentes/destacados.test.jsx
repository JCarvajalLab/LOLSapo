import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AHORA, crearDatos, crearDestacados, ddragon } from "../test/fixtures/lol.js";
import { validarDatos } from "../logica/datos.js";
import { CLAVES_DESTACADOS } from "../logica/destacados.js";
import { haceCuanto } from "../logica/formato.js";
import { SeccionDestacados } from "./SeccionDestacados.jsx";

function renderDestacados(destacados, extra = {}) {
  const datos = validarDatos(crearDatos({ destacados, ...extra }));
  return render(
    <SeccionDestacados destacados={datos.destacados} amigos={datos.amigos} ddragon={datos.ddragon} ahora={AHORA} />,
  );
}

const tarjeta = (titulo) => screen.getByRole("article", { name: titulo });

describe("SeccionDestacados", () => {
  it("muestra el título, la nota y las 6 tarjetas en orden", () => {
    renderDestacados(crearDestacados());
    expect(screen.getByRole("heading", { level: 2, name: "Destacados de los últimos 7 días" })).toBeInTheDocument();
    expect(screen.getByText("Solo Normal y Ranked (Solo/Dúo y Flex) · Winrate, rachas y mejor y peor partida: últimas 10 partidas de cada uno")).toBeInTheDocument();
    const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titulos).toEqual([
      "Más partidas",
      "Mejor winrate",
      "Mejor partida",
      "Racha más larga de victorias",
      "Racha más larga de derrotas",
      "Peor partida",
    ]);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.queryByText("Peor KDA")).toBeNull();
    expect(screen.queryByText("Mejor KDA")).toBeNull();
  });

  it("formatea cada tarjeta con coma decimal", () => {
    renderDestacados(crearDestacados());

    expect(within(tarjeta("Más partidas")).getByText("20")).toBeInTheDocument();
    expect(within(tarjeta("Más partidas")).getByText("partidas")).toBeInTheDocument();

    const wr = tarjeta("Mejor winrate");
    expect(within(wr).getByText("62,5 %")).toHaveClass("text-victoria");
    expect(within(wr).getByText("5 V")).toHaveClass("text-victoria");
    expect(within(wr).getByText("3 D")).toHaveClass("text-derrota");
    expect(within(wr).getByText("5 victorias y 3 derrotas en 8 partidas")).toBeInTheDocument();

    const victorias = tarjeta("Racha más larga de victorias");
    expect(victorias).toHaveTextContent("🔥4 victorias seguidas");
    expect(within(victorias).getByText("4")).toHaveClass("text-victoria");
    expect(within(victorias).getByText("Sapito")).toBeInTheDocument();

    const derrotas = tarjeta("Racha más larga de derrotas");
    expect(derrotas).toHaveTextContent("🧊3 derrotas seguidas");
    expect(within(derrotas).getByText("3")).toHaveClass("text-derrota");
  });

  it("muestra la mejor partida con campeón de Data Dragon, KDA en color victoria, modo, fecha y resultado", () => {
    renderDestacados(crearDestacados());
    const m = tarjeta("Mejor partida");
    expect(within(m).getByText("Sapito")).toBeInTheDocument();
    expect(m).toHaveTextContent("Maestro Yi · 11 / 2 / 8");
    expect(m).not.toHaveTextContent("MasterYi");
    expect(within(m).getByText("11 asesinatos, 2 muertes, 8 asistencias")).toBeInTheDocument();
    expect(within(m).getByText("KDA 9,5")).toHaveClass("text-victoria");
    expect(m).toHaveTextContent("Clasificatoria Flex");
    expect(within(m).getByText(haceCuanto(AHORA - 2 * 3600 * 1000, AHORA))).toBeInTheDocument();
    // Puede ser la mejor partida aunque se haya perdido: el resultado va en texto.
    expect(within(m).getByText("Derrota")).toBeInTheDocument();
    expect(within(m).getByAltText("Maestro Yi")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/16.1.1/img/champion/MasterYi.png",
    );
  });

  it("sin el campeón en Data Dragon usa el nombre crudo en ambas tarjetas", () => {
    const dd = { ...ddragon, campeones: {} };
    const datos = validarDatos(crearDatos({ destacados: crearDestacados(), ddragon: dd }));
    render(<SeccionDestacados destacados={datos.destacados} amigos={datos.amigos} ddragon={dd} ahora={AHORA} />);
    expect(tarjeta("Mejor partida")).toHaveTextContent("MasterYi · 11 / 2 / 8");
    expect(tarjeta("Peor partida")).toHaveTextContent("Annie · 0 / 4 / 0");
  });

  it("muestra la peor partida con campeón, KDA, modo, fecha relativa y resultado", () => {
    renderDestacados(crearDestacados());
    const p = tarjeta("Peor partida");
    expect(p).toHaveTextContent("Annie");
    expect(p).toHaveTextContent("0 / 4 / 0");
    expect(within(p).getByText("KDA 0")).toHaveClass("text-derrota");
    expect(p).toHaveTextContent("Normal (Reclutamiento)");
    expect(within(p).getByText("hace 3 días")).toBeInTheDocument();
    expect(within(p).getByText("Victoria")).toBeInTheDocument();
    expect(within(p).getByAltText("Annie")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/16.1.1/img/champion/Annie.png",
    );
  });

  it("no arma la URL del campeón si el id de Data Dragon no es válido", () => {
    const dd = { ...ddragon, campeones: { 1: { id: "../evil", nombre: "Annie" } } };
    const datos = validarDatos(crearDatos({ destacados: crearDestacados(), ddragon: dd }));
    render(<SeccionDestacados destacados={datos.destacados} amigos={datos.amigos} ddragon={dd} ahora={AHORA} />);
    const p = tarjeta("Peor partida");
    expect(within(p).queryByRole("img", { name: "Annie" })?.tagName).toBe("SPAN");
    expect(p.querySelector("img[src*='evil']")).toBeNull();
  });

  it("no muestra peor_kda ni mejor_kda aunque un archivo viejo los traiga", () => {
    renderDestacados(
      crearDestacados({
        peor_kda: { amigos: ["rana-azul-las"], kda: 1.5, asesinatos: 30, muertes: 40, asistencias: 30, partidas: 9 },
        mejor_kda: { amigos: ["sapito-las"], kda: 3.02, asesinatos: 85, muertes: 48, asistencias: 60, partidas: 8 },
      }),
    );
    expect(screen.queryByText("Peor KDA")).toBeNull();
    expect(screen.queryByText("Mejor KDA")).toBeNull();
    expect(screen.queryByText(/1,5/)).toBeNull();
    expect(screen.queryByText(/3,02/)).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });

  it("racha de derrotas con 3 amigos empatados muestra a todos, con los nombres cortados y completos en title", () => {
    renderDestacados(crearDestacados());
    const racha = tarjeta("Racha más larga de derrotas");
    const nombres = within(racha).getByText("Rana Azul · Sapito · Charco");
    expect(nombres).toHaveAttribute("title", "Rana Azul · Sapito · Charco");
    expect(nombres).toHaveClass("line-clamp-2", "min-w-0", "break-words");
    expect(within(racha).getAllByRole("img", { name: /^Ícono de / })).toHaveLength(3);
    expect(within(racha).getByAltText("Ícono de Rana Azul#LAS")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/16.1.1/img/profileicon/29.png",
    );
    expect(within(racha).getByAltText("Ícono de Sapito#LAS")).toBeInTheDocument();
    // Charco no tiene perfil: se ve el respaldo con iniciales.
    expect(within(racha).getByRole("img", { name: "Ícono de Charco#LAS" })).toHaveTextContent("C");
    expect(within(tarjeta("Más partidas")).getByText("Rana Azul · Sapito")).toBeInTheDocument();
  });

  it("las tarjetas null dicen Sin datos", () => {
    renderDestacados(crearDestacados({ mejor_winrate: null, mejor_partida: null, peor_partida: null }));
    expect(within(tarjeta("Mejor winrate")).getByText("Sin datos")).toBeInTheDocument();
    expect(within(tarjeta("Mejor winrate")).getByText("Nadie con 5 partidas de sus últimas 10.")).toBeInTheDocument();
    expect(within(tarjeta("Peor partida")).getByText("Sin datos")).toBeInTheDocument();
    // Mejor partida es una sola partida: sin línea de mínimo.
    const mejor = tarjeta("Mejor partida");
    expect(within(mejor).getByText("Sin datos")).toBeInTheDocument();
    expect(mejor).toHaveTextContent(/^Mejor partidaSin datos$/);
    expect(within(tarjeta("Más partidas")).queryByText("Sin datos")).toBeNull();
  });

  it("ambas rachas null dicen Sin datos con su mínimo", () => {
    renderDestacados(crearDestacados({ racha_victorias: null, racha_derrotas: null }));
    const victorias = tarjeta("Racha más larga de victorias");
    const derrotas = tarjeta("Racha más larga de derrotas");
    expect(within(victorias).getByText("Sin datos")).toBeInTheDocument();
    expect(within(victorias).getByText("Nadie con 2 victorias seguidas.")).toBeInTheDocument();
    expect(within(derrotas).getByText("Sin datos")).toBeInTheDocument();
    expect(within(derrotas).getByText("Nadie con 2 derrotas seguidas.")).toBeInTheDocument();
    expect(victorias).not.toHaveTextContent("🔥");
    expect(derrotas).not.toHaveTextContent("🧊");
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });

  it("sin ultimas_partidas o con un valor inválido usa 7 en la nota y en los mínimos", () => {
    const { unmount } = renderDestacados(crearDestacados({ ultimas_partidas: undefined, mejor_winrate: null }));
    expect(screen.getByText("Solo Normal y Ranked (Solo/Dúo y Flex) · Winrate, rachas y mejor y peor partida: últimas 7 partidas de cada uno")).toBeInTheDocument();
    expect(within(tarjeta("Mejor winrate")).getByText("Nadie con 5 partidas de sus últimas 7.")).toBeInTheDocument();
    unmount();

    renderDestacados(crearDestacados({ ultimas_partidas: "<b>99</b>" }));
    expect(screen.getByText("Solo Normal y Ranked (Solo/Dúo y Flex) · Winrate, rachas y mejor y peor partida: últimas 7 partidas de cada uno")).toBeInTheDocument();
    expect(screen.queryByText(/99/)).toBeNull();
  });

  it("los datos inválidos y los slugs desconocidos terminan en Sin datos", () => {
    renderDestacados(
      crearDestacados({
        mas_partidas: { amigos: ["intruso-las"], partidas: 20 },
        mejor_partida: { ...crearDestacados().mejor_partida, kda: "9,5" },
        racha_victorias: { amigos: ["sapito-las"], racha: 1 },
        racha_derrotas: { amigos: ["intruso-las"], racha: 3 },
      }),
    );
    expect(within(tarjeta("Más partidas")).getByText("Sin datos")).toBeInTheDocument();
    expect(within(tarjeta("Mejor partida")).getByText("Sin datos")).toBeInTheDocument();
    expect(within(tarjeta("Racha más larga de victorias")).getByText("Sin datos")).toBeInTheDocument();
    expect(within(tarjeta("Racha más larga de derrotas")).getByText("Sin datos")).toBeInTheDocument();
    expect(screen.queryByText(/intruso/)).toBeNull();
  });

  it("sin el campo destacados no muestra la sección", () => {
    const { container } = renderDestacados(undefined);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Destacados de los últimos 7 días")).toBeNull();
  });

  it("si todas las tarjetas son null muestra un mensaje", () => {
    renderDestacados(crearDestacados(Object.fromEntries(CLAVES_DESTACADOS.map((c) => [c, null]))));
    expect(screen.getByRole("heading", { name: "Destacados de los últimos 7 días" })).toBeInTheDocument();
    expect(screen.getByText("Sin partidas de Normal o Ranked en los últimos 7 días")).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});
