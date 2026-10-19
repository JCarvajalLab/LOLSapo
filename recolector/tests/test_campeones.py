from lolsapo.campeones import (
    _kda,
    _posicion_jugador,
    _winrate,
    calcular_estadisticas_campeones,
)
from lolsapo.modos import MapaModos, Modo


def crear_mapa():
    return MapaModos(
        {
            420: Modo(420, "Ranked Solo", "ranked"),
            440: Modo(440, "Ranked Flex", "ranked"),
            400: Modo(400, "Normal Draft", "normal"),
            450: Modo(450, "ARAM", "aram"),
        }
    )


def test_helpers_kda_y_winrate():
    assert _kda(10, 2, 6) == 8.0
    assert _kda(5, 0, 5) == 10.0  # Si muertes es 0, max(1, 0)
    assert _winrate(5, 5) == 50.0
    assert _winrate(0, 0) is None


def test_posicion_jugador_detecta_por_amigo_o_por_campeon():
    partida = {
        "campeon_id": 103,
        "equipo": 100,
        "participantes": [
            {"amigo": "rana-azul", "campeon_id": 103, "equipo": 100, "posicion": "MIDDLE"},
            {"amigo": None, "campeon_id": 22, "equipo": 100, "posicion": "BOTTOM"},
        ],
    }
    assert _posicion_jugador(partida, "rana-azul") == "MIDDLE"

    partida_sin_amigo_en_participante = {
        "campeon_id": 22,
        "equipo": 100,
        "participantes": [
            {"amigo": None, "campeon_id": 22, "equipo": 100, "posicion": "BOTTOM"},
        ],
    }
    assert _posicion_jugador(partida_sin_amigo_en_participante, "otro-slug") == "BOTTOM"

    partida_vacia = {}
    assert _posicion_jugador(partida_vacia, "rana-azul") is None


def test_calcular_estadisticas_campeones_filtra_modos_y_periodos():
    mapa = crear_mapa()
    ahora_ms = 100_000_000_000
    dia_ms = 24 * 60 * 60 * 1000

    p_reciente = {
        "id": "1",
        "fecha": ahora_ms - 5 * dia_ms,
        "queue_id": 420,
        "campeon_id": 112,
        "campeon": "Viktor",
        "resultado": "victoria",
        "asesinatos": 10,
        "muertes": 2,
        "asistencias": 5,
        "cs": 200,
        "duracion": 1800,
        "participantes": [{"amigo": "john", "posicion": "MIDDLE"}],
    }
    p_vieja_65dias = {
        "id": "2",
        "fecha": ahora_ms - 65 * dia_ms,
        "queue_id": 400,
        "campeon_id": 112,
        "campeon": "Viktor",
        "resultado": "derrota",
        "asesinatos": 2,
        "muertes": 4,
        "asistencias": 2,
        "cs": 150,
        "duracion": 1500,
        "participantes": [{"amigo": "john", "posicion": "MIDDLE"}],
    }
    p_aram_ignorada = {
        "id": "3",
        "fecha": ahora_ms - 2 * dia_ms,
        "queue_id": 450,  # ARAM no entra en ranked/normal
        "campeon_id": 115,
        "campeon": "Ziggs",
        "resultado": "victoria",
        "asesinatos": 20,
        "muertes": 5,
        "asistencias": 10,
        "cs": 80,
        "duracion": 1200,
        "participantes": [],
    }

    registradas = {"john": [p_reciente, p_vieja_65dias, p_aram_ignorada]}
    stats = calcular_estadisticas_campeones(registradas, mapa, ahora_ms)

    # 30 días: solo Viktor de la partida 1
    c_30 = stats["por_amigo"]["john"]["dias_30"]["campeones"]
    assert len(c_30) == 1
    assert c_30[0]["campeon"] == "Viktor"
    assert c_30[0]["partidas"] == 1
    assert c_30[0]["victorias"] == 1
    assert c_30[0]["winrate"] == 100.0

    # 90 días: incluye la partida 2 (65 días)
    c_90 = stats["por_amigo"]["john"]["dias_90"]["campeones"]
    assert len(c_90) == 1
    assert c_90[0]["partidas"] == 2
    assert c_90[0]["victorias"] == 1
    assert c_90[0]["derrotas"] == 1
    assert c_90[0]["winrate"] == 50.0

    # Global contiene lo mismo que el único amigo
    assert stats["global"]["dias_30"]["total_partidas"] == 1
    assert stats["global"]["todo"]["total_partidas"] == 2

    # Resumen de líneas
    res_lineas = stats["global"]["todo"]["resumen_lineas"]
    assert res_lineas["MIDDLE"]["partidas"] == 2
    assert res_lineas["MIDDLE"]["porcentaje"] == 100.0
    assert res_lineas["TOP"]["partidas"] == 0
