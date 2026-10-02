"""TFT: validación, Data Dragon y punta a punta con la API simulada (nunca la real)."""

import json
from datetime import UTC, datetime
from urllib.parse import quote

import pytest
import responses
from conftest import KEY_FALSA, cuenta, partida_activa, puuid_de

from lolsapo import ddragon_tft
from lolsapo.__main__ import main
from lolsapo.config import RAIZ, Amigo, ErrorConfiguracion, cargar_api_key_tft
from lolsapo.modos import MapaModos
from lolsapo.recolector import SecretoEnSalida
from lolsapo.riot_api import URL_PLATAFORMA, URL_REGION
from lolsapo.tft import (
    MENSAJE_SIN_ACCESO,
    Espectador,
    calcular_estadisticas_tft,
    calcular_ranking_tft,
    ejecutar_tft,
)
from lolsapo.validacion import DatoInvalido
from lolsapo.validacion_tft import (
    es_partida_tft,
    resumir_partida_tft,
    validar_ligas_tft,
    validar_partida_activa_tft,
)

AHORA = datetime(2026, 10, 2, 20, 0, tzinfo=UTC)
JOHN = Amigo("Johnadis", "LAS")
GATO = Amigo("Big Gato", "LAS")
P_JOHN = puuid_de("Johnadis")
P_GATO = puuid_de("Big Gato")
URL_ESPECTADOR_TFT = f"{URL_PLATAFORMA}/lol/spectator/tft/v5/active-games/by-puuid"
URL_ESPECTADOR_LOL = f"{URL_PLATAFORMA}/lol/spectator/v5/active-games/by-summoner"


# --- Datos de ejemplo con la forma real de tft-match-v1 / tft-league-v1 ---------------------


def liga_tft(cola="RANKED_TFT", tier="PLATINUM", rank="III", lp=38, wins=55, losses=45):
    return {
        "puuid": "x",
        "queueType": cola,
        "tier": tier,
        "rank": rank,
        "leaguePoints": lp,
        "wins": wins,
        "losses": losses,
        "hotStreak": False,
    }


def unidad(id_unidad="DA_18_Sivir", estrellas=2, rareza=3, items=("DA_InfinityEdge",)):
    return {
        "character_id": id_unidad,
        "itemNames": list(items),
        "name": "",
        "rarity": rareza,
        "tier": estrellas,
    }


def rasgo(nombre, unidades, estilo, actual, total=4):
    return {
        "name": nombre,
        "num_units": unidades,
        "style": estilo,
        "tier_current": actual,
        "tier_total": total,
    }


def partida_tft(id_partida, puuid, *, puesto=1, queue_id=1100, fecha=1_790_000_000_000, otros=()):
    """Partida de 8 jugadores: el amigo en `puesto`, `otros` PUUID de amigos y desconocidos."""

    def jugador(p, lugar, nombre):
        return {
            "puuid": p,
            "placement": lugar,
            "level": 9,
            "last_round": 35,
            "players_eliminated": 1,
            "total_damage_to_players": 120,
            "riotIdGameName": nombre,
            "riotIdTagline": "LAS",
            "units": [
                unidad("DA_18_Hecarim", 2, 2, ()),
                unidad("DA_18_Sivir", 3, 3),
                unidad("DA_Lux18_Base", 2, 4, ("DA_BlueBuff", "DA_RabadonsDeathcap")),
            ],
            "traits": [
                rasgo("DA_18_Hunter", 1, 0, 0),
                rasgo("DA_18_LuxUniqueTrait", 1, 3, 1, total=1),
                rasgo("DA_18_Vanguard", 4, 2, 2),
                rasgo("DA_Primal18", 4, 4, 2, total=2),
            ],
            "win": lugar <= 4,
        }

    lugares = [lugar for lugar in range(1, 9) if lugar != puesto]
    jugadores = [jugador(puuid, puesto, "Yo")]
    for i, lugar in enumerate(lugares):
        p = otros[i] if i < len(otros) else f"rival{i}".ljust(78, "r")
        jugadores.append(jugador(p, lugar, f"Rival{i}"))
    return {
        "metadata": {"match_id": id_partida, "participants": [j["puuid"] for j in jugadores]},
        "info": {
            "game_datetime": fecha,
            "game_length": 2100.4,
            "queueId": queue_id,
            "queue_id": queue_id,
            "tft_set_number": 18,
            "mapId": 22,
            "participants": jugadores,
        },
    }


