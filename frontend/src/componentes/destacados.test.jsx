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
    expect(screen.getByText("Solo Normal y Ranked (Solo/Dúo y Flex) · Más partidas, winrate y rachas: últimos 7 días · Mejor y peor jugador: partidas en grupo de hoy (desde las 6:00)")).toBeInTheDocument();
    const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titulos).toEqual([
      "Más partidas",
      "Mejor winrate",
      "Mejor jugador de la partida - Hoy",
      "Racha de victorias en equipo",
      "Racha de derrotas en equipo",
      "Peor jugador de la partida - Hoy",
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

    const victorias = tarjeta("Racha de victorias en equipo");
    expect(victorias).toHaveTextContent("🔥4 victorias seguidas");
    expect(within(victorias).getByText("4")).toHaveClass("text-victoria");
    expect(within(victorias).getByText("Sapito")).toBeInTheDocument();

    const derrotas = tarjeta("Racha de derrotas en equipo");
    expect(derrotas).toHaveTextContent("🧊3 derrotas seguidas");
    expect(within(derrotas).getByText("3")).toHaveClass("text-derrota");
  });

  it("muestra la mejor partida con campeón de Data Dragon, KDA en color victoria, modo, fecha y resultado", () => {
    renderDestacados(crearDestacados());
    const m = tarjeta("Mejor jugador de la partida - Hoy");
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
    expect(tarjeta("Mejor jugador de la partida - Hoy")).toHaveTextContent("MasterYi · 11 / 2 / 8");
    expect(tarjeta("Peor jugador de la partida - Hoy")).toHaveTextContent("Annie · 0 / 4 / 0");
  });

  it("muestra la peor partida con campeón, KDA, modo, fecha relativa y resultado", () => {
    renderDestacados(crearDestacados());
    const p = tarjeta("Peor jugador de la partida - Hoy");
    expect(p).toHaveTextContent("Annie");
    expect(p).toHaveTextContent("0 / 4 / 0");
    expect(within(p).getByText("KDA 0")).toHaveClass("text-derrota");
    expect(p).toHaveTextContent("Normal (Reclutamiento)");
    expect(within(p).getByText(haceCuanto(AHORA - 4 * 3600 * 1000, AHORA))).toBeInTheDocument();
    expect(within(p).getByText("Victoria")).toBeInTheDocument();
    expect(within(p).getByAltText("Annie")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/16.1.1/img/champion/Annie.png",
    );
  });

  it("muestra el daño a campeones con punto de miles en mejor y peor partida", () => {
    renderDestacados(crearDestacados());
    const m = tarjeta("Mejor jugador de la partida - Hoy");
    const p = tarjeta("Peor jugador de la partida - Hoy");
    const danioM = within(m).getByText("Daño: 32.450");
    const danioP = within(p).getByText("Daño: 4.180");
    // Elemento propio, justo después de la línea del KDA (que queda sola), mismo tamaño y peso.
    for (const [danio, kda] of [
      [danioM, within(m).getByText("KDA 9,5")],
      [danioP, within(p).getByText("KDA 0")],
    ]) {
      expect(danio.tagName).toBe("P");
      expect(kda.nextElementSibling).toBe(danio);
      expect(kda).toHaveTextContent(/^KDA [\d,]+$/);
      expect(danio).toHaveClass("text-sm", "font-semibold");
      expect(kda).toHaveClass("text-sm", "font-semibold");
    }
    // Solo en estas dos tarjetas.
    expect(screen.getAllByText(/^Daño: /)).toHaveLength(2);
  });

  it("colorea el daño según el resultado de esa partida, no según la tarjeta", () => {
    // Fixture: la mejor partida es una derrota y la peor una victoria.
    renderDestacados(crearDestacados());
    const danioM = within(tarjeta("Mejor jugador de la partida - Hoy")).getByText("Daño: 32.450");
    const danioP = within(tarjeta("Peor jugador de la partida - Hoy")).getByText("Daño: 4.180");
    expect(danioM).toHaveClass("text-derrota");
    expect(danioM).not.toHaveClass("text-victoria");
    expect(danioP).toHaveClass("text-victoria");
    expect(danioP).not.toHaveClass("text-derrota");
  });

  it("con resultados invertidos cambia el color del daño en ambas tarjetas", () => {
    const base = crearDestacados();
    renderDestacados(
      crearDestacados({
        mejor_jugador_hoy: { ...base.mejor_jugador_hoy, resultado: "victoria" },
        peor_jugador_hoy: { ...base.peor_jugador_hoy, resultado: "derrota" },
      }),
    );
    expect(within(tarjeta("Mejor jugador de la partida - Hoy")).getByText("Daño: 32.450")).toHaveClass("text-victoria");
    expect(within(tarjeta("Peor jugador de la partida - Hoy")).getByText("Daño: 4.180")).toHaveClass("text-derrota");
  });

  it.each([
    ["null", null],
    ["ausente", undefined],
    ["negativo", -100],
    ["decimal", 32450.7],
    ["texto", "32450"],
    ["HTML", "<img src=x onerror=alert(1)>"],
  ])("con daño %s no muestra la línea ni «sin datos»", (_nombre, danio) => {
    const base = crearDestacados();
    const mejor = { ...base.mejor_jugador_hoy, danio };
    const peor = { ...base.peor_jugador_hoy, danio };
    if (danio === undefined) {
      delete mejor.danio;
      delete peor.danio;
    }
    const { container } = renderDestacados(crearDestacados({ mejor_jugador_hoy: mejor, peor_jugador_hoy: peor }));
    for (const nombre of ["Mejor jugador de la partida - Hoy", "Peor jugador de la partida - Hoy"]) {
      const t = tarjeta(nombre);
      expect(t).not.toHaveTextContent(/daño/i);
      expect(t).not.toHaveTextContent(/sin datos/i);
      expect(t.querySelector("[data-danio]")).toBeNull();
    }
    // La partida se sigue mostrando y nada se inserta como HTML.
    expect(tarjeta("Mejor jugador de la partida - Hoy")).toHaveTextContent("KDA 9,5");
    expect(container.querySelector("img[src='x']")).toBeNull();
  });

  it("no arma la URL del campeón si el id de Data Dragon no es válido", () => {
    const dd = { ...ddragon, campeones: { 1: { id: "../evil", nombre: "Annie" } } };
    const datos = validarDatos(crearDatos({ destacados: crearDestacados(), ddragon: dd }));
    render(<SeccionDestacados destacados={datos.destacados} amigos={datos.amigos} ddragon={dd} ahora={AHORA} />);
    const p = tarjeta("Peor jugador de la partida - Hoy");
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

  it("racha en equipo con 3 integrantes: nota «(1 partida)» solo para quien jugó 1", () => {
    renderDestacados(crearDestacados());
    const racha = tarjeta("Racha de derrotas en equipo");
    const nombres = racha.querySelector("[data-integrantes]");
    // El texto (también para lectores de pantalla) incluye la nota.
    expect(nombres).toHaveTextContent(/^Rana Azul · Sapito · Charco \(1 partida\)$/);
    expect(nombres).toHaveAttribute("title", "Rana Azul · Sapito · Charco (1 partida)");
    const nota = within(racha).getByText("(1 partida)");
    expect(nota).toHaveClass("text-texto-suave");
    expect(within(racha).getAllByText(/partida\)/)).toHaveLength(1);
    expect(within(racha).getByText("Charco").nextSibling).toBe(nota);
    expect(within(racha).getByText("Rana Azul").nextSibling).toBeNull();
    expect(within(racha).getByText("Sapito").nextSibling).toBeNull();
    // La otra racha: Rana jugó 3 de 4, sin nota.
    expect(within(tarjeta("Racha de victorias en equipo")).queryByText(/partida\)/)).toBeNull();
    expect(within(racha).getAllByRole("img", { name: /^Ícono de / })).toHaveLength(3);
    expect(within(racha).getByAltText("Ícono de Rana Azul#LAS")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/16.1.1/img/profileicon/29.png",
    );
    expect(within(racha).getByAltText("Ícono de Sapito#LAS")).toBeInTheDocument();
    // Charco no tiene perfil: se ve el respaldo con iniciales.
    expect(within(racha).getByRole("img", { name: "Ícono de Charco#LAS" })).toHaveTextContent("C");
    const mas = within(tarjeta("Más partidas")).getByText("Rana Azul · Sapito");
    expect(mas).toHaveAttribute("title", "Rana Azul · Sapito");
    expect(mas).toHaveClass("line-clamp-2", "min-w-0", "break-words");
  });

  it("racha con 5 integrantes: nombres en 2 líneas fijas, sin desborde y completos en title", () => {
    const base = crearDatos().amigos;
    const extra = ["Renacuajo", "Ranita Feliz"].map((nombre, i) => ({
      ...base[1],
      riot_id: `${nombre}#LAS`,
      nombre,
      slug: `extra-${i}-las`,
    }));
    const amigos = [...base, ...extra];
    const slugs = amigos.map((a) => a.slug);
    renderDestacados(
      crearDestacados({
        racha_victorias_grupo: {
          racha: 5,
          amigos: slugs,
          partidas: Object.fromEntries(slugs.map((s, i) => [s, i === 4 ? 1 : 5])),
          desde: new Date(2026, 9, 1, 10).getTime(),
          hasta: new Date(2026, 9, 1, 14).getTime(),
        },
      }),
      { amigos },
    );
    const racha = tarjeta("Racha de victorias en equipo");
    const nombres = racha.querySelector("[data-integrantes]");
    expect(nombres).toHaveClass("line-clamp-2", "h-10", "min-w-0", "break-words");
    expect(nombres).toHaveAttribute("title", "Rana Azul · Sapito · Charco · Renacuajo · Ranita Feliz (1 partida)");
    expect(within(racha).getAllByRole("img", { name: /^Ícono de / })).toHaveLength(5);
    expect(within(racha).getByText("1 oct")).toBeInTheDocument();
  });

  it("muestra la fecha de la racha: un día o un rango", () => {
    renderDestacados(crearDestacados());
    const dia = within(tarjeta("Racha de derrotas en equipo")).getByText("1 oct");
    expect(dia.tagName).toBe("TIME");
    expect(dia).toHaveAttribute("dateTime", new Date(2026, 9, 1, 10).toISOString());
    expect(within(tarjeta("Racha de victorias en equipo")).getByText(/^30 sept? – 1 oct$/)).toBeInTheDocument();
  });

  it("sin fechas válidas la racha no muestra la línea de fecha ni notas", () => {
    renderDestacados(
      crearDestacados({ racha_derrotas_grupo: { racha: 2, amigos: ["sapito-las", "rana-azul-las"], desde: "ayer" } }),
    );
    const derrotas = tarjeta("Racha de derrotas en equipo");
    expect(derrotas).toHaveTextContent("🧊2 derrotas seguidas");
    expect(derrotas.querySelector("time")).toBeNull();
    expect(within(derrotas).queryByText(/partida\)/)).toBeNull();
  });

  it("ignora las rachas del formato viejo", () => {
    renderDestacados(
      crearDestacados({
        racha_victorias: { amigos: ["sapito-las"], racha: 47 },
        racha_derrotas: { amigos: ["sapito-las"], racha: 46 },
        racha_victorias_grupo: undefined,
        racha_derrotas_grupo: undefined,
      }),
    );
    expect(within(tarjeta("Racha de victorias en equipo")).getByText("Sin datos")).toBeInTheDocument();
    expect(within(tarjeta("Racha de derrotas en equipo")).getByText("Sin datos")).toBeInTheDocument();
    expect(screen.queryByText("47")).toBeNull();
    expect(screen.queryByText("46")).toBeNull();
  });

  it("las tarjetas null dicen Sin datos; mejor y peor jugador, que no hay partidas en grupo hoy", () => {
    renderDestacados(crearDestacados({ mejor_winrate: null, mejor_jugador_hoy: null, peor_jugador_hoy: null }));
    expect(within(tarjeta("Mejor winrate")).getByText("Sin datos")).toBeInTheDocument();
    expect(within(tarjeta("Mejor winrate")).getByText("Nadie con 5 partidas en los últimos 7 días.")).toBeInTheDocument();
    for (const titulo of ["Mejor jugador de la partida - Hoy", "Peor jugador de la partida - Hoy"]) {
      const t = tarjeta(titulo);
      expect(within(t).getByText("No hay partidas en grupo registradas hoy")).not.toHaveClass("text-xs");
      expect(within(t).getByText("Se reinicia a las 6:00")).toHaveClass("text-xs", "text-texto-suave");
      expect(t).toHaveTextContent(new RegExp(`^${titulo}No hay partidas en grupo registradas hoySe reinicia a las 6:00$`));
      expect(within(t).queryByText("Sin datos")).toBeNull();
    }
    expect(within(tarjeta("Más partidas")).queryByText("Sin datos")).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });

  it("ambas rachas null dicen Sin datos con su mínimo", () => {
    renderDestacados(crearDestacados({ racha_victorias_grupo: null, racha_derrotas_grupo: null }));
    const victorias = tarjeta("Racha de victorias en equipo");
    const derrotas = tarjeta("Racha de derrotas en equipo");
    expect(within(victorias).getByText("Sin datos")).toBeInTheDocument();
    expect(within(victorias).getByText("Nadie con 2 victorias seguidas en equipo.")).toBeInTheDocument();
    expect(within(derrotas).getByText("Sin datos")).toBeInTheDocument();
    expect(within(derrotas).getByText("Nadie con 2 derrotas seguidas en equipo.")).toBeInTheDocument();
    expect(victorias).not.toHaveTextContent("🔥");
    expect(derrotas).not.toHaveTextContent("🧊");
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });

  it("ignora mejor_partida, peor_partida y ultimas_partidas de archivos viejos", () => {
    const base = crearDestacados();
    const viejo = { ...base, mejor_partida: base.mejor_jugador_hoy, peor_partida: base.peor_jugador_hoy, ultimas_partidas: 99 };
    delete viejo.mejor_jugador_hoy;
    delete viejo.peor_jugador_hoy;
    renderDestacados(viejo);
    expect(screen.getByText("Solo Normal y Ranked (Solo/Dúo y Flex) · Más partidas, winrate y rachas: últimos 7 días · Mejor y peor jugador: partidas en grupo de hoy (desde las 6:00)")).toBeInTheDocument();
    expect(within(tarjeta("Mejor jugador de la partida - Hoy")).getByText("No hay partidas en grupo registradas hoy")).toBeInTheDocument();
    expect(within(tarjeta("Peor jugador de la partida - Hoy")).getByText("No hay partidas en grupo registradas hoy")).toBeInTheDocument();
    expect(screen.queryByText(/Maestro Yi|Annie|99/)).toBeNull();
    expect(screen.queryByText("Mejor partida")).toBeNull();
    expect(screen.queryByText("Peor partida")).toBeNull();
  });

  it("los datos inválidos y los slugs desconocidos terminan en Sin datos", () => {
    renderDestacados(
      crearDestacados({
        mas_partidas: { amigos: ["intruso-las"], partidas: 20 },
        mejor_jugador_hoy: { ...crearDestacados().mejor_jugador_hoy, kda: "9,5" },
        racha_victorias_grupo: { amigos: ["sapito-las", "rana-azul-las"], racha: 1 },
        racha_derrotas_grupo: { amigos: ["intruso-las"], racha: 3, partidas: { "intruso-las": 1 } },
      }),
    );
    expect(within(tarjeta("Más partidas")).getByText("Sin datos")).toBeInTheDocument();
    expect(within(tarjeta("Mejor jugador de la partida - Hoy")).getByText("No hay partidas en grupo registradas hoy")).toBeInTheDocument();
    expect(within(tarjeta("Racha de victorias en equipo")).getByText("Sin datos")).toBeInTheDocument();
    expect(within(tarjeta("Racha de derrotas en equipo")).getByText("Sin datos")).toBeInTheDocument();
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
