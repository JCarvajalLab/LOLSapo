import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AHORA, crearDatos, crearDestacados, ddragon } from "../test/fixtures/lol.js";
import { validarDatos } from "../logica/datos.js";
import { CLAVES_DESTACADOS, CLAVES_SEMANA } from "../logica/destacados.js";
import { haceCuanto } from "../logica/formato.js";
import { SeccionDestacadosHoy } from "./SeccionDestacadosHoy.jsx";
import { SeccionDestacadosSemana } from "./SeccionDestacadosSemana.jsx";

/** Las dos secciones, como en App. */
function Destacados(props) {
  return (
    <>
      <SeccionDestacadosHoy {...props} />
      <SeccionDestacadosSemana {...props} />
    </>
  );
}

function renderDestacados(destacados, extra = {}) {
  const datos = validarDatos(crearDatos({ destacados, ...extra }));
  return render(<Destacados destacados={datos.destacados} amigos={datos.amigos} ddragon={datos.ddragon} ahora={AHORA} />);
}

const tarjeta = (titulo) => screen.getByRole("article", { name: titulo });
const seccion = (titulo) => screen.getByRole("region", { name: titulo });
const HOY = "Destacados de hoy";
const SEMANA = "Destacados de la semana";
const NOTA_HOY = "Partidas en grupo (2 o más del grupo) de Normal y Ranked desde las 12:00 · Se reinicia cada día";
const NOTA_SEMANA =
  "Partidas en equipo (2 o más del grupo) de Normal y Ranked, de lunes a domingo · Se reinicia el lunes a la 01:00";
const VACIO_SEMANA = "No existen partidas registradas en equipo esta semana";
const REINICIO_SEMANA = "Se reinicia el lunes a la 01:00";
const SIN_RECORTE = ["truncate", "line-clamp-1", "line-clamp-2", "line-clamp-3", "text-ellipsis", "overflow-hidden"];
const TITULOS_SEMANA = [
  "Más partidas",
  "Mejor winrate",
  "Mejor jugador de la semana",
  "Racha de victorias en equipo",
  "Racha de derrotas en equipo",
  "Peor jugador de la semana",
];

/** Una tarjeta de la semana vacía: título, mensaje único y cuándo se reinicia. */
function esperarVacioSemana(titulo) {
  const t = tarjeta(titulo);
  expect(within(t).getByText(VACIO_SEMANA)).not.toHaveClass("text-xs");
  expect(within(t).getByText(REINICIO_SEMANA)).toHaveClass("text-xs", "text-texto-suave");
  expect(t).toHaveTextContent(new RegExp(`^${titulo}${VACIO_SEMANA}${REINICIO_SEMANA}$`));
  expect(t).not.toHaveTextContent(/Sin datos|Nadie con|7 días/);
}
const titulosEn = (region) => within(region).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