def activa_tft(puuid, id_partida=7, otros=()):
    return {
        "gameId": id_partida,
        "gameMode": "TFT",
        "mapId": 22,
        "gameQueueConfigId": 1100,
        "gameStartTime": 1_790_000_000_000,
        "gameLength": 600,
        "participants": [
            {"puuid": puuid, "riotId": "Yo#LAS"},
            *[{"puuid": o, "riotId": "Amigo#LAS"} for o in otros],
            {"riotId": ""},  # modo streamer
        ],
    }


@pytest.fixture
def mapa_tft() -> MapaModos:
    return MapaModos.desde_archivo(RAIZ / "config" / "modos_tft.json")


def simular_amigo_tft(nombre, puuid, ids, *, ligas=(), espectador=404, jugando=None):
    responses.get(
        f"{URL_REGION}/riot/account/v1/accounts/by-riot-id/{quote(nombre, safe='')}/LAS",
        json=cuenta(nombre),
    )
    responses.get(f"{URL_PLATAFORMA}/tft/league/v1/by-puuid/{puuid}", json=list(ligas))
    responses.get(f"{URL_REGION}/tft/match/v1/matches/by-puuid/{puuid}/ids", json=list(ids))
    responses.get(f"{URL_ESPECTADOR_TFT}/{puuid}", json=jugando, status=espectador)


def simular_partida_tft(id_partida, puuid, **kwargs):
    responses.get(
        f"{URL_REGION}/tft/match/v1/matches/{id_partida}",
        json=partida_tft(id_partida, puuid, **kwargs),
    )


# --- Validación --------------------------------------------------------------------------


def test_ligas_tft_por_cola():
    rangos = validar_ligas_tft(
        [
            liga_tft(),
            liga_tft("RANKED_TFT_DOUBLE_UP", "MASTER", "I", 120, 30, 20),
            {
                "queueType": "RANKED_TFT_TURBO",
                "ratedTier": "PURPLE",
                "ratedRating": 2900,
                "wins": 12,
                "losses": 8,
            },
            liga_tft("RANKED_SOLO_5x5"),  # de LoL: se ignora
        ]
    )
    assert rangos["ranked"] == {
        "tier": "PLATINUM",
        "division": "III",
        "lp": 38,
        "top4": 55,
        "partidas": 100,
        "racha": False,
    }
    assert rangos["doble"]["division"] is None  # Master no tiene división
    assert rangos["turbo"] == {"tier": "PURPLE", "puntos": 2900, "top4": 12, "partidas": 20}


@pytest.mark.parametrize(
    "entrada",
    [
        liga_tft(tier="WOOD"),
        liga_tft(rank="V"),
        liga_tft(wins=-1),
        {"queueType": "RANKED_TFT_TURBO", "ratedTier": "RAINBOW", "ratedRating": 1},
    ],
)
def test_ligas_tft_invalidas(entrada):
    with pytest.raises(DatoInvalido):
        validar_ligas_tft([entrada])


def test_resumen_de_partida_tft():
    resumen = resumir_partida_tft(partida_tft("LA2_9", P_JOHN, puesto=3), P_JOHN, "LA2_9")
    assert resumen["id"] == "LA2_9"
    assert resumen["puesto"] == 3
    assert resumen["queue_id"] == 1100
    assert resumen["duracion"] == 2100
    assert resumen["set"] == 18
    assert resumen["nivel"] == 9
    # Unidades: más estrellas primero; luego las más caras.
    assert [u["id"] for u in resumen["unidades"]] == [
        "DA_18_Sivir",
        "DA_Lux18_Base",
        "DA_18_Hecarim",
    ]
    assert resumen["unidades"][1]["items"] == ["DA_BlueBuff", "DA_RabadonsDeathcap"]
    # Rasgos: solo activos, el único al final aunque sea dorado.
    assert [r["id"] for r in resumen["rasgos"]] == [
        "DA_Primal18",
        "DA_18_Vanguard",
        "DA_18_LuxUniqueTrait",
    ]
    assert [p["puesto"] for p in resumen["participantes"]] == list(range(1, 9))
    assert resumen["participantes"][2] == {"puuid": P_JOHN, "nombre": "Yo#LAS", "puesto": 3}


