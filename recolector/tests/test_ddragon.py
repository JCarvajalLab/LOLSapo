import json

import pytest
import requests
import responses

from lolsapo import ddragon
from lolsapo.validacion import DatoInvalido

URL_VERSIONES = f"{ddragon.URL_DDRAGON}/api/versions.json"


def url_datos(version: str, archivo: str) -> str:
    return f"{ddragon.URL_DDRAGON}/cdn/{version}/data/es_MX/{archivo}"


CAMPEONES = {
    "data": {
        "Ahri": {"id": "Ahri", "key": "103", "name": "Ahri"},
        "MonkeyKing": {"id": "MonkeyKing", "key": "62", "name": "Wukong"},
        "KSante": {"id": "KSante", "key": "897", "name": "K'Sante"},
    }
}
HECHIZOS = {"data": {"SummonerFlash": {"id": "SummonerFlash", "key": "4", "name": "Destello"}}}
ITEMS = {"data": {"3031": {"name": "Filo del Infinito"}, "3006": {"name": "Grebas"}}}
RUNAS = [
    {
        "id": 8100,
        "key": "Domination",
        "icon": "perk-images/Styles/7200_Domination.png",
        "name": "Dominación",
        "slots": [
            {
                "runes": [
                    {
                        "id": 8112,
                        "icon": "perk-images/Styles/Domination/Electrocute/Electrocute.png",
                        "name": "Electrocutar",
                    }
                ]
            }
        ],
    }
]


def simular_ddragon(version="16.19.1"):
    responses.get(URL_VERSIONES, json=[version, "16.18.1"])
    responses.get(url_datos(version, "champion.json"), json=CAMPEONES)
    responses.get(url_datos(version, "summoner.json"), json=HECHIZOS)
    responses.get(url_datos(version, "item.json"), json=ITEMS)
    responses.get(url_datos(version, "runesReforged.json"), json=RUNAS)


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
        {"id": "Ahri", "key": "-1", "name": "X"},
        {"id": "Ahri", "key": "103", "name": ""},
    ],
)
def test_validar_campeones_invalidos(campeon):
    with pytest.raises(DatoInvalido):
        ddragon.validar_campeones({"data": {"X": campeon}})


def test_validar_hechizos_items_y_runas():
    assert ddragon.validar_hechizos(HECHIZOS) == {
        "4": {"id": "SummonerFlash", "nombre": "Destello"}
    }
    assert ddragon.validar_items(ITEMS)["3031"] == {"nombre": "Filo del Infinito"}
    runas = ddragon.validar_runas(RUNAS)
    assert runas["8100"]["nombre"] == "Dominación"
    assert runas["8112"]["icono"].endswith("Electrocute.png")


@pytest.mark.parametrize("slots", ["texto", ["fila"], [{"runes": "x"}]])
def test_runas_con_slots_raros_son_dato_invalido(slots):
    estilo = {**RUNAS[0], "slots": slots}
    with pytest.raises(DatoInvalido):
        ddragon.validar_runas([estilo])


def test_items_sin_nombre_se_omiten():
    items = {"data": {"3031": {"name": "Filo del Infinito"}, "9999": {"name": ""}}}
    assert ddragon.validar_items(items) == {"3031": {"nombre": "Filo del Infinito"}}


@pytest.mark.parametrize(
    "icono",
    [
        "../../etc/passwd.png",
        "perk-images/../x.png",
        "https://malicioso.example/x.png",
        "perk-images/x.svg",
    ],
)
def test_iconos_de_runa_invalidos(icono):
    with pytest.raises(DatoInvalido):
        ddragon.validar_runas([{"id": 1, "icon": icono, "name": "X", "slots": []}])


@responses.activate
def test_obtener_descarga_y_guarda_cache(tmp_path):
    simular_ddragon()
    cache = tmp_path / "ddragon.json"

    datos = ddragon.obtener(cache)

    assert datos["version"] == "16.19.1"
    assert datos["campeones"]["62"]["nombre"] == "Wukong"
    assert datos["hechizos"]["4"]["id"] == "SummonerFlash"
    assert json.loads(cache.read_text(encoding="utf-8")) == datos
    # Data Dragon es público: nunca se envía la key de Riot.
    assert all("X-Riot-Token" not in c.request.headers for c in responses.calls)


@responses.activate
def test_obtener_reutiliza_el_cache_si_la_version_no_cambio(tmp_path):
    simular_ddragon()
    cache = tmp_path / "ddragon.json"
    ddragon.obtener(cache)
    responses.calls.reset()

    assert ddragon.obtener(cache)["version"] == "16.19.1"
    assert len(responses.calls) == 1  # solo versions.json


@responses.activate
def test_si_data_dragon_falla_usa_el_cache_anterior(tmp_path):
    simular_ddragon("16.18.1")
    cache = tmp_path / "ddragon.json"
    ddragon.obtener(cache)
    responses.reset()
    responses.get(URL_VERSIONES, body=requests.ConnectionError("sin red"))

    assert ddragon.obtener(cache)["version"] == "16.18.1"


def test_cache_de_formato_anterior_se_ignora(tmp_path):
    cache = tmp_path / "ddragon.json"
    cache.write_text(json.dumps({"version": "16.19.1", "campeones": {}}), encoding="utf-8")
    assert ddragon._leer_cache(cache) is None


@pytest.mark.parametrize("versiones", [[], ["<script>"], "16.19.1", [None]])
@responses.activate
def test_versiones_invalidas_sin_cache_devuelve_none(tmp_path, versiones):
    responses.get(URL_VERSIONES, json=versiones)
    assert ddragon.obtener(tmp_path / "ddragon.json") is None


def test_para_salida_incluye_solo_lo_usado():
    datos = {
        "version": "16.19.1",
        "campeones": ddragon.validar_campeones(CAMPEONES),
        "hechizos": ddragon.validar_hechizos(HECHIZOS),
        "items": ddragon.validar_items(ITEMS),
        "runas": ddragon.validar_runas(RUNAS),
    }
    salida = ddragon.para_salida(
        datos, {"campeones": {62, 99999}, "items": {3031}, "runas": {8112}, "hechizos": set()}
    )
    assert salida == {
        "version": "16.19.1",
        "campeones": {"62": {"id": "MonkeyKing", "nombre": "Wukong"}},
        "hechizos": {},
        "items": {"3031": {"nombre": "Filo del Infinito"}},
        "runas": {
            "8112": {
                "nombre": "Electrocutar",
                "icono": "perk-images/Styles/Domination/Electrocute/Electrocute.png",
            }
        },
    }
    assert ddragon.para_salida(None, {}) is None
