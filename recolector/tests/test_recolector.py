"""Prueba de punta a punta con la API simulada: de las respuestas de Riot a lol.json."""

import json
from datetime import UTC, datetime

import pytest
import responses
from conftest import KEY_FALSA, cuenta, invocador, liga, partida, partida_activa, puuid_de

from lolsapo.__main__ import main
from lolsapo.config import Amigo
from lolsapo.recolector import SecretoEnSalida, ejecutar
from lolsapo.riot_api import URL_PLATAFORMA, URL_REGION, ErrorAutenticacion

AHORA = datetime(2026, 10, 1, 20, 0, tzinfo=UTC)
JOHN = Amigo("Johnadis", "LAS")
GATO = Amigo("Big Gato", "LAS")
P_JOHN = puuid_de("Johnadis")
P_GATO = puuid_de("Big Gato")


def simular_amigo(nombre, puuid, ids, *, jugando=None, ligas=(), tag="LAS"):
    from urllib.parse import quote

    responses.get(
        f"{URL_REGION}/riot/account/v1/accounts/by-riot-id/{quote(nombre, safe='')}/{tag}",
        json=cuenta(nombre, tag),
    )
    responses.get(
        f"{URL_PLATAFORMA}/lol/summoner/v4/summoners/by-puuid/{puuid}", json=invocador(puuid)
    )
    responses.get(f"{URL_PLATAFORMA}/lol/league/v4/entries/by-puuid/{puuid}", json=list(ligas))
    responses.get(
        f"{URL_PLATAFORMA}/lol/spectator/v5/active-games/by-summoner/{puuid}",
        json=jugando,
        status=200 if jugando else 404,
    )
    responses.get(f"{URL_REGION}/lol/match/v5/matches/by-puuid/{puuid}/ids", json=list(ids))


def simular_partida(id_partida, puuid, **kwargs):
    responses.get(
        f"{URL_REGION}/lol/match/v5/matches/{id_partida}", json=partida(id_partida, puuid, **kwargs)
    )


def llamadas_a(fragmento: str) -> int:
    return sum(fragmento in llamada.request.url for llamada in responses.calls)


@responses.activate
def test_genera_lol_json_completo(cliente, mapa, tmp_path):
    simular_amigo(
        "Johnadis",
        P_JOHN,
        ["LA2_3", "LA2_2", "LA2_1"],
        jugando=partida_activa(P_JOHN, 450),
        ligas=[liga()],
    )
    simular_partida("LA2_3", P_JOHN, queue_id=420, win=True, fin=3_000)
    simular_partida("LA2_2", P_JOHN, queue_id=450, win=False, fin=2_000)
    simular_partida("LA2_1", P_JOHN, queue_id=2400, win=True, fin=1_000)

    salida_ruta = tmp_path / "salida" / "lol.json"
    ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path / "datos", salida_ruta, ahora=AHORA)

    salida = json.loads(salida_ruta.read_text(encoding="utf-8"))
    assert salida["version"] == 1
    assert salida["actualizado"] == "2026-10-01T20:00:00Z"
    john = salida["amigos"][0]
    assert john["estado"] == "ok"
    assert john["perfil"] == {"icono": 29, "nivel": 150}
    assert john["rangos"]["solo"]["tier"] == "GOLD"
    assert john["jugando"]["modo"] == "ARAM"
    assert [p["id"] for p in john["partidas"]] == ["LA2_3", "LA2_2", "LA2_1"]
    assert john["partidas"][2]["modo"] == "ARAM Caos"
    assert john["estadisticas"]["total"]["victorias"] == 2
    assert john["estadisticas"]["por_categoria"]["aram"]["partidas"] == 2
    assert salida["ranking"][0]["slug"] == "johnadis-las"
    # El PUUID queda guardado en el registro local, no se publica en lol.json.
    registro = json.loads(
        (tmp_path / "datos" / "registro" / "johnadis-las.json").read_text("utf-8")
    )
    assert registro["puuid"] == P_JOHN
    assert P_JOHN not in salida_ruta.read_text(encoding="utf-8")


