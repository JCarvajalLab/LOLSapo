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
    assert mejor["danio"] is None  # partida guardada sin daño (antes de agregarlo)
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


def grupal(partidas, *amigos, rival=()):
    """Marca las partidas como jugadas con `amigos` en el mismo equipo (y `rival` enfrente)."""
    for partida in partidas:
        partida["equipo"] = 100
        partida["participantes"] = (
            [{"amigo": a, "equipo": 100} for a in amigos]
            + [{"amigo": r, "equipo": 200} for r in rival]
            + [{"amigo": None, "equipo": 100}]
        )
    return partidas


def juego(id_p, horas_atras, resultado, *amigos, rival=()):
    """Una partida en la que jugaron `amigos` en el mismo equipo (y `rival` enfrente)."""
    return grupal([p(id_p, horas_atras, resultado)], *amigos, rival=rival)[0]


def rachas(partidas, mapa, amigos=("nic", "iskrat", "john", "gato", "gral")):
    """Reparte las partidas en el registro de su primer amigo (el resto no las tiene)."""
    datos = {a: [] for a in amigos}
    for partida in partidas:
        primero = next(x["amigo"] for x in partida["participantes"] if x["amigo"] in datos)
        datos[primero].append(partida)
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    return destacados["racha_victorias_grupo"], destacados["racha_derrotas_grupo"]


def test_racha_de_derrotas_del_ejemplo_de_deo(mapa):
    # 4 derrotas de Nicø, ISkrat y Johnadis; luego ISkrat y Johnadis ganan sin Nicø.
    trio = ("nic", "iskrat", "john")
    partidas = [
        juego("d1", 10, "derrota", *trio),
        juego("d2", 9, "derrota", *trio),
        juego("d3", 8, "derrota", *trio),
        juego("d4", 7, "derrota", *trio),
        juego("v1", 6, "victoria", "iskrat", "john"),
        juego("d5", 5, "derrota", *trio),
    ]
    _, derrotas = rachas(partidas, mapa)
    assert derrotas["racha"] == 4
    assert derrotas["amigos"] == ["iskrat", "john", "nic"]
    assert derrotas["partidas"] == {"nic": 4, "iskrat": 4, "john": 4}


def test_quien_se_suma_en_la_ultima_partida_aparece_con_1(mapa):
    partidas = [
        juego("v1", 3, "victoria", "nic", "iskrat"),
        juego("v2", 2, "victoria", "nic", "iskrat"),
        juego("v3", 1, "victoria", "nic", "iskrat", "gato"),
    ]
    victorias, _ = rachas(partidas, mapa)
    assert victorias["racha"] == 3
    assert victorias["amigos"] == ["iskrat", "nic", "gato"]  # primero los que jugaron más
    assert victorias["partidas"] == {"nic": 3, "iskrat": 3, "gato": 1}
    assert victorias["desde"] < victorias["hasta"]


def test_partidas_en_solitario_no_cuentan_ni_cortan(mapa):
    partidas = [
        juego("v1", 4, "victoria", "nic", "iskrat"),
        juego("solo", 3, "derrota", "nic"),  # Nicø solo: no es partida en grupo
        juego("v2", 2, "victoria", "nic", "iskrat"),
    ]
    victorias, derrotas = rachas(partidas, mapa)
    assert victorias["racha"] == 2
    assert derrotas is None


def test_racha_en_solitario_queda_sin_datos(mapa):
    # El caso de Big Gato: 2 victorias seguidas, pero sin nadie del grupo.
    partidas = [juego("v1", 2, "victoria", "gato"), juego("v2", 1, "victoria", "gato")]
    assert rachas(partidas, mapa) == (None, None)


def test_otro_grupo_sin_nadie_en_comun_corta_la_racha(mapa):
    partidas = [
        juego("v1", 2, "victoria", "nic", "iskrat"),
        juego("v2", 1, "victoria", "john", "gato"),
    ]
    assert rachas(partidas, mapa) == (None, None)


def test_un_amigo_en_el_equipo_rival_no_hace_partida_en_grupo(mapa):
    partidas = [juego(f"v{i}", i, "victoria", "nic", rival=("iskrat",)) for i in (1, 2)]
    assert rachas(partidas, mapa) == (None, None)


def test_la_misma_partida_en_varios_registros_cuenta_una_vez(mapa):
    partidas = [
        juego("v1", 2, "victoria", "nic", "john"),
        juego("v2", 1, "victoria", "nic", "john"),
    ]
    datos = {"nic": partidas, "john": [dict(x) for x in partidas]}
    victorias = calcular_destacados(datos, mapa, AHORA_MS)["racha_victorias_grupo"]
    assert victorias["racha"] == 2
    assert victorias["partidas"] == {"nic": 2, "john": 2}


def test_amigos_que_ya_no_estan_en_la_lista_no_cuentan(mapa):
    # Con un ex amigo, el equipo queda con un solo amigo actual: no es partida en grupo.
    partidas = [juego(f"v{i}", i, "victoria", "nic", "ex-amigo") for i in (1, 2)]
    assert rachas(partidas, mapa) == (None, None)


def test_con_empate_de_largo_gana_la_racha_mas_reciente(mapa):
    partidas = [
        juego("a1", 6, "victoria", "nic", "iskrat"),
        juego("a2", 5, "victoria", "nic", "iskrat"),
        juego("x", 4, "derrota", "nic", "iskrat"),
        juego("b1", 2, "victoria", "john", "gato"),
        juego("b2", 1, "victoria", "john", "gato"),
    ]
    victorias, _ = rachas(partidas, mapa)
    assert victorias["amigos"] == ["gato", "john"]


def test_racha_de_una_partida_no_cuenta(mapa):
    partidas = [
        juego("v1", 3, "victoria", "nic", "iskrat"),
        juego("d1", 2, "derrota", "nic", "iskrat"),
        juego("v2", 1, "victoria", "nic", "iskrat"),
    ]
    assert rachas(partidas, mapa) == (None, None)


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
    assert "racha_victorias" not in destacados
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
        "racha_victorias_grupo",
        "racha_derrotas_grupo",
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
    # Johnadis jugó sin nadie del grupo: no hay racha en grupo.
    assert destacados["racha_victorias_grupo"] is None
    assert destacados["peor_partida"]["amigos"] == ["johnadis-las"]
    assert destacados["peor_partida"]["danio"] == 21_345
    # El campeón de la peor partida queda disponible para su imagen.
    texto = (tmp_path / "lol.json").read_text(encoding="utf-8")
    assert P_JOHN not in texto
    assert json.loads(texto)["destacados"] == destacados
