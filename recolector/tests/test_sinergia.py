"""Sinergia del grupo: con quién gana más cada amigo (datos inventados, sin red)."""

import json
import re

import responses
from conftest import KEY_FALSA
from test_destacados import AHORA_MS, HORA, grupal, juego, p
from test_recolector import AHORA, GATO, JOHN, P_GATO, P_JOHN, simular_amigo, simular_partida

from lolsapo.recolector import ejecutar
from lolsapo.riot_api import URL_REGION
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
    juntos = [
        {"amigo": "big-gato-las", "partidas": 2, "victorias": 2, "derrotas": 0, "winrate": 100.0}
    ]
    assert salida["sinergia"]["todo"]["johnadis-las"] == juntos
    assert salida["sinergia"]["ultimos_30_dias"]["johnadis-las"] == juntos
    texto = (tmp_path / "lol.json").read_text(encoding="utf-8")
    assert P_JOHN not in texto and P_GATO not in texto
    assert json.loads(texto)["sinergia"] == salida["sinergia"]


@responses.activate
def test_si_falla_la_sinergia_los_destacados_siguen(cliente, mapa, tmp_path, monkeypatch, caplog):
    simular_amigo("Johnadis", P_JOHN, [])

    def falla(*_):
        raise KeyError("x")

    monkeypatch.setattr("lolsapo.recolector.calcular_sinergia", falla)
    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )
    assert salida["sinergia"] is None
    assert salida["destacados"] is not None
    assert "No se pudo calcular la sinergia" in caplog.text


def test_desde_ms_limita_el_periodo(mapa):
    partidas = [
        juego("vieja", 24 * 40, "victoria", "nic", "iskrat"),  # hace 40 días
        juego("nueva", 2, "derrota", "nic", "iskrat"),
    ]
    datos = repartir(partidas)
    todo = calcular_sinergia(datos, mapa)
    ultimos_30 = calcular_sinergia(datos, mapa, AHORA_MS - 30 * 24 * HORA)
    assert todo["nic"][0]["partidas"] == 2
    assert ultimos_30["nic"] == [
        {"amigo": "iskrat", "partidas": 1, "victorias": 0, "derrotas": 1, "winrate": 0.0}
    ]


# --- Carga de 30 días hacia atrás (una sola vez) -------------------------------------------


def llamadas_relleno():
    return [c for c in responses.calls if "startTime=" in c.request.url]


@responses.activate
def test_relleno_trae_las_partidas_de_30_dias_de_a_lotes_y_se_marca(cliente, mapa, tmp_path):
    from urllib.parse import parse_qs, urlsplit

    from lolsapo import recolector as modulo

    recientes = ["LA2_100"]
    antiguas = [f"LA2_{i}" for i in range(20, 0, -1)]  # 20 partidas antiguas que faltan

    def ids(request):
        q = parse_qs(urlsplit(request.url).query)
        lista = recientes + antiguas if "startTime" in q else recientes
        return (200, {}, json.dumps(lista))

    simular_amigo("Johnadis", P_JOHN, [])
    url_ids = f"{URL_REGION}/lol/match/v5/matches/by-puuid/{P_JOHN}/ids"
    responses.remove(responses.GET, url_ids)
    responses.add_callback(responses.GET, url_ids, callback=ids)
    for i, id_p in enumerate(recientes + antiguas):
        simular_partida(id_p, P_JOHN, fin=AHORA_MS - (i + 1) * HORA)

    ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA)
    registro = json.loads((tmp_path / "registro" / "johnadis-las.json").read_text("utf-8"))
    # Primera ejecución: la reciente + un lote de 15 antiguas; todavía no termina.
    assert len(registro["partidas"]) == 1 + modulo.LOTE_RELLENO
    assert "relleno_30_dias" not in registro

    ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA)
    registro = json.loads((tmp_path / "registro" / "johnadis-las.json").read_text("utf-8"))
    assert len(registro["partidas"]) == 21
    assert registro["relleno_30_dias"] is True
    # El pedido usa startTime de hace 30 días.
    q = parse_qs(urlsplit(llamadas_relleno()[0].request.url).query)
    assert int(q["startTime"][0]) == AHORA_MS // 1000 - 30 * 24 * 3600

    responses.calls.reset()
    ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA)
    assert llamadas_relleno() == []  # terminado: no se repite


