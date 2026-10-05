"""Sinergia del grupo: con quién gana más cada amigo (datos inventados, sin red)."""

import json

import responses
from conftest import KEY_FALSA
from test_destacados import AHORA_MS, HORA, grupal, juego, p
from test_recolector import AHORA, GATO, JOHN, P_GATO, P_JOHN, simular_amigo, simular_partida

from lolsapo.recolector import ejecutar
from lolsapo.sinergia import calcular_sinergia


def repartir(partidas, amigos=("nic", "iskrat", "john", "gato")):
    """Cada partida queda solo en el registro de su primer amigo (como pasa en la práctica)."""
    datos = {a: [] for a in amigos}
    for partida in partidas:
        primero = next(x["amigo"] for x in partida["participantes"] if x["amigo"] in datos)
        datos[primero].append(partida)
    return datos


def test_con_quien_gana_mas_cada_amigo(mapa):
    partidas = [
        juego("g1", 5, "victoria", "nic", "iskrat"),
        juego("g2", 4, "derrota", "nic", "iskrat"),
        juego("g3", 3, "victoria", "nic", "iskrat", "john"),
        juego("g4", 2, "victoria", "nic", "gato"),
    ]
    sinergia = calcular_sinergia(repartir(partidas), mapa)
    assert sinergia["nic"] == [
        {"amigo": "iskrat", "partidas": 3, "victorias": 2, "derrotas": 1, "winrate": 66.7},
        {"amigo": "gato", "partidas": 1, "victorias": 1, "derrotas": 0, "winrate": 100.0},
        {"amigo": "john", "partidas": 1, "victorias": 1, "derrotas": 0, "winrate": 100.0},
    ]
    # Es simétrica: la misma partida cuenta para los dos.
    assert sinergia["iskrat"][0] == {
        "amigo": "nic",
        "partidas": 3,
        "victorias": 2,
        "derrotas": 1,
        "winrate": 66.7,
    }
    assert sinergia["john"] == [
        {"amigo": "iskrat", "partidas": 1, "victorias": 1, "derrotas": 0, "winrate": 100.0},
        {"amigo": "nic", "partidas": 1, "victorias": 1, "derrotas": 0, "winrate": 100.0},
    ]


def test_solo_normal_y_ranked_sin_remakes_y_todo_el_registro(mapa):
    partidas = [
        juego("vieja", 24 * 60, "victoria", "nic", "iskrat"),  # hace 60 días: cuenta
        grupal([p("aram", 3, queue_id=450)], "nic", "iskrat")[0],
        grupal([p("arena", 2, queue_id=1750)], "nic", "iskrat")[0],
        grupal([p("remake", 1, resultado="remake")], "nic", "iskrat")[0],
        grupal([p("flex", 1, queue_id=440)], "nic", "iskrat")[0],
    ]
    sinergia = calcular_sinergia(repartir(partidas), mapa)
    assert sinergia["nic"] == [
        {"amigo": "iskrat", "partidas": 2, "victorias": 2, "derrotas": 0, "winrate": 100.0}
    ]


def test_rivales_y_partidas_en_solitario_no_cuentan(mapa):
    partidas = [
        juego("rival", 2, "victoria", "nic", rival=("iskrat",)),
        juego("solo", 1, "victoria", "nic"),
    ]
    sinergia = calcular_sinergia(repartir(partidas), mapa)
    assert sinergia == {"nic": [], "iskrat": [], "john": [], "gato": []}


def test_la_misma_partida_en_dos_registros_cuenta_una_vez(mapa):
    partida = juego("g1", 1, "victoria", "nic", "john")
    datos = {"nic": [partida], "john": [dict(partida)]}
    assert calcular_sinergia(datos, mapa)["nic"][0]["partidas"] == 1


def test_ex_amigos_no_aparecen(mapa):
    partida = juego("g1", 1, "victoria", "nic", "iskrat", "ex-amigo")
    sinergia = calcular_sinergia({"nic": [partida], "iskrat": []}, mapa)
    assert [c["amigo"] for c in sinergia["nic"]] == ["iskrat"]


@responses.activate
def test_lol_json_incluye_la_sinergia_sin_puuid(cliente, mapa, tmp_path):
    ids = ["LA2_2", "LA2_1"]
    simular_amigo("Johnadis", P_JOHN, ids)
    simular_amigo("Big Gato", P_GATO, ids)
    for i, id_p in enumerate(ids):
        simular_partida(id_p, P_JOHN, companeros=(P_GATO,), fin=AHORA_MS - (i + 1) * HORA)
    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN, GATO], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )
    assert salida["sinergia"]["johnadis-las"] == [
        {"amigo": "big-gato-las", "partidas": 2, "victorias": 2, "derrotas": 0, "winrate": 100.0}
    ]
    texto = (tmp_path / "lol.json").read_text(encoding="utf-8")
    assert P_JOHN not in texto and P_GATO not in texto
    assert json.loads(texto)["sinergia"] == salida["sinergia"]