describe("Destacados", () => {
  it("muestra dos secciones en orden: hoy y luego la semana, cada una con su nota", () => {
    renderDestacados(crearDestacados());
    const titulos = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual([HOY, SEMANA]);
    expect(screen.queryByText(/últimos 7 días|6:00/)).toBeNull();
    expect(seccion(HOY)).toHaveAccessibleDescription(NOTA_HOY);
    expect(seccion(SEMANA)).toHaveAccessibleDescription(NOTA_SEMANA);
  });

  it("hoy: mejor jugador, balance al centro y peor jugador", () => {
    renderDestacados(crearDestacados());
    const hoy = seccion(HOY);
    expect(titulosEn(hoy)).toEqual([
      "Mejor jugador de la partida - Hoy",
      "Balance del grupo hoy",
      "Peor jugador de la partida - Hoy",
    ]);
    expect(within(hoy).getAllByRole("listitem")).toHaveLength(3);
    expect(within(hoy).getByRole("list")).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-3");
    // En tablet el balance baja a su fila a todo el ancho; en escritorio vuelve al centro.
    expect(tarjeta("Balance del grupo hoy").closest("li")).toHaveClass(
      "sm:order-last",
      "sm:col-span-2",
      "lg:order-none",
      "lg:col-span-1",
    );
  });

  it("semana: las 6 tarjetas en orden, con mejor y peor jugador de la semana", () => {
    renderDestacados(crearDestacados());
    const semana = seccion(SEMANA);
    expect(titulosEn(semana)).toEqual([
      "Más partidas",
      "Mejor winrate",
      "Mejor jugador de la semana",
      "Racha de victorias en equipo",
      "Racha de derrotas en equipo",
      "Peor jugador de la semana",
    ]);
    expect(within(semana).getAllByRole("listitem")).toHaveLength(6);
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
    render(<Destacados destacados={datos.destacados} amigos={datos.amigos} ddragon={dd} ahora={AHORA} />);
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
    // En hoy, solo en estas dos tarjetas (en la semana, en las del jugador de la semana).
    expect(within(seccion(HOY)).getAllByText(/^Daño: /)).toHaveLength(2);
    expect(within(seccion(SEMANA)).getAllByText(/^Daño: /)).toHaveLength(2);
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
    render(<Destacados destacados={datos.destacados} amigos={datos.amigos} ddragon={dd} ahora={AHORA} />);
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
    expect(screen.getAllByRole("article")).toHaveLength(9);
  });

  it("racha en equipo con 3 integrantes: nota para quien jugó menos que la racha", () => {
    renderDestacados(crearDestacados());
    const racha = tarjeta("Racha de derrotas en equipo");
    const nombres = racha.querySelector("[data-integrantes]");
    // El texto (también para lectores de pantalla) incluye la nota.
    expect(nombres).toHaveTextContent(/^Rana Azul · Sapito · Charco \(1 partida\)$/);
    expect(nombres).not.toHaveClass(...SIN_RECORTE);
    const nota = within(racha).getByText("(1 partida)");
    expect(nota).toHaveClass("text-texto-suave");
    expect(within(racha).getAllByText(/partida\)/)).toHaveLength(1);
    expect(within(racha).getByText("Charco").nextSibling).toBe(nota);
    expect(within(racha).getByText("Rana Azul").nextSibling).toBeNull();
    expect(within(racha).getByText("Sapito").nextSibling).toBeNull();
    // La otra racha: Rana jugó 3 de 4, también lleva nota.
    expect(tarjeta("Racha de victorias en equipo").querySelector("[data-integrantes]")).toHaveTextContent(
      /^Sapito · Rana Azul \(3 partidas\)$/,
    );
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

  it("racha de 7 con 5 integrantes: nota para quienes jugaron 5 y 2, nombres completos sin recorte", () => {
    const base = crearDatos().amigos;
    const extra = ["Renacuajo Saltarín Nocturno", "Ranita Feliz"].map((nombre, i) => ({
      ...base[1],
      riot_id: `${nombre}#LAS`,
      nombre,
      slug: `extra-${i}-las`,
    }));
    const amigos = [...base, ...extra];
    renderDestacados(
      crearDestacados({
        racha_victorias_grupo: {
          racha: 7,
          amigos: amigos.map((a) => a.slug),
          partidas: { "rana-azul-las": 7, "sapito-las": 7, "charco-las": 7, "extra-0-las": 5, "extra-1-las": 2 },
          desde: new Date(2026, 9, 1, 10).getTime(),
          hasta: new Date(2026, 9, 1, 14).getTime(),
        },
      }),
      { amigos },
    );
    const racha = tarjeta("Racha de victorias en equipo");
    const nombres = racha.querySelector("[data-integrantes]");
    expect(nombres).toHaveTextContent(
      /^Rana Azul · Sapito · Charco · Renacuajo Saltarín Nocturno \(5 partidas\) · Ranita Feliz \(2 partidas\)$/,
    );
    expect(nombres).toHaveClass("min-w-0", "break-words");
    expect(nombres).not.toHaveClass(...SIN_RECORTE, "h-10");
    for (const n of nombres.querySelectorAll("span")) expect(n).not.toHaveClass(...SIN_RECORTE);
    expect(within(nombres).getAllByText(/partidas?\)/)).toHaveLength(2);
    for (const nombre of ["Rana Azul", "Sapito", "Charco"]) {
      expect(within(nombres).getByText(nombre).nextSibling).toBeNull();
    }
    expect(within(nombres).getByText("(5 partidas)")).toHaveClass("text-texto-suave");
    expect(within(racha).getAllByRole("img", { name: /^Ícono de / })).toHaveLength(5);
    expect(within(racha).getByText("1 oct")).toBeInTheDocument();
  });

  it("racha de 2: quien jugó 1 lleva «(1 partida)» en singular", () => {
    renderDestacados(
      crearDestacados({
        racha_derrotas_grupo: {
          racha: 2,
          amigos: ["sapito-las", "charco-las"],
          partidas: { "sapito-las": 2, "charco-las": 1 },
        },
      }),
    );
    expect(tarjeta("Racha de derrotas en equipo").querySelector("[data-integrantes]")).toHaveTextContent(
      /^Sapito · Charco \(1 partida\)$/,
    );
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
    esperarVacioSemana("Racha de victorias en equipo");
    esperarVacioSemana("Racha de derrotas en equipo");
    expect(screen.queryByText("47")).toBeNull();
    expect(screen.queryByText("46")).toBeNull();
  });

  it("tarjetas null: la de la semana dice que no hay partidas en equipo; las de hoy, en grupo hoy", () => {
    renderDestacados(crearDestacados({ mejor_winrate: null, mejor_jugador_hoy: null, peor_jugador_hoy: null }));
    esperarVacioSemana("Mejor winrate");
    for (const titulo of ["Mejor jugador de la partida - Hoy", "Peor jugador de la partida - Hoy"]) {
      const t = tarjeta(titulo);
      expect(within(t).getByText("No hay partidas en grupo registradas hoy")).not.toHaveClass("text-xs");
      expect(within(t).getByText("Se reinicia a las 12:00")).toHaveClass("text-xs", "text-texto-suave");
      expect(t).toHaveTextContent(new RegExp(`^${titulo}No hay partidas en grupo registradas hoySe reinicia a las 12:00$`));
    }
    expect(within(tarjeta("Más partidas")).queryByText(VACIO_SEMANA)).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(9);
  });

  it.each(CLAVES_SEMANA.map((clave, i) => [TITULOS_SEMANA[i], clave]))(
    "%s vacía muestra el mensaje único de la semana",
    (titulo, clave) => {
      renderDestacados(crearDestacados({ [clave]: null }));
      esperarVacioSemana(titulo);
      expect(within(seccion(SEMANA)).getAllByText(VACIO_SEMANA)).toHaveLength(1);
      expect(within(seccion(SEMANA)).getAllByRole("article")).toHaveLength(6);
    },
  );

  it("ambas rachas null no muestran el ícono de la racha", () => {
    renderDestacados(crearDestacados({ racha_victorias_grupo: null, racha_derrotas_grupo: null }));
    esperarVacioSemana("Racha de victorias en equipo");
    esperarVacioSemana("Racha de derrotas en equipo");
    expect(tarjeta("Racha de victorias en equipo")).not.toHaveTextContent("🔥");
    expect(tarjeta("Racha de derrotas en equipo")).not.toHaveTextContent("🧊");
    expect(screen.getAllByRole("article")).toHaveLength(9);
  });

  it("ignora mejor_partida, peor_partida y ultimas_partidas de archivos viejos", () => {
    const base = crearDestacados();
    const viejo = { ...base, mejor_partida: base.mejor_jugador_hoy, peor_partida: base.peor_jugador_hoy, ultimas_partidas: 99 };
    delete viejo.mejor_jugador_hoy;
    delete viejo.peor_jugador_hoy;
    renderDestacados(viejo);
    expect(screen.getByText(NOTA_HOY)).toBeInTheDocument();
    expect(within(tarjeta("Mejor jugador de la partida - Hoy")).getByText("No hay partidas en grupo registradas hoy")).toBeInTheDocument();
    expect(within(tarjeta("Peor jugador de la partida - Hoy")).getByText("No hay partidas en grupo registradas hoy")).toBeInTheDocument();
    expect(within(seccion(HOY)).queryByText(/Maestro Yi|Annie|99/)).toBeNull();
    expect(screen.queryByText("Mejor partida")).toBeNull();
    expect(screen.queryByText("Peor partida")).toBeNull();
  });

  it("los datos inválidos y los slugs desconocidos terminan en el estado vacío", () => {
    renderDestacados(
      crearDestacados({
        mas_partidas: { amigos: ["intruso-las"], partidas: 20 },
        mejor_jugador_hoy: { ...crearDestacados().mejor_jugador_hoy, kda: "9,5" },
        racha_victorias_grupo: { amigos: ["sapito-las", "rana-azul-las"], racha: 1 },
        racha_derrotas_grupo: { amigos: ["intruso-las"], racha: 3, partidas: { "intruso-las": 1 } },
      }),
    );
    esperarVacioSemana("Más partidas");
    expect(within(tarjeta("Mejor jugador de la partida - Hoy")).getByText("No hay partidas en grupo registradas hoy")).toBeInTheDocument();
    esperarVacioSemana("Racha de victorias en equipo");
    esperarVacioSemana("Racha de derrotas en equipo");
    expect(screen.queryByText(/intruso/)).toBeNull();
  });

  it("sin el campo destacados no muestra ninguna de las dos secciones", () => {
    const { container } = renderDestacados(undefined);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(HOY)).toBeNull();
    expect(screen.queryByText(SEMANA)).toBeNull();
  });

  it("si todas las tarjetas son null: hoy con sus 3 vacías y la semana con un solo mensaje", () => {
    renderDestacados(crearDestacados(Object.fromEntries(CLAVES_DESTACADOS.map((c) => [c, null]))));
    expect(within(seccion(SEMANA)).getAllByText(VACIO_SEMANA)).toHaveLength(1);
    expect(seccion(SEMANA)).not.toHaveTextContent(/7 días|Sin partidas de Normal/);
    expect(within(seccion(SEMANA)).queryAllByRole("article")).toHaveLength(0);
    expect(within(seccion(HOY)).getAllByRole("article")).toHaveLength(3);
    expect(within(seccion(HOY)).getAllByText("No hay partidas en grupo registradas hoy")).toHaveLength(3);
  });

  it("si solo hay datos de hoy, la semana muestra su mensaje y hoy sus tarjetas", () => {
    renderDestacados(
      crearDestacados({
        mas_partidas: null,
        mejor_winrate: null,
        mejor_jugador_semana: null,
        racha_victorias_grupo: null,
        racha_derrotas_grupo: null,
        peor_jugador_semana: null,
      }),
    );
    expect(within(seccion(SEMANA)).getByText(VACIO_SEMANA)).toBeInTheDocument();
    expect(within(seccion(SEMANA)).queryAllByRole("article")).toHaveLength(0);
    expect(within(tarjeta("Balance del grupo hoy")).getByText("4 V")).toBeInTheDocument();
  });
});

