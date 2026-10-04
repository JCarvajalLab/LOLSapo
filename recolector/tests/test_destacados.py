"""Destacados de los últimos 7 días (datos inventados, sin red)."""

import json
from datetime import UTC, datetime

import pytest
import responses
from conftest import KEY_FALSA
from test_recolector import AHORA, GATO, JOHN, P_GATO, P_JOHN, simular_amigo, simular_partida

from lolsapo.destacados import VENTANA_MS, calcular_destacados, inicio_del_dia, kda
from lolsapo.recolector import _elementos_usados, ejecutar

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


def test_inicio_del_dia_es_a_las_6_de_chile():
    # AHORA es 2026-10-01 20:00 UTC = 17:00 en Chile (UTC-3): el día empezó a las 6:00 de hoy.
    seis_hoy = datetime(2026, 10, 1, 9, 0, tzinfo=UTC)
    assert inicio_del_dia(AHORA_MS) == int(seis_hoy.timestamp() * 1000)
    # A las 2:00 de Chile todavía es "ayer": el día empezó a las 6:00 del día anterior.
    dos_am = int(datetime(2026, 10, 2, 5, 0, tzinfo=UTC).timestamp() * 1000)
    assert inicio_del_dia(dos_am) == int(seis_hoy.timestamp() * 1000)
    # Justo a las 6:00 empieza un día nuevo.
    seis_manana = int(datetime(2026, 10, 2, 9, 0, tzinfo=UTC).timestamp() * 1000)
    assert inicio_del_dia(seis_manana) == seis_manana


def test_inicio_del_dia_respeta_el_horario_de_invierno():
    # En julio Chile está en UTC-4: las 6:00 son las 10:00 UTC.
    julio = int(datetime(2026, 7, 15, 20, 0, tzinfo=UTC).timestamp() * 1000)
    seis = int(datetime(2026, 7, 15, 10, 0, tzinfo=UTC).timestamp() * 1000)
    assert inicio_del_dia(julio) == seis


def hoy_en_grupo(id_p, horas_atras, k, d, a, resultado="victoria", con=("ana", "otro"), **kw):
    """La actuación de un amigo en una partida que jugaron juntos los amigos de `con`."""
    partida = p(id_p, horas_atras, resultado, k=k, d=d, a=a, **kw)
    return grupal([partida], *con)[0]


def test_mejor_y_peor_jugador_de_una_partida_de_hoy(mapa):
    # 2 amigos, 1 partida: el de mejor KDA es el mejor y el otro, el peor.
    datos = {
        "ana": [hoy_en_grupo("g1", 2, 10, 2, 8)],
        "otro": [hoy_en_grupo("g1", 2, 2, 7, 4, campeon_id=157)],
    }
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    assert destacados["mejor_jugador_hoy"]["amigos"] == ["ana"]
    assert destacados["mejor_jugador_hoy"]["kda"] == 9.0
    peor = destacados["peor_jugador_hoy"]
    assert peor["amigos"] == ["otro"]
    assert (peor["asesinatos"], peor["muertes"], peor["asistencias"]) == (2, 7, 4)
    assert peor["campeon_id"] == 157
    assert peor["modo"] == "Clasificatoria Solo/Dúo"


def test_jugador_de_hoy_compara_todas_las_actuaciones_del_dia(mapa):
    datos = {
        "ana": [hoy_en_grupo("g1", 5, 5, 5, 5), hoy_en_grupo("g2", 2, 14, 0, 15)],
        "otro": [hoy_en_grupo("g1", 5, 1, 12, 3), hoy_en_grupo("g2", 2, 4, 4, 4)],
    }
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    mejor, peor = destacados["mejor_jugador_hoy"], destacados["peor_jugador_hoy"]
    assert (mejor["amigos"], mejor["partida_id"], mejor["kda"]) == (["ana"], "g2", 29.0)
    assert (peor["amigos"], peor["partida_id"], peor["kda"]) == (["otro"], "g1", 0.33)
    assert mejor["danio"] is None  # partida guardada sin daño


def test_jugador_de_hoy_ignora_solitario_ayer_y_aram(mapa):
    datos = {
        # Solo: no cuenta. ARAM: no cuenta. 12 h antes de las 17:00 son las 5:00: es "ayer".
        "ana": [
            p("solo", 1, k=30, d=0, a=30),
            hoy_en_grupo("aram", 2, 30, 0, 30, queue_id=450),
            hoy_en_grupo("ayer", 12, 30, 0, 30),
        ],
        "otro": [],  # sigue en la lista: las partidas con él sí son "en grupo"
    }
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    assert destacados["mejor_jugador_hoy"] is None
    assert destacados["peor_jugador_hoy"] is None
    assert destacados["hoy_desde"] == inicio_del_dia(AHORA_MS)