@responses.activate
def test_incluye_data_dragon_solo_con_lo_usado(cliente, mapa, tmp_path):
    simular_amigo("Johnadis", P_JOHN, ["LA2_1"], jugando=partida_activa(P_JOHN, 450, 62))
    simular_partida("LA2_1", P_JOHN)
    ddragon = {
        "version": "16.19.1",
        "campeones": {str(i): {"id": f"C{i}", "nombre": f"C{i}"} for i in (1, 2, 62, 86, 103)},
        "hechizos": {
            "4": {"id": "SummonerFlash", "nombre": "Destello"},
            "3": {"id": "X", "nombre": "X"},
        },
        "items": {"3031": {"nombre": "Filo"}, "1001": {"nombre": "Botas"}},
        "runas": {"8112": {"nombre": "Electrocutar", "icono": "perk-images/a.png"}},
    }
    salida = ejecutar(
        cliente,
        KEY_FALSA,
        [JOHN],
        mapa,
        tmp_path,
        tmp_path / "lol.json",
        ahora=AHORA,
        ddragon=ddragon,
    )
    assert salida["ddragon"]["version"] == "16.19.1"
    assert set(salida["ddragon"]["campeones"]) == {"1", "62", "86", "103"}  # sin el 2
    assert set(salida["ddragon"]["hechizos"]) == {"4"}
    assert set(salida["ddragon"]["items"]) == {"3031"}
    assert set(salida["ddragon"]["runas"]) == {"8112"}


@responses.activate
def test_dos_amigos_en_la_misma_partida_en_vivo(cliente, mapa, tmp_path):
    en_vivo = partida_activa(P_JOHN, 450, 103, id_partida=99, companeros=(P_GATO,))
    simular_amigo("Johnadis", P_JOHN, [], jugando=en_vivo)
    simular_amigo("Big Gato", P_GATO, [], jugando=en_vivo)

    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN, GATO], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )

    assert len(salida["en_vivo"]) == 1  # una sola partida, aunque haya dos amigos
    partida_vivo = salida["en_vivo"][0]
    assert partida_vivo["id"] == 99
    assert partida_vivo["modo"] == "ARAM"
    assert partida_vivo["amigos"] == ["big-gato-las", "johnadis-las"]
    azul, rojo = partida_vivo["equipos"]
    assert azul["equipo"] == 100
    assert [j["amigo"] for j in azul["jugadores"]] == ["johnadis-las", "big-gato-las"]
    assert rojo["jugadores"][1] == {"campeon_id": 1, "equipo": 200, "nombre": None, "amigo": None}
    assert [a["jugando"]["partida_id"] for a in salida["amigos"]] == [99, 99]


@responses.activate
def test_partidas_marcan_a_los_amigos_y_no_publican_puuid(cliente, mapa, tmp_path):
    simular_amigo("Johnadis", P_JOHN, ["LA2_1"])
    simular_amigo("Big Gato", P_GATO, [])
    simular_partida("LA2_1", P_JOHN, companeros=(P_GATO,))

    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN, GATO], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )

    participantes = salida["amigos"][0]["partidas"][0]["participantes"]
    assert [p["amigo"] for p in participantes] == ["johnadis-las", None, "big-gato-las", None, None]
    assert all("puuid" not in p for p in participantes)
    texto = (tmp_path / "lol.json").read_text(encoding="utf-8")
    for puuid in (P_JOHN, P_GATO, "aliado".ljust(78, "a"), "rival1".ljust(78, "r")):
        assert puuid not in texto
    # El registro local sí guarda los PUUID (para reconocer amigos en ejecuciones futuras).
    registro = (tmp_path / "registro" / "johnadis-las.json").read_text(encoding="utf-8")
    assert P_GATO in registro


