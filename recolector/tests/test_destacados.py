"""Destacados de los últimos 7 días (datos inventados, sin red)."""

import json

import pytest
import responses
from conftest import KEY_FALSA
from test_recolector import AHORA, JOHN, P_JOHN, simular_amigo, simular_partida

from lolsapo.destacados import VENTANA_MS, calcular_destacados, kda
from lolsapo.recolector import ejecutar

AHORA_MS = int(AHORA.timestamp() * 1000)
HORA = 60 * 60 * 1000


def p(id_p, horas_atras, resultado="victoria", k=5, d=5, a=5, queue_id=420, campeon_id=103):
    return {
        "id": id_p,
        "fecha": AHORA_MS - horas_atras * HORA,
        "queue_id": queue_id,
        "campeon": "Ahri",
        "campeon_id": campeon_id,
        "resultado": resultado,
        "asesinatos": k,
        "muertes": d,
        "asistencias": a,
    }


def serie(prefijo, resultados, **kwargs):
    """Partidas de una hora en una hora, la primera de la lista es la más antigua."""
    total = len(resultados)
    return [p(f"{prefijo}{i}", total - i, r, **kwargs) for i, r in enumerate(resultados)]


def test_kda_sin_muertes_divide_por_uno():
    assert kda(14, 0, 15) == 29.0
    assert kda(1, 12, 3) == 0.33