describe("Balance del grupo hoy", () => {
  it("muestra victorias y derrotas con color y letra, winrate con un decimal, partidas e íconos", () => {
    renderDestacados(crearDestacados());
    const b = tarjeta("Balance del grupo hoy");
    expect(within(b).getByText("4 V")).toHaveClass("text-victoria");
    expect(within(b).getByText("2 D")).toHaveClass("text-derrota");
    expect(within(b).getByText("4 victorias y 2 derrotas")).toHaveClass("sr-only");
    expect(b).toHaveTextContent("66,7 % · 6 partidas en grupo");
    const iconos = within(b).getAllByRole("img", { name: /^Ícono de / });
    expect(iconos.map((i) => i.getAttribute("aria-label") ?? i.getAttribute("alt"))).toEqual([
      "Ícono de Sapito#LAS",
      "Ícono de Rana Azul#LAS",
      "Ícono de Charco#LAS",
    ]);
    expect(b).not.toHaveTextContent(/sin datos/i);
  });

  it("con 2 amigos muestra los 2 nombres sin #tag bajo los íconos", () => {
    renderDestacados(
      crearDestacados({
        balance_hoy: { partidas: 2, victorias: 1, derrotas: 1, winrate: 50, amigos: ["sapito-las", "charco-las"] },
      }),
    );
    const nombres = tarjeta("Balance del grupo hoy").querySelector("[data-jugadores]");
    expect(nombres).toHaveTextContent(/^Sapito · Charco$/);
    expect(nombres).toHaveClass("text-xs", "break-words");
    expect(nombres).not.toHaveClass(...SIN_RECORTE);
    expect(within(nombres).getByText("Sapito")).toBeInTheDocument();
    expect(within(nombres).getByText("Charco")).toBeInTheDocument();
  });

  it("con 5 amigos muestra los 5 nombres completos, sin recorte", () => {
    const base = crearDatos().amigos;
    const extra = ["Renacuajo Saltarín Nocturno", "Ranita Feliz"].map((nombre, i) => ({
      ...base[1],
      riot_id: `${nombre}#LAS`,
      nombre,
      slug: `extra-${i}-las`,
    }));
    const amigos = [...base, ...extra];
    renderDestacados(
      crearDestacados({
        balance_hoy: { partidas: 3, victorias: 2, derrotas: 1, winrate: 66.7, amigos: amigos.map((a) => a.slug) },
      }),
      { amigos },
    );
    const b = tarjeta("Balance del grupo hoy");
    const nombres = b.querySelector("[data-jugadores]");
    expect(nombres).toHaveTextContent(/^Rana Azul · Sapito · Charco · Renacuajo Saltarín Nocturno · Ranita Feliz$/);
    expect(nombres).not.toHaveClass(...SIN_RECORTE);
    for (const n of nombres.querySelectorAll("span")) expect(n).not.toHaveClass(...SIN_RECORTE);
    expect(within(b).getAllByRole("img", { name: /^Ícono de / })).toHaveLength(5);
    expect(nombres).not.toHaveTextContent("#");
  });

  const nombresBalance = () => tarjeta("Balance del grupo hoy").querySelector("[data-jugadores]");

  it("quien jugó 1 de 3 lleva «(1 partida)»; quienes jugaron todas, sin nota", () => {
    renderDestacados(
      crearDestacados({
        balance_hoy: {
          partidas: 3,
          victorias: 2,
          derrotas: 1,
          winrate: 66.7,
          amigos: ["sapito-las", "rana-azul-las", "charco-las"],
          jugadas: { "sapito-las": 3, "rana-azul-las": 3, "charco-las": 1 },
        },
      }),
    );
    const nombres = nombresBalance();
    expect(nombres).toHaveTextContent(/^Sapito · Rana Azul · Charco \(1 partida\)$/);
    expect(within(nombres).getByText("(1 partida)")).toHaveClass("text-texto-suave");
    expect(within(nombres).getAllByText(/partida/)).toHaveLength(1);
    expect(nombres).not.toHaveClass(...SIN_RECORTE);
  });

  it("quien jugó 2 de 4 lleva «(2 partidas)», en plural", () => {
    renderDestacados(
      crearDestacados({
        balance_hoy: {
          partidas: 4,
          victorias: 3,
          derrotas: 1,
          winrate: 75,
          amigos: ["rana-azul-las", "sapito-las"],
          jugadas: { "rana-azul-las": 4, "sapito-las": 2 },
        },
      }),
    );
    expect(nombresBalance()).toHaveTextContent(/^Rana Azul · Sapito \(2 partidas\)$/);
  });

  it.each([
    ["ausente (archivo viejo)", undefined],
    ["inválido", { "sapito-las": 0, "rana-azul-las": 9, "charco-las": "1" }],
    ["que no es objeto", [1, 1, 1]],
  ])("jugadas %s: nadie lleva nota", (_nombre, jugadas) => {
    renderDestacados(crearDestacados({ balance_hoy: { ...crearDestacados().balance_hoy, jugadas } }));
    expect(nombresBalance()).toHaveTextContent(/^Sapito · Rana Azul · Charco$/);
  });

  it("singular con 1 partida y winrate calculado si viene null", () => {
    renderDestacados(
      crearDestacados({ balance_hoy: { partidas: 1, victorias: 0, derrotas: 1, winrate: null, amigos: ["sapito-las"] } }),
    );
    const b = tarjeta("Balance del grupo hoy");
    expect(b).toHaveTextContent("0 % · 1 partida en grupo");
    expect(within(b).getByText("0 victorias y 1 derrota")).toBeInTheDocument();
  });

  it.each([
    ["null", null],
    ["ausente", undefined],
    ["incoherente", { partidas: 6, victorias: 4, derrotas: 1, winrate: 66.7, amigos: ["sapito-las"] }],
    ["con slugs desconocidos", { partidas: 2, victorias: 1, derrotas: 1, winrate: 50, amigos: ["intruso-las"] }],
  ])("balance %s muestra el estado vacío de hoy", (_nombre, balance) => {
    renderDestacados(crearDestacados({ balance_hoy: balance }));
    const b = tarjeta("Balance del grupo hoy");
    expect(b).toHaveTextContent(/^Balance del grupo hoyNo hay partidas en grupo registradas hoySe reinicia a las 12:00$/);
    expect(screen.queryByText(/intruso/)).toBeNull();
  });
});