@responses.activate
def test_segunda_ejecucion_solo_descarga_partidas_nuevas(cliente, mapa, tmp_path):
    simular_amigo("Johnadis", P_JOHN, ["LA2_2", "LA2_1"])
    simular_partida("LA2_2", P_JOHN, fin=2_000)
    simular_partida("LA2_1", P_JOHN, fin=1_000)
    ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA)
    assert llamadas_a("/matches/LA2_") == 2

    responses.calls.reset()
    responses.replace(
        responses.GET,
        f"{URL_REGION}/lol/match/v5/matches/by-puuid/{P_JOHN}/ids",
        json=["LA2_3", "LA2_2", "LA2_1"],
    )
    simular_partida("LA2_3", P_JOHN, fin=3_000)
    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )

    assert llamadas_a("/matches/LA2_") == 1  # solo LA2_3
    assert llamadas_a("/by-riot-id/") == 0  # el PUUID ya estaba guardado
    assert salida["amigos"][0]["estadisticas"]["total"]["partidas"] == 3


@responses.activate
def test_un_amigo_con_error_no_rompe_a_los_demas(cliente, mapa, tmp_path):
    simular_amigo("Johnadis", P_JOHN, [])
    responses.get(f"{URL_REGION}/riot/account/v1/accounts/by-riot-id/Big%20Gato/LAS", status=404)

    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN, GATO], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )

    estados = {a["riot_id"]: a["estado"] for a in salida["amigos"]}
    assert estados == {"Johnadis#LAS": "ok", "Big Gato#LAS": "error"}
    gato = salida["amigos"][1]
    assert gato["error"] and gato["perfil"] is None and gato["partidas"] == []
    assert gato["estadisticas"]["total"]["partidas"] == 0


@responses.activate
def test_con_error_se_muestran_los_ultimos_datos_conocidos(cliente, mapa, tmp_path):
    simular_amigo("Johnadis", P_JOHN, ["LA2_1"])
    simular_partida("LA2_1", P_JOHN)
    ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA)

    responses.replace(
        responses.GET, f"{URL_PLATAFORMA}/lol/summoner/v4/summoners/by-puuid/{P_JOHN}", status=503
    )
    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )

    john = salida["amigos"][0]
    assert john["estado"] == "error"
    assert john["perfil"] == {"icono": 29, "nivel": 150}
    assert len(john["partidas"]) == 1


@responses.activate
def test_puuid_de_otra_key_se_vuelve_a_pedir(cliente, mapa, tmp_path):
    viejo = "viejo".ljust(78, "v")
    registro = tmp_path / "registro" / "johnadis-las.json"
    registro.parent.mkdir(parents=True)
    registro.write_text(
        json.dumps(
            {
                "version": 1,
                "riot_id": "Johnadis#LAS",
                "puuid": viejo,
                "seguimiento_desde": 0,
                "perfil": None,
                "rangos": None,
                "partidas": {},
            }
        ),
        encoding="utf-8",
    )
    responses.get(f"{URL_PLATAFORMA}/lol/summoner/v4/summoners/by-puuid/{viejo}", status=400)
    simular_amigo("Johnadis", P_JOHN, [])

    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )

    assert salida["amigos"][0]["estado"] == "ok"
    assert json.loads(registro.read_text("utf-8"))["puuid"] == P_JOHN


@responses.activate
def test_partida_con_datos_invalidos_se_omite(cliente, mapa, tmp_path):
    simular_amigo("Johnadis", P_JOHN, ["LA2_2", "LA2_1"])
    simular_partida("LA2_2", P_JOHN)
    rota = partida("LA2_1", P_JOHN, campeon="<img onerror=x>")
    responses.get(f"{URL_REGION}/lol/match/v5/matches/LA2_1", json=rota)

    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )

    assert [p["id"] for p in salida["amigos"][0]["partidas"]] == ["LA2_2"]