def test_resumen_tft_limpia_nombres_con_caracteres_invisibles():
    datos = partida_tft("LA2_9", P_JOHN)
    datos["info"]["participants"][1]["riotIdGameName"] = "Ri" + chr(0x202E) + "val"
    resumen = resumir_partida_tft(datos, P_JOHN, "LA2_9")
    assert "Rival#LAS" in [p["nombre"] for p in resumen["participantes"]]


@pytest.mark.parametrize(
    "romper",
    [
        lambda d: d["metadata"].update(match_id="LA2_OTRA"),
        lambda d: d["info"]["participants"][0].update(puuid="otro".ljust(78, "o")),
        lambda d: d["info"]["participants"][0].update(placement=9),
        lambda d: d["info"]["participants"][0]["units"][0].update(tier=7),
        lambda d: d["info"]["participants"][0]["units"][0].update(character_id="<img src=x>"),
        lambda d: d["info"]["participants"][0]["units"][0].update(itemNames=["a", "b", "c", "d"]),
        lambda d: d["info"]["participants"][0]["traits"][1].update(name="../../etc"),
        lambda d: d["info"].update(game_length="largo"),
        lambda d: d["info"].update(participants=[]),
    ],
)
def test_resumen_tft_rechaza_datos_invalidos(romper):
    datos = partida_tft("LA2_9", P_JOHN)
    romper(datos)
    with pytest.raises(DatoInvalido):
        resumir_partida_tft(datos, P_JOHN, "LA2_9")


def test_detecta_partidas_de_tft_en_el_spectator():
    assert es_partida_tft(activa_tft(P_JOHN))
    assert es_partida_tft({"mapId": 22})
    assert not es_partida_tft(partida_activa(P_JOHN))
    assert not es_partida_tft(None)


def test_partida_activa_tft_con_jugador_en_modo_streamer():
    activa = validar_partida_activa_tft(activa_tft(P_JOHN))
    assert activa["id"] == 7
    assert activa["queue_id"] == 1100
    assert activa["participantes"] == [
        {"puuid": P_JOHN, "nombre": "Yo#LAS"},
        {"puuid": None, "nombre": None},
    ]


# --- Espectador: spectator-tft o, si la key no tiene acceso, el de LoL ------------------------


@responses.activate
def test_espectador_usa_spectator_tft(cliente):
    responses.get(f"{URL_ESPECTADOR_TFT}/{P_JOHN}", json=activa_tft(P_JOHN))
    espectador = Espectador(cliente)
    assert espectador.consultar(P_JOHN)["id"] == 7
    assert espectador.fuente == "tft"


@responses.activate
def test_espectador_sin_acceso_a_tft_usa_el_de_lol(cliente):
    responses.get(f"{URL_ESPECTADOR_TFT}/{P_JOHN}", status=403)
    responses.get(f"{URL_ESPECTADOR_LOL}/{P_JOHN}", json=activa_tft(P_JOHN))
    responses.get(f"{URL_ESPECTADOR_LOL}/{P_GATO}", json=partida_activa(P_GATO))
    espectador = Espectador(cliente)
    assert espectador.consultar(P_JOHN)["id"] == 7
    assert espectador.fuente == "lol"
    # Una partida de LoL no cuenta como "jugando TFT".
    assert espectador.consultar(P_GATO) is None
    # spectator-tft no se vuelve a intentar en la misma ejecución.
    assert sum("spectator/tft" in c.request.url for c in responses.calls) == 1


@responses.activate
def test_espectador_sin_ninguna_fuente_queda_no_disponible(cliente):
    responses.get(f"{URL_ESPECTADOR_TFT}/{P_JOHN}", status=403)
    responses.get(f"{URL_ESPECTADOR_LOL}/{P_JOHN}", status=403)
    espectador = Espectador(cliente)
    assert espectador.consultar(P_JOHN) is None
    assert not espectador.disponible


@responses.activate
def test_espectador_con_respuesta_invalida_no_rompe(cliente):
    responses.get(f"{URL_ESPECTADOR_TFT}/{P_JOHN}", json={"gameId": "x"})
    assert Espectador(cliente).consultar(P_JOHN) is None


# --- Estadísticas y ranking --------------------------------------------------------------