def test_mejor_jugador_desempata_por_mas_asesinatos_y_asistencias(mapa):
    datos = {
        "a": [hoy_en_grupo("g1", 2, 4, 0, 4, con=("a", "b"))],
        "b": [hoy_en_grupo("g1", 2, 2, 1, 6, con=("a", "b"))],
    }
    # KDA 8 en las dos: gana la de más asesinatos + asistencias (8 vs 8) y luego menos muertes.
    assert calcular_destacados(datos, mapa, AHORA_MS)["mejor_jugador_hoy"]["amigos"] == ["a"]


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


def test_mas_partidas_y_winrate_usan_los_7_dias_completos(mapa):
    partidas = serie("x", ["derrota"] * 3 + ["victoria"] * 7)
    destacados = calcular_destacados({"a": partidas}, mapa, AHORA_MS)
    assert destacados["mas_partidas"]["partidas"] == 10
    assert destacados["mejor_winrate"]["partidas"] == 10
    assert destacados["mejor_winrate"]["winrate"] == 70.0
    for vieja in ("ultimas_partidas", "mejor_partida", "peor_partida", "racha_victorias"):
        assert vieja not in destacados


def test_sin_partidas_todo_vacio(mapa):
    destacados = calcular_destacados({"a": [], "b": [p("aram", 1, queue_id=450)]}, mapa, AHORA_MS)
    for clave in (
        "mas_partidas",
        "mejor_winrate",
        "mejor_jugador_hoy",
        "peor_jugador_hoy",
        "balance_hoy",
        "mejor_jugador_semana",
        "racha_victorias_grupo",
        "racha_derrotas_grupo",
        "peor_jugador_semana",
    ):
        assert destacados[clave] is None


@pytest.mark.parametrize(
    "rotura",
    [{"asesinatos": "muchos"}, {"muertes": None}, {"campeon_id": -1}, {"id": 5}, {"campeon": None}],
)
def test_partidas_incompletas_se_omiten_sin_romper_el_resto(mapa, rotura):
    rota = p("rota", 1) | rotura
    destacados = calcular_destacados({"a": [rota, p("bien", 2)]}, mapa, AHORA_MS)
    assert destacados["mas_partidas"]["partidas"] == 1


def test_un_registro_con_algo_que_no_es_una_partida_no_rompe(mapa):
    destacados = calcular_destacados({"a": ["texto", None, p("bien", 1)]}, mapa, AHORA_MS)
    assert destacados["mas_partidas"]["partidas"] == 1


@pytest.mark.parametrize("dato_roto", [{"fecha": None}, {}])
def test_partidas_sin_fecha_se_ignoran(mapa, dato_roto):
    partida = p("x", 1) | dato_roto
    if "fecha" not in dato_roto:
        partida.pop("fecha")
    destacados = calcular_destacados({"a": [partida]}, mapa, AHORA_MS)
    assert destacados["mas_partidas"] is None


@responses.activate
def test_registro_danado_no_impide_generar_lol_json(cliente, mapa, tmp_path, caplog):
    simular_amigo("Johnadis", P_JOHN, [])
    ejecutar(cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA)
    ruta = tmp_path / "registro" / "johnadis-las.json"
    registro = json.loads(ruta.read_text(encoding="utf-8"))
    # Partida con el KDA dañado (texto en vez de número): solo afecta a los destacados.
    registro["partidas"]["LA2_X"] = {
        **p("LA2_X", 1),
        "asesinatos": "muchos",
        "participantes": [],
        "danio": None,
    }
    ruta.write_text(json.dumps(registro), encoding="utf-8")
    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )
    # La partida dañada se omite y los destacados se generan igual (sin esa partida).
    assert salida["destacados"] is not None
    assert salida["destacados"]["mas_partidas"] is None
    assert salida["amigos"][0]["slug"] == "johnadis-las"
    assert "No se pudieron calcular los destacados" not in caplog.text


