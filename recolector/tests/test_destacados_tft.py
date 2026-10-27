"""Pruebas unitarias para los destacados semanales y mensuales de TFT."""

from datetime import UTC, datetime

import pytest

from lolsapo.destacados_tft import (
    calcular_destacados_tft,
    partidas_validas_tft,
)
from lolsapo.modos import MapaModos, Modo

# Jueves 1 de octubre de 2026 17:00 Chile (semana empezó el lunes 28 sept 01:00 Chile)
AHORA = datetime(2026, 10, 1, 20, 0, tzinfo=UTC)
AHORA_MS = int(AHORA.timestamp() * 1000)
HORA = 60 * 60 * 1000


@pytest.fixture
def mapa_tft():
    return MapaModos(
        {
            1100: Modo(1100, "Clasificatoria", "ranked"),
            1090: Modo(1090, "Normal", "normal"),
            1160: Modo(1160, "Dúo dinámico", "ranked"),
            0: Modo(0, "Personalizada", "otros"),
            1110: Modo(1110, "Tutorial", "otros"),
        }
    )


def p_tft(
    id_partida: str,
    horas_atras: int,
    puesto: int,
    danio: int = 50,
    eliminados: int = 2,
    nivel: int = 8,
    ronda: int = 32,
    queue_id: int = 1100,
):
    return {
        "id": id_partida,
        "fecha": AHORA_MS - horas_atras * HORA,
        "queue_id": queue_id,
        "puesto": puesto,
        "danio": danio,
        "eliminados": eliminados,
        "nivel": nivel,
        "ronda": ronda,
        "unidades": [{"id": "DA_18_Sett", "estrellas": 2, "rareza": 3, "items": []}],
        "rasgos": [{"id": "DA_18_Adaptor", "unidades": 4, "estilo": 4, "nivel": 3, "unico": False}],
    }


def test_filtra_partidas_invalidas_o_tutorial():
    partidas = [
        p_tft("p1", 5, puesto=1, queue_id=1100),
        p_tft("p_tuto", 4, puesto=1, queue_id=1110),  # tutorial
        p_tft("p_custom", 3, puesto=1, queue_id=0),  # personalizada
        {"id": "inv1", "puesto": 0, "fecha": AHORA_MS - 2 * HORA},  # puesto inválido
        {"id": "inv2", "puesto": 9, "fecha": AHORA_MS - 2 * HORA},  # puesto inválido
        {"id": "inv3", "puesto": 3, "fecha": None},  # sin fecha
    ]
    validas = partidas_validas_tft(partidas, desde_ms=AHORA_MS - 10 * HORA)
    assert len(validas) == 1
    assert validas[0]["id"] == "p1"


def test_mejor_jugador_elige_puesto_1_y_desempata_por_danio(mapa_tft):
    registradas = {
        "amigo_a": [
            p_tft("a1", 10, puesto=1, danio=80, eliminados=3, nivel=9),
        ],
        "amigo_b": [
            p_tft("b1", 12, puesto=1, danio=120, eliminados=4, nivel=9),  # más daño
        ],
    }
    destacados = calcular_destacados_tft(registradas, mapa_tft, AHORA_MS)
    mejor = destacados["mejor_jugador_semana"]
    assert mejor is not None
    assert mejor["amigos"] == ["amigo_b"]
    assert mejor["partida_id"] == "b1"
    assert mejor["puesto"] == 1
    assert mejor["danio"] == 120


def test_peor_jugador_elige_puesto_8(mapa_tft):
    registradas = {
        "amigo_a": [
            p_tft("a1", 10, puesto=5, danio=30),
        ],
        "amigo_b": [
            p_tft("b1", 12, puesto=8, danio=10, ronda=22),
        ],
    }
    destacados = calcular_destacados_tft(registradas, mapa_tft, AHORA_MS)
    peor = destacados["peor_jugador_semana"]
    assert peor is not None
    assert peor["amigos"] == ["amigo_b"]
    assert peor["partida_id"] == "b1"
    assert peor["puesto"] == 8


def test_mejor_top4_requiere_minimo_de_partidas(mapa_tft):
    registradas = {
        # Amigo A tiene 100% top4 pero solo 1 partida (no llega a MINIMO_PARTIDAS_SEMANA = 2)
        "amigo_a": [
            p_tft("a1", 10, puesto=1),
        ],
        # Amigo B tiene 2 partidas, 100% top 4
        "amigo_b": [
            p_tft("b1", 12, puesto=2),
            p_tft("b2", 14, puesto=3),
        ],
    }
    destacados = calcular_destacados_tft(registradas, mapa_tft, AHORA_MS)
    top4 = destacados["mejor_top4_semana"]
    assert top4 is not None
    assert top4["amigos"] == ["amigo_b"]
    assert top4["top4_pct"] == 100.0
    assert top4["partidas"] == 2


def test_mas_partidas_y_balance_del_grupo(mapa_tft):
    registradas = {
        "amigo_a": [
            p_tft("a1", 5, puesto=1),
            p_tft("a2", 6, puesto=2),
            p_tft("a3", 7, puesto=5),
        ],
        "amigo_b": [
            p_tft("b1", 8, puesto=8),
        ],
    }
    destacados = calcular_destacados_tft(registradas, mapa_tft, AHORA_MS)

    # Mas partidas
    mas = destacados["mas_partidas_semana"]
    assert mas["amigos"] == ["amigo_a"]
    assert mas["partidas"] == 3

    # Balance
    bal = destacados["balance_semana"]
    assert bal["partidas"] == 4
    assert bal["primeros"] == 1
    assert bal["top4"] == 2
    assert bal["top4_pct"] == 50.0
    assert bal["promedio"] == 4.0  # (1+2+5+8)/4 = 16/4 = 4.0
    assert bal["amigos"] == ["amigo_a", "amigo_b"]


def test_tops_y_tops_global_generados_correctamente(mapa_tft):
    registradas = {
        "amigo_a": [
            p_tft("a1", 5, puesto=1, danio=100),
            p_tft("a2", 6, puesto=1, danio=90),
        ],
        "amigo_b": [
            p_tft("b1", 7, puesto=2, danio=80),
        ],
    }
    destacados = calcular_destacados_tft(registradas, mapa_tft, AHORA_MS)

    # Tops por amigo (máximo 1 por amigo)
    tops_partida = destacados["tops"]["mejor_jugador_semana"]
    assert len(tops_partida) == 2
    assert tops_partida[0]["amigos"] == ["amigo_a"]
    assert tops_partida[0]["partida_id"] == "a1"
    assert tops_partida[1]["amigos"] == ["amigo_b"]

    # Tops global (puede incluir varias partidas del mismo amigo)
    global_partida = destacados["tops_global"]["mejor_jugador_semana"]
    assert len(global_partida) == 3
    assert global_partida[0]["partida_id"] == "a1"
    assert global_partida[1]["partida_id"] == "a2"
    assert global_partida[2]["partida_id"] == "b1"


def test_sin_partidas_devuelve_campos_en_none(mapa_tft):
    registradas = {"amigo_a": [], "amigo_b": []}
    destacados = calcular_destacados_tft(registradas, mapa_tft, AHORA_MS)
    assert destacados["mejor_jugador_semana"] is None
    assert destacados["mejor_top4_semana"] is None
    assert destacados["mas_partidas_semana"] is None
    assert destacados["balance_semana"] is None
    assert destacados["peor_jugador_semana"] is None
    assert destacados["tops"]["mejor_jugador_semana"] == []
    assert destacados["tops_global"]["mejor_jugador_semana"] == []