def test_estadisticas_tft(mapa_tft):
    partidas = [
        {"puesto": 1, "queue_id": 1100},
        {"puesto": 4, "queue_id": 1100},
        {"puesto": 8, "queue_id": 1090},
        {"puesto": 5, "queue_id": 99999},
    ]
    estadisticas = calcular_estadisticas_tft(partidas, mapa_tft)
    assert estadisticas["total"] == {
        "partidas": 4,
        "primeros": 1,
        "top4": 2,
        "top4_pct": 50.0,
        "promedio": 4.5,
    }
    modos = {m["nombre"]: m for m in estadisticas["por_modo"]}
    assert modos["Clasificatoria"]["top4_pct"] == 100.0
    assert modos["Modo especial"]["partidas"] == 1


def test_estadisticas_tft_sin_partidas(mapa_tft):
    total = calcular_estadisticas_tft([], mapa_tft)["total"]
    assert total["top4_pct"] is None and total["promedio"] is None


def test_ranking_tft_primero_rango_despues_top4():
    def amigo(slug, ranked=None, top4=None, partidas=0):
        return {
            "slug": slug,
            "riot_id": slug,
            "rangos": {"ranked": ranked},
            "estadisticas": {"total": {"top4_pct": top4, "partidas": partidas}},
        }

    oro = {"tier": "GOLD", "division": "III", "lp": 65}
    platino = {"tier": "PLATINUM", "division": "III", "lp": 38}
    ranking = calcular_ranking_tft(
        [
            amigo("sin-partidas"),
            amigo("oro", oro, 10, 5),
            amigo("top4-alto", None, 70.0, 20),
            amigo("platino", platino, 40, 5),
            amigo("top4-bajo", None, 45.0, 20),
        ]
    )
    assert [(r["slug"], r["criterio"]) for r in ranking] == [
        ("platino", "rango"),
        ("oro", "rango"),
        ("top4-alto", "top4"),
        ("top4-bajo", "top4"),
        ("sin-partidas", "top4"),
    ]


# --- Punta a punta ---------------------------------------------------------------------------


@responses.activate
def test_genera_tft_json_completo(cliente, mapa_tft, tmp_path):
    simular_amigo_tft(
        "Johnadis",
        P_JOHN,
        ["LA2_2", "LA2_1"],
        ligas=[liga_tft()],
        espectador=200,
        jugando=activa_tft(P_JOHN, otros=(P_GATO,)),
    )
    simular_amigo_tft(
        "Big Gato", P_GATO, ["LA2_2"], espectador=200, jugando=activa_tft(P_GATO, otros=(P_JOHN,))
    )
    responses.get(
        f"{URL_REGION}/tft/match/v1/matches/LA2_2",
        json=partida_tft("LA2_2", P_JOHN, puesto=2, otros=(P_GATO,)),
    )
    simular_partida_tft("LA2_1", P_JOHN, puesto=6, queue_id=1090, fecha=1_000)

    ruta = tmp_path / "tft.json"
    ejecutar_tft(cliente, KEY_FALSA, [JOHN, GATO], mapa_tft, tmp_path / "datos", ruta, ahora=AHORA)

    texto = ruta.read_text(encoding="utf-8")
    salida = json.loads(texto)
    assert salida["version"] == 1
    assert salida["error"] is None
    assert salida["en_vivo_disponible"] is True
    john, gato = salida["amigos"]
    assert john["rangos"]["ranked"]["tier"] == "PLATINUM"
    assert [p["id"] for p in john["partidas"]] == ["LA2_2", "LA2_1"]
    assert john["partidas"][1]["modo"] == "Normal"
    assert john["estadisticas"]["total"]["top4"] == 1
    assert john["jugando"]["modo"] == "Clasificatoria"
    # La misma partida (y la misma partida en vivo) marca a los dos amigos.
    lobby = {p["puesto"]: p["amigo"] for p in john["partidas"][0]["participantes"]}
    assert lobby[2] == "johnadis-las"
    assert "big-gato-las" in lobby.values()
    assert gato["partidas"][0]["puesto"] != 2
    assert len(salida["en_vivo"]) == 1
    assert salida["en_vivo"][0]["amigos"] == ["big-gato-las", "johnadis-las"]
    assert {"nombre": None, "amigo": None} in salida["en_vivo"][0]["jugadores"]
    assert salida["ranking"][0]["slug"] == "johnadis-las"
    # Nada de PUUID ni de la key en la salida ni en el registro (que es público).
    registro = (tmp_path / "datos" / "registro_tft" / "johnadis-las.json").read_text("utf-8")
    for texto_publico in (texto, registro):
        assert P_JOHN not in texto_publico and P_GATO not in texto_publico
        assert '"puuid"' not in texto_publico
        assert KEY_FALSA not in texto_publico