describe("Mejor winrate", () => {
  it("con un amigo muestra su nombre, el % y el récord", () => {
    renderDestacados(crearDestacados());
    const wr = tarjeta("Mejor winrate");
    expect(wr.querySelector("[data-ganadores]")).toHaveTextContent(/^Sapito$/);
    expect(wr).toHaveTextContent("5 V – 3 D · 8 partidas");
  });

  it("compartido por 2: los 2 íconos, ambos nombres y el récord una sola vez", () => {
    renderDestacados(
      crearDestacados({
        mejor_winrate: { amigos: ["sapito-las", "rana-azul-las"], winrate: 75.0, victorias: 3, derrotas: 1, partidas: 4 },
      }),
    );
    const wr = tarjeta("Mejor winrate");
    expect(wr.querySelector("[data-ganadores]")).toHaveTextContent(/^Sapito · Rana Azul$/);
    expect(within(wr).getAllByRole("img", { name: /^Ícono de / })).toHaveLength(2);
    expect(within(wr).getByText("75 %")).toHaveClass("text-victoria");
    expect(within(wr).getAllByText("3 V")).toHaveLength(1);
    expect(wr).toHaveTextContent("3 V – 1 D · 4 partidas");
    expect(within(wr).getByText("3 victorias y 1 derrota en 4 partidas")).toHaveClass("sr-only");
    expect(wr).not.toHaveTextContent(/partidas?\)/);
  });

  it("compartido por 3 con nombres largos: todos completos, sin recorte", () => {
    const base = crearDatos().amigos;
    const amigos = [...base, { ...base[1], riot_id: "Renacuajo Saltarín Nocturno#LAS", nombre: "Renacuajo Saltarín Nocturno", slug: "extra-las" }];
    renderDestacados(
      crearDestacados({
        mejor_winrate: {
          amigos: ["sapito-las", "charco-las", "extra-las"],
          winrate: 66.7,
          victorias: 2,
          derrotas: 1,
          partidas: 3,
        },
      }),
      { amigos },
    );
    const wr = tarjeta("Mejor winrate");
    const nombres = wr.querySelector("[data-ganadores]");
    expect(nombres).toHaveTextContent(/^Sapito · Charco · Renacuajo Saltarín Nocturno$/);
    expect(nombres).toHaveClass("min-w-0", "break-words");
    expect(nombres).not.toHaveClass(...SIN_RECORTE);
    for (const n of nombres.querySelectorAll("span")) expect(n).not.toHaveClass(...SIN_RECORTE);
    expect(within(wr).getAllByRole("img", { name: /^Ícono de / })).toHaveLength(3);
    expect(wr).toHaveTextContent("2 V – 1 D · 3 partidas");
    expect(within(wr).getByText("66,7 %")).toBeInTheDocument();
  });
});

