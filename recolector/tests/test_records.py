from datetime import UTC, datetime

from lolsapo.modos import MapaModos, Modo
from lolsapo.records import calcular_records


def crear_mapa():
    return MapaModos(
        {
            420: Modo(420, "Ranked Solo", "ranked"),
            440: Modo(440, "Ranked Flex", "ranked"),
            400: Modo(400, "Normal Draft", "normal"),
            450: Modo(450, "ARAM", "aram"),
        }
    )


def test_calcular_records_basicos_y_filtros():
    mapa = crear_mapa()
    # Fecha base: 15 de marzo de 2026 a las 12:00 UTC
    dt_base = datetime(2026, 3, 15, 12, 0, 0, tzinfo=UTC)
    ahora_ms = int(dt_base.timestamp() * 1000)
    dia_ms = 24 * 60 * 60 * 1000

    p_reciente = {
        "id": "match-1",
        "fecha": ahora_ms - 5 * dia_ms,
        "queue_id": 420,
        "campeon": "Akshan",
        "campeon_id": 166,
        "resultado": "victoria",
        "asesinatos": 25,
        "muertes": 2,
        "asistencias": 10,
        "duracion": 1800,  # 30 min
        "cs": 250,
        "participacion": 85,
        "danio": 55000,
        "danio_recibido": 20000,
        "danio_objetivos": 30000,
        "oro": 18000,
        "vision": 45,
        "pentakills": 1,
        "quadrakills": 1,
        "triplekills": 2,
        "doblekills": 4,
        "racha_asesinatos": 12,
        "tiempo_vivo": 1200,
        "participantes": [],
    }

    p_vieja_60dias = {
        "id": "match-2",
        "fecha": ahora_ms - 60 * dia_ms,
        "queue_id": 400,
        "campeon": "Viktor",
        "campeon_id": 112,
        "resultado": "derrota",
        "asesinatos": 10,
        "muertes": 8,
        "asistencias": 30,
        "duracion": 2400,  # 40 min
        "cs": 320,
        "participacion": 70,
        "danio": 65000,
        "danio_recibido": 35000,
        "danio_objetivos": 15000,
        "oro": 21000,
        "vision": 60,
        "pentakills": 0,
        "quadrakills": 0,
        "triplekills": 0,
        "doblekills": 2,
        "racha_asesinatos": 5,
        "tiempo_vivo": 800,
        "participantes": [],
    }

    p_aram_ignorada = {
        "id": "match-3",
        "fecha": ahora_ms - 2 * dia_ms,
        "queue_id": 450,  # ARAM no cuenta
        "campeon": "Ziggs",
        "campeon_id": 115,
        "resultado": "victoria",
        "asesinatos": 40,
        "muertes": 5,
        "asistencias": 20,
        "duracion": 900,
        "cs": 50,
        "danio": 100000,
        "participantes": [],
    }

    p_remake_ignorada = {
        "id": "match-4",
        "fecha": ahora_ms - 1 * dia_ms,
        "queue_id": 420,
        "campeon": "Sett",
        "campeon_id": 875,
        "resultado": "remake",  # Remake no cuenta
        "duracion": 180,
        "participantes": [],
    }

    registradas = {
        "nico": [p_reciente, p_vieja_60dias, p_aram_ignorada, p_remake_ignorada],
    }
    nombres = {"nico": "Nico"}

    res = calcular_records(registradas, nombres, mapa, ahora_ms)

    assert res["anio_actual"] == 2026

    # 30 días: solo partida reciente (match-1)
    rec_30 = res["por_amigo"]["nico"]["dias_30"]
    assert rec_30["basicos"]["asesinatos"]["valor_raw"] == 25
    assert rec_30["basicos"]["asesinatos"]["campeon"] == "Akshan"
    assert rec_30["multikills"]["pentakills"]["valor_raw"] == 1
    assert rec_30["duracion"]["victoria_mas_rapida"]["valor_raw"] == 1800
    assert rec_30["duracion"]["victoria_mas_rapida"]["valor"] == "30:00"

    # En 30 días match-2 no está, así que asistencias récord es 10
    assert rec_30["basicos"]["asistencias"]["valor_raw"] == 10

    # 90 días: incluye match-1 y match-2 (ambas son de 2026)
    rec_90 = res["por_amigo"]["nico"]["dias_90"]
    assert rec_90["basicos"]["asesinatos"]["valor_raw"] == 25  # match-1
    assert rec_90["basicos"]["asistencias"]["valor_raw"] == 30  # match-2 con Viktor
    assert rec_90["impacto"]["danio"]["valor_raw"] == 65000  # match-2 con Viktor
    assert rec_90["duracion"]["partida_mas_larga"]["valor_raw"] == 2400

    # anio_2026: ambas ocurrieron en 2026
    rec_anio = res["por_amigo"]["nico"]["anio_2026"]
    assert rec_anio["basicos"]["asesinatos"]["valor_raw"] == 25
    assert rec_anio["basicos"]["asistencias"]["valor_raw"] == 30

    # Global: refleja las mejores marcas
    rec_glob = res["global"]["anio_2026"]
    assert rec_glob["basicos"]["asesinatos"]["amigo_slug"] == "nico"
    assert rec_glob["basicos"]["asesinatos"]["valor_raw"] == 25
    assert rec_glob["impacto"]["danio"]["valor_raw"] == 65000


def test_calcular_records_desempates():
    mapa = crear_mapa()
    ahora_ms = 1773576000000  # 2026
    dia_ms = 24 * 60 * 60 * 1000

    # Dos partidas con mismos kills pero diferente daño
    p1 = {
        "id": "p1",
        "fecha": ahora_ms - 2 * dia_ms,
        "queue_id": 420,
        "campeon": "Jinx",
        "campeon_id": 222,
        "resultado": "victoria",
        "asesinatos": 15,
        "muertes": 3,
        "asistencias": 5,
        "duracion": 1800,
        "danio": 30000,
    }
    p2 = {
        "id": "p2",
        "fecha": ahora_ms - 1 * dia_ms,
        "queue_id": 420,
        "campeon": "Caitlyn",
        "campeon_id": 51,
        "resultado": "victoria",
        "asesinatos": 15,
        "muertes": 2,
        "asistencias": 5,
        "duracion": 1800,
        "danio": 45000,  # más daño
    }

    registradas = {"john": [p1, p2]}
    res = calcular_records(registradas, {"john": "Johnadis"}, mapa, ahora_ms)

    # Debe desempatar por mayor daño
    rec_kills = res["por_amigo"]["john"]["todo"]["basicos"]["asesinatos"]
    assert rec_kills["valor_raw"] == 15
    assert rec_kills["campeon"] == "Caitlyn"
    assert rec_kills["partida_id"] == "p2"