@responses.activate
def test_relleno_pagina_de_a_100(cliente, mapa, tmp_path):
    from urllib.parse import parse_qs, urlsplit

    pedidos = []

    def ids(request):
        q = parse_qs(urlsplit(request.url).query)
        if "startTime" not in q:
            return (200, {}, json.dumps([]))
        inicio = int(q["start"][0])
        pedidos.append(inicio)
        pagina = [f"LA2_{inicio + i}" for i in range(100)] if inicio == 0 else ["LA2_999"]
        return (200, {}, json.dumps(pagina))

    simular_amigo("Johnadis", P_JOHN, [])
    url_ids = f"{URL_REGION}/lol/match/v5/matches/by-puuid/{P_JOHN}/ids"
    responses.remove(responses.GET, url_ids)
    responses.add_callback(responses.GET, url_ids, callback=ids)
    responses.add(
        responses.GET,
        re.compile(rf"{re.escape(URL_REGION)}/lol/match/v5/matches/LA2_\d+$"),
        status=404,
    )
    ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA)
    assert pedidos == [0, 100]


@responses.activate
def test_un_error_en_una_partida_antigua_no_afecta_a_las_nuevas(cliente, mapa, tmp_path):
    from urllib.parse import parse_qs, urlsplit

    def ids(request):
        q = parse_qs(urlsplit(request.url).query)
        lista = ["LA2_100", "LA2_2", "LA2_1"] if "startTime" in q else ["LA2_100"]
        return (200, {}, json.dumps(lista))

    simular_amigo("Johnadis", P_JOHN, [])
    url_ids = f"{URL_REGION}/lol/match/v5/matches/by-puuid/{P_JOHN}/ids"
    responses.remove(responses.GET, url_ids)
    responses.add_callback(responses.GET, url_ids, callback=ids)
    simular_partida("LA2_100", P_JOHN, fin=AHORA_MS - HORA)
    responses.get(f"{URL_REGION}/lol/match/v5/matches/LA2_2", status=404)
    simular_partida("LA2_1", P_JOHN, fin=AHORA_MS - 3 * HORA)

    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )
    assert salida["amigos"][0]["estado"] == "ok"
    registro = json.loads((tmp_path / "registro" / "johnadis-las.json").read_text("utf-8"))
    assert set(registro["partidas"]) == {"LA2_100", "LA2_1"}  # la del 404 se omite
    assert registro["relleno_30_dias"] is True


@responses.activate
def test_si_falla_pedir_los_ids_antiguos_la_actualizacion_normal_sigue(cliente, mapa, tmp_path):
    from urllib.parse import parse_qs, urlsplit

    def ids(request):
        if "startTime" in parse_qs(urlsplit(request.url).query):
            return (503, {}, "")
        return (200, {}, json.dumps(["LA2_100"]))

    simular_amigo("Johnadis", P_JOHN, [])
    url_ids = f"{URL_REGION}/lol/match/v5/matches/by-puuid/{P_JOHN}/ids"
    responses.remove(responses.GET, url_ids)
    responses.add_callback(responses.GET, url_ids, callback=ids)
    simular_partida("LA2_100", P_JOHN, fin=AHORA_MS - HORA)

    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )
    assert salida["amigos"][0]["estado"] == "ok"
    registro = json.loads((tmp_path / "registro" / "johnadis-las.json").read_text("utf-8"))
    assert set(registro["partidas"]) == {"LA2_100"}
    assert "relleno_30_dias" not in registro  # se reintenta en la próxima ejecución


@responses.activate
def test_un_lote_que_falla_entero_da_la_carga_por_terminada(cliente, mapa, tmp_path):
    from urllib.parse import parse_qs, urlsplit

    antiguas = [f"LA2_{i}" for i in range(20, 0, -1)]

    def ids(request):
        q = parse_qs(urlsplit(request.url).query)
        return (200, {}, json.dumps(antiguas if "startTime" in q else []))

    simular_amigo("Johnadis", P_JOHN, [])
    url_ids = f"{URL_REGION}/lol/match/v5/matches/by-puuid/{P_JOHN}/ids"
    responses.remove(responses.GET, url_ids)
    responses.add_callback(responses.GET, url_ids, callback=ids)
    responses.add(
        responses.GET,
        re.compile(rf"{re.escape(URL_REGION)}/lol/match/v5/matches/LA2_\d+$"),
        status=404,
    )
    ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA)
    registro = json.loads((tmp_path / "registro" / "johnadis-las.json").read_text("utf-8"))
    assert registro["relleno_30_dias"] is True