describe("Mejor y peor jugador de la semana", () => {
  it("usan el mismo bloque que los de hoy: campeón, K/D/A, KDA, daño, modo, fecha y resultado", () => {
    renderDestacados(crearDestacados());
    const m = tarjeta("Mejor jugador de la semana");
    expect(within(m).getByText("Charco")).toBeInTheDocument();
    expect(m).toHaveTextContent("Ahri · 15 / 1 / 9");
    expect(within(m).getByText("KDA 24")).toHaveClass("text-victoria");
    expect(within(m).getByText("Daño: 41.200")).toHaveClass("text-victoria");
    expect(m).toHaveTextContent("Clasificatoria Solo/Dúo");
    expect(within(m).getByText(haceCuanto(AHORA - 3 * 24 * 3600 * 1000, AHORA))).toBeInTheDocument();
    expect(within(m).getByText("Victoria")).toBeInTheDocument();
    expect(within(m).getByAltText("Ahri")).toHaveAttribute(
      "src",
      "https://ddragon.leagueoflegends.com/cdn/16.1.1/img/champion/Ahri.png",
    );

    const p = tarjeta("Peor jugador de la semana");
    expect(within(p).getByText("Sapito")).toBeInTheDocument();
    expect(p).toHaveTextContent("Ashe · 1 / 9 / 2");
    expect(within(p).getByText("KDA 0,33")).toHaveClass("text-derrota");
    expect(within(p).getByText("Daño: 6.050")).toHaveClass("text-derrota");
    expect(p).toHaveTextContent("Normal (Selección oculta)");
    expect(within(p).getByText("Derrota")).toBeInTheDocument();
  });

  it("sin datos dicen que no hay partidas en equipo esta semana", () => {
    renderDestacados(crearDestacados({ mejor_jugador_semana: null, peor_jugador_semana: undefined }));
    for (const titulo of ["Mejor jugador de la semana", "Peor jugador de la semana"]) {
      esperarVacioSemana(titulo);
      expect(tarjeta(titulo)).not.toHaveTextContent("12:00");
    }
  });
});

