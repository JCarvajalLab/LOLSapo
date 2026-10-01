import json

import pytest
import requests
import responses

from lolsapo import ddragon
from lolsapo.validacion import DatoInvalido

URL_VERSIONES = f"{ddragon.URL_DDRAGON}/api/versions.json"


def url_campeones(version: str) -> str:
    return f"{ddragon.URL_DDRAGON}/cdn/{version}/data/es_MX/champion.json"


CAMPEONES = {
    "data": {
        "Ahri": {"id": "Ahri", "key": "103", "name": "Ahri"},
        "MonkeyKing": {"id": "MonkeyKing", "key": "62", "name": "Wukong"},
        "KSante": {"id": "KSante", "key": "897", "name": "K'Sante"},
    }
}


def test_validar_campeones_usa_la_key_numerica():
    assert ddragon.validar_campeones(CAMPEONES) == {
        "103": {"id": "Ahri", "nombre": "Ahri"},
        "62": {"id": "MonkeyKing", "nombre": "Wukong"},
        "897": {"id": "KSante", "nombre": "K'Sante"},
    }


@pytest.mark.parametrize(
    "campeon",
    [
        {"id": "../x", "key": "1", "name": "X"},
        {"id": "Ahri", "key": "abc", "name": "X"},
        {"id": "Ahri", "key": 103, "name": "X"},
        {"id": "Ahri", "key": "103", "name": ""},
    ],
)
def test_validar_campeones_invalidos(campeon):
    with pytest.raises(DatoInvalido):
        ddragon.validar_campeones({"data": {"X": campeon}})


@responses.activate
def test_obtener_descarga_y_guarda_cache(tmp_path):
    responses.get(URL_VERSIONES, json=["16.19.1", "16.18.1"])
    responses.get(url_campeones("16.19.1"), json=CAMPEONES)
    cache = tmp_path / "ddragon.json"

    datos = ddragon.obtener(cache)

    assert datos["version"] == "16.19.1"
    assert datos["campeones"]["62"]["nombre"] == "Wukong"
    assert json.loads(cache.read_text(encoding="utf-8")) == datos
    # Data Dragon es público: nunca se envía la key de Riot.
    assert all("X-Riot-Token" not in c.request.headers for c in responses.calls)


@responses.activate
def test_obtener_reutiliza_el_cache_si_la_version_no_cambio(tmp_path):
    cache = tmp_path / "ddragon.json"
    cache.write_text(json.dumps({"version": "16.19.1", "campeones": {}}), encoding="utf-8")
    responses.get(URL_VERSIONES, json=["16.19.1"])

    assert ddragon.obtener(cache) == {"version": "16.19.1", "campeones": {}}
    assert len(responses.calls) == 1  # no descarga champion.json


@responses.activate
def test_si_data_dragon_falla_usa_el_cache_anterior(tmp_path):
    cache = tmp_path / "ddragon.json"
    cache.write_text(json.dumps({"version": "16.18.1", "campeones": {}}), encoding="utf-8")
    responses.get(URL_VERSIONES, body=requests.ConnectionError("sin red"))

    assert ddragon.obtener(cache)["version"] == "16.18.1"


@pytest.mark.parametrize("versiones", [[], ["<script>"], "16.19.1", [None]])
@responses.activate
def test_versiones_invalidas_sin_cache_devuelve_none(tmp_path, versiones):
    responses.get(URL_VERSIONES, json=versiones)
    assert ddragon.obtener(tmp_path / "ddragon.json") is None


def test_para_salida_incluye_solo_los_campeones_usados():
    datos = {"version": "16.19.1", "campeones": ddragon.validar_campeones(CAMPEONES)}
    assert ddragon.para_salida(datos, {62, 103, 99999}) == {
        "version": "16.19.1",
        "campeones": {
            "62": {"id": "MonkeyKing", "nombre": "Wukong"},
            "103": {"id": "Ahri", "nombre": "Ahri"},
        },
    }
    assert ddragon.para_salida(None, {62}) is None