@responses.activate
def test_tft_segunda_ejecucion_solo_descarga_partidas_nuevas(cliente, mapa_tft, tmp_path):
    simular_amigo_tft("Johnadis", P_JOHN, ["LA2_1"])
    simular_partida_tft("LA2_1", P_JOHN)
    datos, ruta = tmp_path / "datos", tmp_path / "tft.json"
    ejecutar_tft(cliente, KEY_FALSA, [JOHN], mapa_tft, datos, ruta, ahora=AHORA)
    ejecutar_tft(cliente, KEY_FALSA, [JOHN], mapa_tft, datos, ruta, ahora=AHORA)
    assert sum("/tft/match/v1/matches/LA2_1" in c.request.url for c in responses.calls) == 1


@responses.activate
def test_tft_sin_acceso_usa_los_ultimos_datos_y_no_falla(cliente, mapa_tft, tmp_path):
    simular_amigo_tft("Johnadis", P_JOHN, ["LA2_1"])
    simular_partida_tft("LA2_1", P_JOHN)
    datos, ruta = tmp_path / "datos", tmp_path / "tft.json"
    ejecutar_tft(cliente, KEY_FALSA, [JOHN], mapa_tft, datos, ruta, ahora=AHORA)

    responses.reset()
    responses.get(f"{URL_REGION}/riot/account/v1/accounts/by-riot-id/Johnadis/LAS", status=403)
    salida = ejecutar_tft(cliente, KEY_FALSA, [JOHN], mapa_tft, datos, ruta, ahora=AHORA)
    assert salida["error"] == MENSAJE_SIN_ACCESO
    assert salida["en_vivo_disponible"] is False
    assert salida["amigos"][0]["estado"] == "error"
    assert [p["id"] for p in salida["amigos"][0]["partidas"]] == ["LA2_1"]


@responses.activate
def test_tft_key_rechazada_a_mitad_de_camino(cliente, mapa_tft, tmp_path):
    simular_amigo_tft("Johnadis", P_JOHN, [])
    responses.get(
        f"{URL_REGION}/riot/account/v1/accounts/by-riot-id/Big%20Gato/LAS", json=cuenta("Big Gato")
    )
    responses.get(f"{URL_PLATAFORMA}/tft/league/v1/by-puuid/{P_GATO}", status=401)
    salida = ejecutar_tft(
        cliente, KEY_FALSA, [JOHN, GATO], mapa_tft, tmp_path, tmp_path / "tft.json", ahora=AHORA
    )
    assert salida["error"] == MENSAJE_SIN_ACCESO
    assert [a["estado"] for a in salida["amigos"]] == ["ok", "error"]


@responses.activate
def test_tft_partida_invalida_se_omite(cliente, mapa_tft, tmp_path):
    simular_amigo_tft("Johnadis", P_JOHN, ["LA2_2", "LA2_1"])
    simular_partida_tft("LA2_2", P_JOHN)
    responses.get(f"{URL_REGION}/tft/match/v1/matches/LA2_1", json={"metadata": "roto"})
    salida = ejecutar_tft(
        cliente, KEY_FALSA, [JOHN], mapa_tft, tmp_path, tmp_path / "tft.json", ahora=AHORA
    )
    assert salida["amigos"][0]["estado"] == "ok"
    assert [p["id"] for p in salida["amigos"][0]["partidas"]] == ["LA2_2"]


@responses.activate
def test_tft_un_puuid_en_el_registro_bloquea_su_escritura(cliente, mapa_tft, tmp_path, monkeypatch):
    simular_amigo_tft("Johnadis", P_JOHN, ["LA2_1"])
    simular_partida_tft("LA2_1", P_JOHN)
    monkeypatch.setattr("lolsapo.tft.anonimizar_participantes", lambda p, _: p)
    with pytest.raises(SecretoEnSalida, match="registro"):
        ejecutar_tft(
            cliente, KEY_FALSA, [JOHN], mapa_tft, tmp_path, tmp_path / "t.json", ahora=AHORA
        )
    assert not (tmp_path / "registro_tft" / "johnadis-las.json").exists()