describe("Destacados con lol.json viejo", () => {
  const HORA = 3600 * 1000;
  const TITULOS_HOY = ["Mejor jugador de la partida - Hoy", "Balance del grupo hoy", "Peor jugador de la partida - Hoy"];

  it("si el día de los datos ya terminó (hoy_desde de hace 25 h), las 3 tarjetas de hoy quedan vacías", () => {
    renderDestacados(crearDestacados({ hoy_desde: AHORA - 25 * HORA }));
    for (const titulo of TITULOS_HOY) {
      const t = tarjeta(titulo);
      expect(t).toHaveTextContent(new RegExp(`^${titulo}No hay partidas en grupo registradas hoySe reinicia a las 12:00$`));
      expect(within(t).queryByText("Sapito")).toBeNull();
      expect(within(t).queryByRole("img")).toBeNull();
    }
    // El resto de las tarjetas (semana) se mantiene, incluidos los jugadores de la semana.
    expect(within(tarjeta("Más partidas")).getByText("20")).toBeInTheDocument();
    expect(tarjeta("Mejor jugador de la semana")).toHaveTextContent("Ahri · 15 / 1 / 9");
    expect(tarjeta("Peor jugador de la semana")).toHaveTextContent("Ashe · 1 / 9 / 2");
  });

  it("con hoy_desde reciente muestra mejor y peor jugador y el balance", () => {
    renderDestacados(crearDestacados({ hoy_desde: AHORA - 23 * HORA }));
    expect(within(tarjeta("Balance del grupo hoy")).getByText("4 V")).toBeInTheDocument();
    for (const titulo of [TITULOS_HOY[0], TITULOS_HOY[2]]) {
      expect(within(tarjeta(titulo)).queryByText("No hay partidas en grupo registradas hoy")).toBeNull();
      expect(within(tarjeta(titulo)).getByText(/^KDA /)).toBeInTheDocument();
    }
  });

  it("sin hoy_desde (archivos viejos) muestra lo que venga", () => {
    renderDestacados(crearDestacados({ hoy_desde: null }));
    expect(within(tarjeta("Balance del grupo hoy")).getByText("2 D")).toBeInTheDocument();
    for (const titulo of [TITULOS_HOY[0], TITULOS_HOY[2]]) {
      expect(within(tarjeta(titulo)).getByText(/^KDA /)).toBeInTheDocument();
    }
  });
});
