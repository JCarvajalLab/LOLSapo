import json

import pytest

from lolsapo.registro import (
    agregar_partidas,
    calcular_estadisticas,
    escribir_json_atomico,
    ids_nuevos,
    leer_registro,
    registro_vacio,
    ultimas_partidas,
    winrate,
)


def resumen(id_partida: str, resultado="victoria", queue_id=420, fecha=1) -> dict:
    return {"id": id_partida, "resultado": resultado, "queue_id": queue_id, "fecha": fecha}


def test_ids_nuevos_omite_los_ya_guardados():
    registro = registro_vacio("A#LAS", 0)
    agregar_partidas(registro, [resumen("LA2_1"), resumen("LA2_2")])
    assert ids_nuevos(["LA2_3", "LA2_2", "LA2_1", "LA2_0"], registro) == ["LA2_3", "LA2_0"]


def test_agregar_no_duplica():
    registro = registro_vacio("A#LAS", 0)
    assert agregar_partidas(registro, [resumen("LA2_1"), resumen("LA2_1")]) == 1
    assert agregar_partidas(registro, [resumen("LA2_1"), resumen("LA2_2")]) == 1
    assert len(registro["partidas"]) == 2


def test_ultimas_partidas_ordenadas_por_fecha():
    registro = registro_vacio("A#LAS", 0)
    agregar_partidas(registro, [resumen(f"LA2_{i}", fecha=i) for i in range(15)])
    ultimas = ultimas_partidas(registro, 10)
    assert [p["fecha"] for p in ultimas] == list(range(14, 4, -1))


@pytest.mark.parametrize(
    ("victorias", "derrotas", "esperado"), [(0, 0, None), (1, 0, 100.0), (2, 1, 66.7), (1, 3, 25.0)]
)
def test_winrate(victorias, derrotas, esperado):
    assert winrate(victorias, derrotas) == esperado


def test_estadisticas_por_modo_y_categoria(mapa):
    partidas = [
        resumen("1", "victoria", 420),
        resumen("2", "derrota", 420),
        resumen("3", "victoria", 450),
        resumen("4", "victoria", 2400),
        resumen("5", "derrota", 400),
        resumen("6", "remake", 420),
        resumen("7", "victoria", 99999),  # modo desconocido
        resumen("8", "derrota", 88888),  # otro modo desconocido
    ]
    stats = calcular_estadisticas(partidas, mapa)

    assert stats["total"] == {
        "partidas": 8,
        "victorias": 4,
        "derrotas": 3,
        "remakes": 1,
        "winrate": 57.1,
    }
    assert stats["por_categoria"]["ranked"]["victorias"] == 1
    assert stats["por_categoria"]["ranked"]["remakes"] == 1
    assert stats["por_categoria"]["aram"] == {
        "partidas": 2,
        "victorias": 2,
        "derrotas": 0,
        "remakes": 0,
        "winrate": 100.0,
    }
    assert stats["por_categoria"]["normal"]["winrate"] == 0.0

    por_nombre = {m["nombre"]: m for m in stats["por_modo"]}
    assert por_nombre["Clasificatoria Solo/Dúo"]["partidas"] == 3
    assert por_nombre["ARAM Caos"]["categoria"] == "aram"
    # Los dos modos desconocidos se agrupan en una sola fila.
    assert por_nombre["Modo especial"]["partidas"] == 2
    assert stats["por_modo"][0]["nombre"] == "Clasificatoria Solo/Dúo"  # el más jugado primero


def test_estadisticas_sin_partidas(mapa):
    stats = calcular_estadisticas([], mapa)
    assert stats["total"]["partidas"] == 0
    assert stats["total"]["winrate"] is None
    assert stats["por_modo"] == []


def test_registro_ida_y_vuelta(tmp_path):
    ruta = tmp_path / "registro" / "a-las.json"
    registro = leer_registro(ruta, "A#LAS", 123)
    assert registro == registro_vacio("A#LAS", 123)
    agregar_partidas(registro, [resumen("LA2_1")])
    escribir_json_atomico(ruta, registro)
    assert leer_registro(ruta, "A#LAS", 999) == registro
    assert list(ruta.parent.iterdir()) == [ruta]  # no quedan temporales


@pytest.mark.parametrize("contenido", ["{roto", '{"version": 99, "partidas": {}}', "[]"])
def test_registro_danado_no_se_pisa(tmp_path, contenido):
    ruta = tmp_path / "a-las.json"
    ruta.write_text(contenido, encoding="utf-8")
    with pytest.raises(ValueError):
        leer_registro(ruta, "A#LAS", 0)
    assert ruta.read_text(encoding="utf-8") == contenido


def test_escritura_atomica_conserva_unicode(tmp_path):
    ruta = tmp_path / "x.json"
    escribir_json_atomico(ruta, {"nombre": "Nicø"})
    assert "Nicø" in ruta.read_text(encoding="utf-8")
    assert json.loads(ruta.read_text(encoding="utf-8")) == {"nombre": "Nicø"}
