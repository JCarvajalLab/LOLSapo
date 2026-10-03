import pytest
from conftest import cuenta, liga, partida, partida_activa, puuid_de

from lolsapo.validacion import (
    DatoInvalido,
    resumir_partida,
    validar_cuenta,
    validar_ids_partidas,
    validar_invocador,
    validar_ligas,
    validar_maestria,
    validar_partida_activa,
)

PUUID = puuid_de("Johnadis")


def test_resumen_de_victoria():
    resumen = resumir_partida(partida("LA2_100", PUUID, queue_id=450, win=True), PUUID)
    assert resumen == {
        "id": "LA2_100",
        "fecha": 1_790_000_000_000,
        "queue_id": 450,
        "campeon": "Ahri",
        "campeon_id": 103,
        "resultado": "victoria",
        "asesinatos": 5,
        "muertes": 2,
        "asistencias": 7,
        "duracion": 1800,
        "nivel": 16,
        "cs": 177,
        # (5 asesinatos + 7 asistencias) / (5 + 10 asesinatos del equipo) = 80 %
        "participacion": 80,
        "danio": 21_345,
        "equipo": 100,
        "items": [3031, 3006, 0, 0, 0, 0, 3340],
        "hechizos": [4, 14],
        "runas": {"principal": 8112, "secundaria": 8000},
        "participantes": [
            {"puuid": PUUID, "campeon_id": 103, "equipo": 100, "nombre": "Yo#LAS"},
            {
                "puuid": "aliado".ljust(78, "a"),
                "campeon_id": 86,
                "equipo": 100,
                "nombre": "Aliado#LAS",
            },
            {
                "puuid": "rival1".ljust(78, "r"),
                "campeon_id": 62,
                "equipo": 200,
                "nombre": "Rival1#LAS",
            },
            {
                "puuid": "rival2".ljust(78, "r"),
                "campeon_id": 1,
                "equipo": 200,
                "nombre": "Rival2#LAS",
            },
        ],
    }


def test_participante_sin_nombre_ni_puuid_queda_en_none():
    datos = partida("LA2_1", PUUID)
    rival = datos["info"]["participants"][3]
    rival.update(puuid="", riotIdGameName="", riotIdTagline="")
    otro = resumir_partida(datos, PUUID)["participantes"][3]
    assert otro == {"puuid": None, "campeon_id": 1, "equipo": 200, "nombre": None}


def test_sin_asesinatos_del_equipo_la_participacion_es_none():
    datos = partida("LA2_1", PUUID, kda=(0, 0, 0))
    datos["info"]["participants"][1]["kills"] = 0
    assert resumir_partida(datos, PUUID)["participacion"] is None


def test_arena_usa_el_subequipo():
    datos = partida("LA2_1", PUUID, queue_id=1700)
    for i, p in enumerate(datos["info"]["participants"]):
        p["playerSubteamId"] = [1, 1, 2, 2][i]
    resumen = resumir_partida(datos, PUUID)
    assert resumen["equipo"] == 1
    assert [p["equipo"] for p in resumen["participantes"]] == [1, 1, 2, 2]


def test_runas_ausentes_no_rompen():
    datos = partida("LA2_1", PUUID)
    datos["info"]["participants"][0]["perks"] = {}
    assert resumir_partida(datos, PUUID)["runas"] == {"principal": None, "secundaria": None}


def test_resumen_sin_danio_lo_deja_vacio():
    datos = partida("LA2_100", PUUID)
    datos["info"]["participants"][0].pop("totalDamageDealtToChampions")
    assert resumir_partida(datos, PUUID)["danio"] is None


@pytest.mark.parametrize("valor", [-5, 1.5, "mucho", True])
def test_resumen_con_danio_invalido_lo_deja_vacio(valor):
    datos = partida("LA2_100", PUUID)
    datos["info"]["participants"][0]["totalDamageDealtToChampions"] = valor
    assert resumir_partida(datos, PUUID)["danio"] is None


def test_resumen_de_derrota_y_remake():
    assert resumir_partida(partida("LA2_1", PUUID, win=False), PUUID)["resultado"] == "derrota"
    remake = partida("LA2_2", PUUID, win=False, remake=True)
    assert resumir_partida(remake, PUUID)["resultado"] == "remake"