@responses.activate
def test_tft_la_key_en_la_salida_bloquea_la_escritura(cliente, mapa_tft, tmp_path, monkeypatch):
    simular_amigo_tft("Johnadis", P_JOHN, [])
    monkeypatch.setattr("lolsapo.tft.MENSAJE_SIN_ACCESO", KEY_FALSA)
    monkeypatch.setattr("lolsapo.tft.calcular_ranking_tft", lambda a: [{"x": KEY_FALSA}])
    with pytest.raises(SecretoEnSalida):
        ejecutar_tft(
            cliente, KEY_FALSA, [JOHN], mapa_tft, tmp_path, tmp_path / "t.json", ahora=AHORA
        )
    assert not (tmp_path / "t.json").exists()


@responses.activate
def test_lol_ignora_una_partida_de_tft_en_el_spectator(cliente, mapa, tmp_path):
    from test_recolector import simular_amigo

    from lolsapo.recolector import ejecutar

    simular_amigo("Johnadis", P_JOHN, [], jugando=activa_tft(P_JOHN))
    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )
    assert salida["amigos"][0]["estado"] == "ok"
    assert salida["amigos"][0]["jugando"] is None
    assert salida["en_vivo"] == []


# --- Data Dragon de TFT ----------------------------------------------------------------------


def _archivo(elementos):
    return {"type": "x", "data": {f"ruta/{e['id']}": e for e in elementos}}


def _elemento(id_tft, nombre="Sivir", imagen=None, costo=None):
    e = {"id": id_tft, "name": nombre, "image": {"full": imagen or f"{id_tft}.TFT_Set18.png"}}
    if costo is not None:
        e["cost"] = costo
    return e


def test_ddragon_tft_reindexa_por_id_y_omite_sin_nombre():
    campeones = ddragon_tft.validar_campeones(
        _archivo([_elemento("DA_18_Sivir", costo=4), _elemento("DA_Interno", nombre="")])
    )
    assert campeones == {
        "DA_18_Sivir": {"nombre": "Sivir", "imagen": "DA_18_Sivir.TFT_Set18.png", "costo": 4}
    }


@pytest.mark.parametrize(
    "elemento",
    [
        _elemento("DA_18_Sivir", imagen="../../x.png"),
        _elemento("DA_18_Sivir", imagen="https://malo.com/x.png"),
        _elemento("DA 18 Sivir"),
        {"id": "DA_18_Sivir", "name": "Sivir", "image": "x.png"},
    ],
)
def test_ddragon_tft_rechaza_datos_raros(elemento):
    with pytest.raises(DatoInvalido):
        ddragon_tft.validar_rasgos(_archivo([elemento]))


@responses.activate
def test_ddragon_tft_descarga_y_usa_cache(tmp_path):
    base = ddragon_tft.URL_DDRAGON
    responses.get(f"{base}/api/versions.json", json=["16.19.1", "16.18.1"])
    for archivo in ("tft-champion", "tft-trait", "tft-item"):
        responses.get(
            f"{base}/cdn/16.19.1/data/es_MX/{archivo}.json",
            json=_archivo([_elemento("DA_18_Sivir", costo=4)]),
        )
    ruta = tmp_path / "ddragon_tft.json"
    datos = ddragon_tft.obtener(ruta)
    assert datos["version"] == "16.19.1"
    assert "DA_18_Sivir" in datos["rasgos"]
    # Segunda vez: misma versión, no se vuelven a bajar los archivos.
    ddragon_tft.obtener(ruta)
    assert sum("tft-trait" in c.request.url for c in responses.calls) == 1
    # Ninguna llamada a Data Dragon lleva la key de Riot.
    assert all("X-Riot-Token" not in c.request.headers for c in responses.calls)


@responses.activate
def test_ddragon_tft_caido_usa_el_cache_o_none(tmp_path):
    responses.get(f"{ddragon_tft.URL_DDRAGON}/api/versions.json", status=500)
    assert ddragon_tft.obtener(tmp_path / "no-existe.json") is None


def test_ddragon_tft_para_salida_solo_lo_usado():
    datos = {
        "version": "16.19.1",
        "campeones": {"A": {"nombre": "a"}, "B": {"nombre": "b"}},
        "rasgos": {},
        "items": {"I": {"nombre": "i"}},
    }
    salida = ddragon_tft.para_salida(datos, {"campeones": {"A", "Z"}, "items": {"I"}})
    assert salida == {
        "version": "16.19.1",
        "campeones": {"A": {"nombre": "a"}},
        "rasgos": {},
        "items": {"I": {"nombre": "i"}},
    }
    assert ddragon_tft.para_salida(None, {}) is None