@responses.activate
def test_lol_json_incluye_destacados_sin_puuid(cliente, mapa, tmp_path):
    ids = [f"LA2_{i}" for i in range(3, 0, -1)]
    simular_amigo("Johnadis", P_JOHN, ids)
    simular_amigo("Big Gato", P_GATO, ids)
    for i, id_p in enumerate(ids):
        # Johnadis (5/2/7) y Big Gato (0/2/7) en el mismo equipo, hoy.
        simular_partida(id_p, P_JOHN, companeros=(P_GATO,), fin=AHORA_MS - (i + 1) * HORA)
    salida = ejecutar(
        cliente, KEY_FALSA, [JOHN, GATO], mapa, tmp_path, tmp_path / "lol.json", ahora=AHORA
    )
    destacados = salida["destacados"]
    assert destacados["mas_partidas"]["partidas"] == 3
    assert destacados["racha_victorias_grupo"]["racha"] == 3
    assert destacados["mejor_jugador_hoy"]["amigos"] == ["johnadis-las"]
    assert destacados["peor_jugador_hoy"]["amigos"] == ["big-gato-las"]
    assert destacados["peor_jugador_hoy"]["danio"] == 21_345
    # Los campeones del mejor y peor jugador quedan disponibles para su imagen.
    usados = _elementos_usados([], [], destacados)["campeones"]
    assert {
        destacados["mejor_jugador_hoy"]["campeon_id"],
        destacados["peor_jugador_hoy"]["campeon_id"],
    } <= usados
    texto = (tmp_path / "lol.json").read_text(encoding="utf-8")
    assert P_JOHN not in texto and P_GATO not in texto
    assert json.loads(texto)["destacados"] == destacados


def test_balance_del_grupo_hoy_cuenta_cada_partida_una_vez(mapa):
    juntos = ("ana", "otro")
    datos = {
        # g1 y g2 las jugaron los dos (aparecen en ambos registros): cuentan una vez cada una.
        "ana": [
            hoy_en_grupo("g1", 3, 5, 5, 5, "victoria", con=juntos),
            hoy_en_grupo("g2", 2, 5, 5, 5, "derrota", con=juntos),
            hoy_en_grupo("g3", 1, 5, 5, 5, "victoria", con=juntos),
            p("solo", 1),  # en solitario: no cuenta
            hoy_en_grupo("ayer", 12, 5, 5, 5, "derrota", con=juntos),  # antes de las 6:00
        ],
        "otro": [
            hoy_en_grupo("g1", 3, 5, 5, 5, "victoria", con=juntos),
            hoy_en_grupo("g2", 2, 5, 5, 5, "derrota", con=juntos),
        ],
    }
    balance = calcular_destacados(datos, mapa, AHORA_MS)["balance_hoy"]
    assert balance == {
        "partidas": 3,
        "victorias": 2,
        "derrotas": 1,
        "winrate": 66.7,
        "amigos": ["ana", "otro"],
        "jugadas": {"ana": 3, "otro": 3},
    }


def test_balance_dice_cuantas_jugo_quien_se_sumo_despues(mapa):
    datos = {
        "ana": [
            hoy_en_grupo("g1", 3, 5, 5, 5, con=("ana", "beto")),
            hoy_en_grupo("g2", 2, 5, 5, 5, con=("ana", "beto")),
            hoy_en_grupo("g3", 1, 5, 5, 5, "derrota", con=("ana", "beto", "carla")),
        ],
        "beto": [],
        "carla": [],
    }
    balance = calcular_destacados(datos, mapa, AHORA_MS)["balance_hoy"]
    assert balance["partidas"] == 3
    assert balance["amigos"] == ["ana", "beto", "carla"]
    assert balance["jugadas"] == {"ana": 3, "beto": 3, "carla": 1}


def test_balance_sin_partidas_en_grupo_hoy_es_none(mapa):
    datos = {"ana": [p("solo", 1)], "otro": []}
    assert calcular_destacados(datos, mapa, AHORA_MS)["balance_hoy"] is None


def test_jugador_de_la_semana_incluye_dias_anteriores_y_el_de_hoy_no(mapa):
    datos = {
        # Ayer (30 h atrás): la mejor actuación de la semana, pero no de hoy.
        "ana": [hoy_en_grupo("ayer", 30, 20, 0, 20), hoy_en_grupo("g1", 2, 5, 5, 5)],
        "otro": [hoy_en_grupo("g1", 2, 1, 9, 1)],
    }
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    assert destacados["mejor_jugador_semana"]["partida_id"] == "ayer"
    assert destacados["mejor_jugador_hoy"]["partida_id"] == "g1"
    assert destacados["peor_jugador_semana"]["amigos"] == ["otro"]
    assert destacados["peor_jugador_hoy"]["amigos"] == ["otro"]


def test_jugador_de_la_semana_solo_con_partidas_en_grupo(mapa):
    datos = {"ana": [p("solo", 30, k=30, d=0, a=30)], "otro": []}
    destacados = calcular_destacados(datos, mapa, AHORA_MS)
    assert destacados["mejor_jugador_semana"] is None
    assert destacados["peor_jugador_semana"] is None