def test_partida_antigua_con_duracion_en_milisegundos():
    datos = partida("LA2_1", PUUID, duracion=1_800_000)
    del datos["info"]["gameEndTimestamp"]
    datos["info"]["gameStartTimestamp"] = 1_000_000
    resumen = resumir_partida(datos, PUUID)
    assert resumen["duracion"] == 1800
    assert resumen["fecha"] == 1_000_000 + 1_800_000


def test_queue_id_ausente_queda_como_none():
    datos = partida("LA2_1", PUUID)
    del datos["info"]["queueId"]
    assert resumir_partida(datos, PUUID)["queue_id"] is None


@pytest.mark.parametrize(
    "romper",
    [
        lambda d: d["metadata"].update(matchId="../../etc/passwd"),
        lambda d: d["metadata"].update(matchId=123),
        lambda d: d["info"]["participants"][0].update(championName="<script>"),
        lambda d: d["info"]["participants"][0].update(kills=-1),
        lambda d: d["info"]["participants"][0].update(kills="5"),
        lambda d: d["info"]["participants"][0].update(deaths=True),
        lambda d: d["info"]["participants"][0].update(win=None),
        lambda d: d["info"]["participants"][0].update(puuid="otra-persona".ljust(78, "z")),
        lambda d: d["info"].update(participants="nada"),
        lambda d: d.pop("info"),
    ],
)
def test_partida_invalida(romper):
    datos = partida("LA2_1", PUUID)
    romper(datos)
    with pytest.raises(DatoInvalido):
        resumir_partida(datos, PUUID)


def test_partida_distinta_a_la_pedida_se_rechaza():
    with pytest.raises(DatoInvalido, match="se pidió"):
        resumir_partida(partida("LA2_2", PUUID), PUUID, id_esperado="LA2_1")
    assert resumir_partida(partida("LA2_1", PUUID), PUUID, id_esperado="LA2_1")["id"] == "LA2_1"


def test_ids_de_partidas_validos():
    assert validar_ids_partidas(["LA2_1", "LA1_99", "NA1_5"]) == ["LA2_1", "LA1_99", "NA1_5"]
    assert validar_ids_partidas([]) == []


@pytest.mark.parametrize(
    "ids",
    [
        None,
        "LA2_1",
        [123],
        ["LA2_1\n"],  # salto de línea al final (inyección en logs)
        ["LA2_1/../x"],
        ["la2_1"],
        ["LA2_" + chr(0x0663)],  # dígito árabe: \d lo aceptaría
    ],
)
def test_ids_de_partidas_invalidos(ids):
    with pytest.raises(DatoInvalido):
        validar_ids_partidas(ids)


def test_ligas_con_queue_type_de_tipo_raro_se_ignora():
    entrada = liga()
    entrada["queueType"] = ["RANKED_SOLO_5x5"]
    assert validar_ligas([entrada]) == {"solo": None, "flex": None}


@pytest.mark.parametrize("invisible", [0x200B, 0x202E, 0x2066, 0xFEFF, 0x061C, 0x2060, 0x180E])
def test_textos_sin_caracteres_invisibles(invisible):
    datos = cuenta("Johnadis")
    datos["gameName"] = "John" + chr(invisible) + "adis"
    assert validar_cuenta(datos)["nombre"] == "Johnadis"


def test_cuenta_limpia_caracteres_de_control():
    datos = cuenta("Johnadis")
    datos["gameName"] = "John" + chr(0x202E) + "adis" + chr(0)  # caracteres invisibles
    assert validar_cuenta(datos)["nombre"] == "Johnadis"


@pytest.mark.parametrize("puuid", [None, "", "corto", "con espacios " * 5, "a/b".ljust(78, "c")])
def test_cuenta_con_puuid_invalido(puuid):
    datos = cuenta("Johnadis")
    datos["puuid"] = puuid
    with pytest.raises(DatoInvalido):
        validar_cuenta(datos)