# --- Configuración y comando --------------------------------------------------------------


@pytest.fixture
def sin_key_tft(monkeypatch):
    monkeypatch.setenv("RIOT_API_KEY_TFT", "")
    monkeypatch.delenv("RIOT_API_KEY_TFT")


def test_key_tft_es_opcional(sin_key_tft, tmp_path):
    assert cargar_api_key_tft(tmp_path / "no-existe.env") is None


def test_key_tft_desde_env(sin_key_tft, tmp_path):
    env = tmp_path / ".env"
    env.write_text(f"RIOT_API_KEY_TFT={KEY_FALSA}\n", encoding="utf-8")
    assert cargar_api_key_tft(env) == KEY_FALSA


def test_key_tft_con_formato_invalido_no_se_muestra(monkeypatch, tmp_path):
    monkeypatch.setenv("RIOT_API_KEY_TFT", "clave-secreta-mal-copiada")
    with pytest.raises(ErrorConfiguracion) as error:
        cargar_api_key_tft(tmp_path / "no-existe.env")
    assert "clave-secreta" not in str(error.value)


def test_modos_tft_del_repo(mapa_tft):
    assert mapa_tft.obtener(1100).nombre == "Clasificatoria"
    assert mapa_tft.obtener(1160).categoria == "ranked"
    assert mapa_tft.obtener(424242).nombre == "Modo especial"


def _sin_red(monkeypatch, llamadas):
    monkeypatch.setenv("RIOT_API_KEY", KEY_FALSA)
    monkeypatch.setattr("lolsapo.__main__.datos_ddragon.obtener", lambda ruta: None)
    monkeypatch.setattr("lolsapo.__main__.ddragon_tft.obtener", lambda ruta: None)
    monkeypatch.setattr(
        "lolsapo.__main__.ejecutar", lambda cliente, key, *a, **k: llamadas.append(("lol", cliente))
    )

    def tft(cliente, key, *a, **k):
        llamadas.append(("tft", cliente))
        return {"amigos": [], "error": None}

    monkeypatch.setattr("lolsapo.__main__.ejecutar_tft", tft)


@pytest.mark.parametrize(("juego", "esperado"), [("lol", ["lol"]), ("tft", ["tft"])])
def test_main_juego_elige_que_generar(monkeypatch, tmp_path, sin_key_tft, juego, esperado):
    llamadas = []
    _sin_red(monkeypatch, llamadas)
    monkeypatch.setattr("lolsapo.__main__.RUTA_ENV", tmp_path / "no-existe.env")
    monkeypatch.setattr(
        "lolsapo.__main__.ejecutar",
        lambda *a, **k: llamadas.append(("lol", None)) or {"amigos": []},
    )
    assert main(["--juego", juego, "--datos", str(tmp_path)]) == 0
    assert [nombre for nombre, _ in llamadas] == esperado


def test_main_tft_usa_su_propia_key_y_cliente(monkeypatch, tmp_path):
    llamadas = []
    _sin_red(monkeypatch, llamadas)
    otra = KEY_FALSA.replace("f", "a")
    monkeypatch.setenv("RIOT_API_KEY_TFT", otra)
    monkeypatch.setattr("lolsapo.__main__.RUTA_ENV", tmp_path / "no-existe.env")
    monkeypatch.setattr(
        "lolsapo.__main__.ejecutar",
        lambda cliente, *a, **k: llamadas.append(("lol", cliente)) or {"amigos": []},
    )
    assert main(["--datos", str(tmp_path)]) == 0
    (_, cliente_lol), (_, cliente_tft) = llamadas
    assert cliente_lol is not cliente_tft


def test_main_sin_key_tft_comparte_el_cliente_de_lol(monkeypatch, tmp_path, sin_key_tft):
    llamadas = []
    _sin_red(monkeypatch, llamadas)
    monkeypatch.setattr("lolsapo.__main__.RUTA_ENV", tmp_path / "no-existe.env")
    monkeypatch.setattr(
        "lolsapo.__main__.ejecutar",
        lambda cliente, *a, **k: llamadas.append(("lol", cliente)) or {"amigos": []},
    )
    assert main(["--datos", str(tmp_path)]) == 0
    (_, cliente_lol), (_, cliente_tft) = llamadas
    assert cliente_lol is cliente_tft
