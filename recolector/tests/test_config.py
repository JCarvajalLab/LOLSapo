import json

import pytest
from conftest import KEY_FALSA

from lolsapo.config import (
    RAIZ,
    Amigo,
    ErrorConfiguracion,
    cargar_amigos,
    cargar_api_key,
    parsear_riot_id,
)


@pytest.mark.parametrize(
    ("texto", "nombre", "tag"),
    [
        ("Johnadis#LAS", "Johnadis", "LAS"),
        ("Big Gato#LAS", "Big Gato", "LAS"),
        ("Nicø#LAS", "Nicø", "LAS"),
        ("  GralMogeko#LAS  ", "GralMogeko", "LAS"),
        ("abc#12345", "abc", "12345"),
    ],
)
def test_parsear_riot_id_valido(texto, nombre, tag):
    assert parsear_riot_id(texto) == Amigo(nombre, tag)


@pytest.mark.parametrize(
    "texto",
    [
        "SinTag",
        "#LAS",
        "ab#LAS",
        "Nombre#",
        "Nombre#LA",
        "Nombre#LASLAS",
        "a#b#LAS",
        "x\n1#LAS",
        42,
    ],
)
def test_parsear_riot_id_invalido(texto):
    with pytest.raises(ErrorConfiguracion):
        parsear_riot_id(texto)


def test_slug_es_seguro_para_archivos():
    assert Amigo("Big Gato", "LAS").slug == "big-gato-las"
    assert Amigo("Nicø", "LAS").slug == "nicø-las"
    assert "/" not in Amigo("a/../b", "LAS").slug


def test_cargar_amigos_del_repo():
    amigos = cargar_amigos(RAIZ / "config" / "amigos.json")
    assert 1 <= len(amigos) <= 10
    assert all(isinstance(a, Amigo) for a in amigos)


def test_cargar_amigos_rechaza_repetidos(tmp_path):
    ruta = tmp_path / "amigos.json"
    ruta.write_text(json.dumps({"amigos": ["Uno#LAS", "uno#las"]}), encoding="utf-8")
    with pytest.raises(ErrorConfiguracion, match="repetidos"):
        cargar_amigos(ruta)


@pytest.mark.parametrize("contenido", ["no es json", "[]", '{"amigos": []}', '{"amigos": "x"}'])
def test_cargar_amigos_invalido(tmp_path, contenido):
    ruta = tmp_path / "amigos.json"
    ruta.write_text(contenido, encoding="utf-8")
    with pytest.raises(ErrorConfiguracion):
        cargar_amigos(ruta)


def test_cargar_amigos_inexistente(tmp_path):
    with pytest.raises(ErrorConfiguracion, match="No existe"):
        cargar_amigos(tmp_path / "nada.json")


@pytest.fixture
def sin_key(monkeypatch):
    """Quita RIOT_API_KEY del entorno y lo deja como estaba al terminar el test."""
    monkeypatch.setenv("RIOT_API_KEY", "")
    monkeypatch.delenv("RIOT_API_KEY")


def test_api_key_desde_env(sin_key, tmp_path):
    ruta_env = tmp_path / ".env"
    ruta_env.write_text(f"RIOT_API_KEY={KEY_FALSA}\n", encoding="utf-8")
    assert cargar_api_key(ruta_env) == KEY_FALSA


def test_api_key_faltante(sin_key, tmp_path):
    with pytest.raises(ErrorConfiguracion, match="Falta RIOT_API_KEY"):
        cargar_api_key(tmp_path / "no-existe.env")


def test_api_key_con_formato_invalido_no_se_muestra(monkeypatch, tmp_path):
    monkeypatch.setenv("RIOT_API_KEY", "clave-secreta-mal-copiada")
    with pytest.raises(ErrorConfiguracion) as error:
        cargar_api_key(tmp_path / "no-existe.env")
    assert "clave-secreta-mal-copiada" not in str(error.value)