def test_invocador():
    assert validar_invocador({"profileIconId": 29, "summonerLevel": 150}) == {
        "icono": 29,
        "nivel": 150,
    }
    with pytest.raises(DatoInvalido):
        validar_invocador({"profileIconId": "29", "summonerLevel": 150})


def test_ligas_solo_y_flex():
    rangos = validar_ligas(
        [
            liga("RANKED_SOLO_5x5", "GOLD", "II", 45, 30, 25),
            liga("RANKED_FLEX_SR", "SILVER", "I", 10, 5, 5),
            liga("CHERRY", "GOLD", "I", 0, 1, 1),  # otras colas se ignoran
        ]
    )
    assert rangos["solo"] == {
        "tier": "GOLD",
        "division": "II",
        "lp": 45,
        "victorias": 30,
        "derrotas": 25,
        "racha": False,
    }
    assert rangos["flex"]["tier"] == "SILVER"


def test_ligas_con_racha():
    entrada = liga()
    entrada["hotStreak"] = True
    assert validar_ligas([entrada])["solo"]["racha"] is True


def test_maestria():
    datos = {"championLevel": 7, "championPoints": 123456, "championId": 103, "puuid": "x"}
    assert validar_maestria(datos) == {"nivel": 7, "puntos": 123456}
    with pytest.raises(DatoInvalido):
        validar_maestria({"championLevel": "7", "championPoints": 1})


def test_ligas_sin_rankeds():
    assert validar_ligas([]) == {"solo": None, "flex": None}


def test_master_no_tiene_division():
    rangos = validar_ligas([liga(tier="MASTER", rank="I", lp=250)])
    assert rangos["solo"]["division"] is None


@pytest.mark.parametrize(("tier", "rank"), [("WOOD", "I"), ("GOLD", "V"), ("GOLD", None)])
def test_ligas_invalidas(tier, rank):
    with pytest.raises(DatoInvalido):
        validar_ligas([liga(tier=tier, rank=rank)])


def test_partida_activa():
    assert validar_partida_activa(partida_activa(PUUID, 450, 103, id_partida=7), PUUID) == {
        "id": 7,
        "campeon_id": 103,
        "queue_id": 450,
        "inicio": 1_790_000_000_000,
        "duracion": 300,
        "participantes": [
            {"puuid": PUUID, "campeon_id": 103, "equipo": 100, "nombre": "Yo#LAS", **EXTRA},
            {
                "puuid": "rival1".ljust(78, "r"),
                "campeon_id": 62,
                "equipo": 200,
                "nombre": "Rival#LAS",
                **EXTRA,
            },
            # Modo streamer: solo se conoce el campeón.
            {"puuid": None, "campeon_id": 1, "equipo": 200, "nombre": None, **EXTRA},
        ],
        # El ban -1 ("sin ban") se descarta.
        "bloqueos": [{"campeon_id": 157, "equipo": 100}, {"campeon_id": 238, "equipo": 200}],
    }


EXTRA = {"hechizos": [4, 14], "runas": {"principal": 8112, "secundaria": 8000}}


def test_partida_activa_sin_runas_ni_bans():
    datos = partida_activa(PUUID)
    del datos["bannedChampions"]
    for p in datos["participants"]:
        del p["perks"]
    activa = validar_partida_activa(datos, PUUID)
    assert activa["bloqueos"] == []
    assert activa["participantes"][0]["runas"] == {"principal": None, "secundaria": None}


def test_partida_activa_cargando():
    datos = partida_activa(PUUID)
    datos.update(gameStartTime=0, gameLength=-15)
    activa = validar_partida_activa(datos, PUUID)
    assert activa["inicio"] is None
    assert activa["duracion"] == 0


def test_partida_activa_con_el_amigo_en_modo_streamer():
    activa = validar_partida_activa(partida_activa("otro".ljust(78, "q")), PUUID)
    assert activa["campeon_id"] is None
    assert len(activa["participantes"]) == 3


def test_partida_activa_sin_game_id_es_invalida():
    datos = partida_activa(PUUID)
    del datos["gameId"]
    with pytest.raises(DatoInvalido):
        validar_partida_activa(datos, PUUID)