def test_solo_cuentan_normal_y_ranked_de_los_ultimos_7_dias(mapa):
    partidas = [
        p("ok-solo", 1, queue_id=420),
        p("ok-flex", 2, queue_id=440),
        p("ok-normal", 3, queue_id=400),
        p("aram", 4, queue_id=450),
        p("aram-caos", 5, queue_id=2400),
        p("arena", 6, queue_id=1750),
        p("remake", 7, resultado="remake"),
        p("vieja", VENTANA_MS // HORA + 1),
    ]
    destacados = calcular_destacados({"a": partidas}, mapa, AHORA_MS)
    assert destacados["dias"] == 7
    assert destacados["mas_partidas"] == {"amigos": ["a"], "partidas": 3}


def test_winrate_exige_5_partidas(mapa):
    datos = {
        "pocas": serie("x", ["victoria"] * 4, k=20, d=0, a=20),
        "suficientes": serie("y", ["victoria", "derrota"] * 3, k=3, d=3, a=3),
    }
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    assert destacados["mejor_winrate"]["amigos"] == ["suficientes"]
    # La mejor partida no exige mínimo: es una sola partida.
    assert destacados["mejor_partida"]["amigos"] == ["pocas"]


def test_mejor_partida(mapa):
    datos = {
        "a": [p("a1", 2, k=10, d=2, a=5), p("a2", 3, "derrota", k=14, d=0, a=15, campeon_id=157)],
        "b": [p("b1", 1, k=8, d=1, a=10), p("b2", 4, queue_id=450, k=30, d=0, a=30)],  # ARAM: fuera
    }
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    mejor = destacados["mejor_partida"]
    assert mejor["amigos"] == ["a"]
    assert mejor["partida_id"] == "a2"
    assert (mejor["asesinatos"], mejor["muertes"], mejor["asistencias"]) == (14, 0, 15)
    assert mejor["kda"] == 29.0
    assert mejor["resultado"] == "derrota"  # el resultado no influye
    assert "mejor_kda" not in destacados


def test_mejor_partida_desempata_por_mas_asesinatos_y_asistencias(mapa):
    datos = {"a": [p("a1", 2, k=4, d=0, a=4)], "b": [p("b1", 1, k=2, d=1, a=6)]}
    # KDA 8 en las dos: gana la de más asesinatos + asistencias (8 vs 8) y luego menos muertes.
    assert calcular_destacados(datos, mapa, AHORA_MS)["mejor_partida"]["amigos"] == ["a"]


def test_mejor_winrate_con_sus_totales(mapa):
    datos = {
        "bueno": serie("b", ["victoria"] * 5),
        "malo": serie("m", ["derrota"] * 5),
    }
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    assert "peor_kda" not in destacados
    assert destacados["mejor_winrate"] == {
        "amigos": ["bueno"],
        "winrate": 100.0,
        "victorias": 5,
        "derrotas": 0,
        "partidas": 5,
    }


def test_racha_con_empate_muestra_a_todos(mapa):
    juntos = ["derrota", "victoria", "victoria", "victoria", "derrota"]
    datos = {
        "ana": serie("a", juntos),
        "beto": serie("b", juntos),
        "carla": serie("c", juntos),
        "dani": serie("d", ["victoria", "victoria", "derrota"]),
    }
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    assert destacados["racha_victorias"] == {"amigos": ["ana", "beto", "carla"], "racha": 3}


def test_racha_de_derrotas_con_empate_muestra_a_todos(mapa):
    juntos = ["victoria", "derrota", "derrota", "derrota", "derrota", "victoria"]
    datos = {
        "ana": serie("a", juntos),
        "beto": serie("b", juntos),
        "carla": serie("c", ["derrota", "derrota", "victoria"]),
    }
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    assert destacados["racha_derrotas"] == {"amigos": ["ana", "beto"], "racha": 4}
    assert destacados["racha_victorias"] is None  # nadie con 2 victorias seguidas


def test_racha_de_una_victoria_no_cuenta(mapa):
    datos = {"a": serie("a", ["victoria", "derrota", "victoria"])}
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    assert destacados["racha_victorias"] is None
    assert destacados["racha_derrotas"] is None


def test_empate_en_winrate_gana_quien_jugo_mas(mapa):
    datos = {
        "cinco": serie("c", ["victoria"] * 5),
        "seis": serie("s", ["victoria"] * 6),
    }
    assert calcular_destacados(datos, mapa, AHORA_MS)["mejor_winrate"]["amigos"] == ["seis"]


def test_mas_partidas_cuenta_todo_y_el_resto_solo_las_ultimas_7(mapa):
    # 10 partidas: 3 derrotas antiguas con KDA horrible y luego 7 victorias.
    partidas = serie("x", ["derrota"] * 3 + ["victoria"] * 7, k=5, d=1, a=5)
    for vieja in partidas[:3]:
        vieja.update(asesinatos=0, muertes=20, asistencias=0)
    destacados = calcular_destacados({"a": partidas}, mapa, AHORA_MS)
    assert destacados["ultimas_partidas"] == 7
    assert destacados["mas_partidas"]["partidas"] == 10
    assert destacados["mejor_winrate"]["partidas"] == 7
    assert destacados["mejor_winrate"]["winrate"] == 100.0
    assert destacados["mejor_partida"]["kda"] == 10.0
    assert destacados["racha_victorias"]["racha"] == 7
    # Las 3 derrotas seguidas quedaron fuera de las últimas 7.
    assert destacados["racha_derrotas"] is None
    # La peor partida sale de las últimas 7 (las 0/20/0 antiguas no cuentan).
    assert destacados["peor_partida"]["muertes"] == 1


def test_peor_partida(mapa):
    datos = {
        "a": [p("a1", 2, k=10, d=2, a=5), p("a2", 3, "derrota", k=1, d=12, a=3, campeon_id=157)],
        "b": [p("b1", 1, k=2, d=4, a=2), p("b2", 4, queue_id=450, k=0, d=20, a=0)],  # ARAM: fuera
    }
    peor = calcular_destacados(datos, mapa, AHORA_MS)["peor_partida"]
    assert peor["amigos"] == ["a"]
    assert peor["partida_id"] == "a2"
    assert (peor["asesinatos"], peor["muertes"], peor["asistencias"]) == (1, 12, 3)
    assert peor["kda"] == 0.33
    assert peor["campeon_id"] == 157
    assert peor["modo"] == "Clasificatoria Solo/Dúo"
    assert peor["resultado"] == "derrota"


def test_sin_partidas_todo_vacio(mapa):
    destacados = calcular_destacados({"a": [], "b": [p("aram", 1, queue_id=450)]}, mapa, AHORA_MS)
    for clave in (
        "mas_partidas",
        "mejor_winrate",
        "mejor_partida",
        "racha_victorias",
        "racha_derrotas",
        "peor_partida",
    ):
        assert destacados[clave] is None


@pytest.mark.parametrize("dato_roto", [{"fecha": None}, {}])
def test_partidas_sin_fecha_se_ignoran(mapa, dato_roto):
    partida = p("x", 1) | dato_roto
    if "fecha" not in dato_roto:
        partida.pop("fecha")
    destacados = calcular_destacados({"a": [partida]}, mapa, AHORA_MS)
    assert destacados["mas_partidas"] is None


@responses.activate
def test_lol_json_incluye_destacados_sin_puuid(cliente, mapa, tmp_path):
    ids = [f"LA2_{i}" for i in range(6, 0, -1)]
    simular_amigo("Johnadis", P_JOHN, ids)
    for i, id_p in enumerate(ids):
        simular_partida(id_p, P_JOHN, queue_id=420, win=i != 0, fin=AHORA_MS - (i + 1) * HORA)
    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )
    destacados = salida["destacados"]
    assert destacados["mas_partidas"] == {"amigos": ["johnadis-las"], "partidas": 6}
    assert destacados["racha_victorias"] == {"amigos": ["johnadis-las"], "racha": 5}
    assert destacados["peor_partida"]["amigos"] == ["johnadis-las"]
    # El campeón de la peor partida queda disponible para su imagen.
    texto = (tmp_path / "lol.json").read_text(encoding="utf-8")
    assert P_JOHN not in texto
    assert json.loads(texto)["destacados"] == destacados
