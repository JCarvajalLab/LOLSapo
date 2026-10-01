import json

import pytest

from lolsapo.config import ErrorConfiguracion
from lolsapo.modos import CATEGORIAS, NOMBRE_DESCONOCIDO, MapaModos


@pytest.mark.parametrize(
    ("queue_id", "nombre", "categoria"),
    [
        (420, "Clasificatoria Solo/Dúo", "ranked"),
        (440, "Clasificatoria Flexible", "ranked"),
        (400, "Normal (Reclutamiento)", "normal"),
        (450, "ARAM", "aram"),
        (2400, "ARAM Caos", "aram"),
        (1700, "Arena", "otros"),
    ],
)
def test_modos_conocidos(mapa, queue_id, nombre, categoria):
    modo = mapa.obtener(queue_id)
    assert (modo.queue_id, modo.nombre, modo.categoria) == (queue_id, nombre, categoria)


@pytest.mark.parametrize("queue_id", [99999, None, -1])
def test_modo_desconocido_es_modo_especial(mapa, queue_id):
    modo = mapa.obtener(queue_id)
    assert modo.nombre == NOMBRE_DESCONOCIDO
    assert modo.categoria == "otros"
    assert not mapa.conocido(queue_id)


def test_archivo_del_repo_solo_usa_categorias_validas(mapa):
    for queue_id in (0, 420, 450, 2400):
        assert mapa.obtener(queue_id).categoria in CATEGORIAS


@pytest.mark.parametrize(
    "modos",
    [
        {"420": {"nombre": "SoloQ", "categoria": "inventada"}},
        {"420": {"nombre": "", "categoria": "ranked"}},
        {"no-numero": {"nombre": "X", "categoria": "otros"}},
        {"420": {"nombre": "Sin categoría"}},
    ],
)
def test_archivo_de_modos_invalido(tmp_path, modos):
    ruta = tmp_path / "modos.json"
    ruta.write_text(json.dumps({"modos": modos}), encoding="utf-8")
    with pytest.raises(ErrorConfiguracion):
        MapaModos.desde_archivo(ruta)