@responses.activate
def test_key_rechazada_detiene_todo_sin_escribir_salida(cliente, mapa, tmp_path):
    responses.get(f"{URL_REGION}/riot/account/v1/accounts/by-riot-id/Johnadis/LAS", status=401)
    with pytest.raises(ErrorAutenticacion):
        ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA)
    assert not (tmp_path / "lol.json").exists()


@responses.activate
def test_la_key_nunca_llega_a_la_salida(cliente, mapa, tmp_path):
    simular_amigo("Johnadis", P_JOHN, ["LA2_1"])
    simular_partida("LA2_1", P_JOHN)
    ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path / "datos", tmp_path / "lol.json", ahora=AHORA
    )

    for archivo in tmp_path.rglob("*.json"):
        assert KEY_FALSA not in archivo.read_text(encoding="utf-8"), archivo


@responses.activate
def test_si_la_key_aparece_en_los_datos_no_se_escribe_nada(cliente, mapa, tmp_path, monkeypatch):
    simular_amigo("Johnadis", P_JOHN, [])
    monkeypatch.setattr("lolsapo.recolector.calcular_ranking", lambda _: [{"x": KEY_FALSA}])
    with pytest.raises(SecretoEnSalida):
        ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA)
    assert not (tmp_path / "lol.json").exists()


@responses.activate
def test_ids_invalidos_marcan_error_solo_a_ese_amigo(cliente, mapa, tmp_path):
    simular_amigo("Johnadis", P_JOHN, ["LA2_1", None])
    simular_amigo("Big Gato", P_GATO, [])
    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN, GATO], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )
    assert [a["estado"] for a in salida["amigos"]] == ["error", "ok"]
    assert llamadas_a("/matches/LA2_") == 0


@responses.activate
def test_respuesta_con_forma_inesperada_no_rompe_la_ejecucion(cliente, mapa, tmp_path):
    simular_amigo("Johnadis", P_JOHN, [])
    responses.replace(
        responses.GET,
        f"{URL_PLATAFORMA}/lol/summoner/v4/summoners/by-puuid/{P_JOHN}",
        json=["no", "es", "un", "objeto"],
    )
    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )
    assert salida["amigos"][0]["estado"] == "error"


@responses.activate
def test_registro_danado_marca_error_y_no_se_pisa(cliente, mapa, tmp_path):
    ruta = tmp_path / "registro" / "johnadis-las.json"
    ruta.parent.mkdir(parents=True)
    ruta.write_text("{roto", encoding="utf-8")
    simular_amigo("Big Gato", P_GATO, [])

    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN, GATO], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )

    assert [a["estado"] for a in salida["amigos"]] == ["error", "ok"]
    assert ruta.read_text(encoding="utf-8") == "{roto"
    assert llamadas_a("Johnadis") == 0


@responses.activate
def test_cualquier_key_de_riot_en_la_salida_bloquea_la_escritura(
    cliente, mapa, tmp_path, monkeypatch
):
    otra_key = "rgapi-" + "-".join(["1" * 8, "2" * 4, "3" * 4, "4" * 4, "5" * 12])
    simular_amigo("Johnadis", P_JOHN, [])
    monkeypatch.setattr("lolsapo.recolector.calcular_ranking", lambda _: [{"x": otra_key}])
    with pytest.raises(SecretoEnSalida):
        ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA)
    assert not (tmp_path / "lol.json").exists()


def test_main_sin_key_termina_con_error_de_configuracion(monkeypatch, tmp_path, caplog):
    monkeypatch.setenv("RIOT_API_KEY", "")
    monkeypatch.setattr("lolsapo.__main__.RUTA_ENV", tmp_path / "no-existe.env")
    assert main(["--datos", str(tmp_path), "--salida", str(tmp_path / "lol.json")]) == 1
    assert "Falta RIOT_API_KEY" in caplog.text


def test_main_rechaza_cantidad_fuera_de_rango():
    with pytest.raises(SystemExit):
        main(["--cantidad", "500"])
