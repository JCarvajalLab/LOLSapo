"""Data Dragon para TFT: nombres e imágenes de unidades, rasgos e ítems (no usa API key).

Riot indexa estos archivos por ruta interna; aquí se reindexan por el `id` que usa la API de
partidas (ej. "DA_18_Sivir"). tft.json solo incluye los que aparecen en los datos.
"""

import json
import logging
import re
from pathlib import Path

import requests

from . import __version__
from .ddragon import IDIOMA, URL_DDRAGON, _datos, _validar_version
from .registro import escribir_json_atomico
from .validacion import DatoInvalido, texto_limpio
from .validacion_tft import _PATRON_ID_TFT

VERSION_CACHE = 1

# Nombre de archivo de imagen, ej. "TFT18_Sivir_splash_centered_61.TFT_Set18.png".
_PATRON_IMAGEN = re.compile(r"[A-Za-z0-9_.-]{1,120}\.png")

log = logging.getLogger(__name__)


def _validar(datos, con_costo: bool) -> dict[str, dict]:
    resultado = {}
    for elemento in _datos(datos).values():
        if not isinstance(elemento, dict):
            raise DatoInvalido("elemento de TFT con formato inesperado")
        id_tft = elemento.get("id")
        imagen = elemento.get("image")
        imagen = imagen.get("full") if isinstance(imagen, dict) else None
        if not isinstance(id_tft, str) or not _PATRON_ID_TFT.fullmatch(id_tft):
            raise DatoInvalido(f"id de TFT inesperado: {id_tft!r}")
        if not isinstance(imagen, str) or not _PATRON_IMAGEN.fullmatch(imagen):
            raise DatoInvalido(f"imagen de TFT inesperada: {imagen!r}")
        try:
            nombre = texto_limpio(elemento.get("name"), "name", 60)
        except DatoInvalido:
            continue  # Riot incluye algunos elementos internos sin nombre: se omiten.
        valor = {"nombre": nombre, "imagen": imagen}
        if con_costo:
            costo = elemento.get("cost")
            valor["costo"] = costo if isinstance(costo, int) and not isinstance(costo, bool) else 0
        resultado[id_tft] = valor
    return resultado


def validar_campeones(datos) -> dict[str, dict]:
    """tft-champion.json -> {"DA_18_Sivir": {"nombre", "imagen", "costo"}, ...}."""
    return _validar(datos, con_costo=True)


def validar_rasgos(datos) -> dict[str, dict]:
    """tft-trait.json -> {"DA_Primal18": {"nombre", "imagen"}, ...}."""
    return _validar(datos, con_costo=False)


def validar_items(datos) -> dict[str, dict]:
    """tft-item.json -> {"DA_InfinityEdge": {"nombre", "imagen"}, ...}."""
    return _validar(datos, con_costo=False)


_ARCHIVOS = {
    "campeones": ("tft-champion.json", validar_campeones),
    "rasgos": ("tft-trait.json", validar_rasgos),
    "items": ("tft-item.json", validar_items),
}


def obtener(ruta_cache: Path, sesion: requests.Session | None = None, timeout: float = 10.0):
    """Devuelve {"version", "campeones", "rasgos", "items"} con caché por versión.

    Si Data Dragon falla se usa el caché; si tampoco hay, None (la web muestra solo textos).
    """
    # Sesión propia y sin headers extra: la key de Riot nunca viaja a Data Dragon.
    sesion = sesion or requests.Session()
    cabeceras = {"User-Agent": f"LOLSapo/{__version__}"}
    cache = _leer_cache(ruta_cache)

    def descargar(url: str):
        respuesta = sesion.get(url, headers=cabeceras, timeout=timeout, allow_redirects=False)
        respuesta.raise_for_status()
        return respuesta.json()

    try:
        versiones = descargar(f"{URL_DDRAGON}/api/versions.json")
        if not isinstance(versiones, list) or not versiones:
            raise DatoInvalido("versions.json vacío")
        version = _validar_version(versiones[0])
        if cache and cache["version"] == version:
            return cache

        datos = {"version_cache": VERSION_CACHE, "version": version}
        for clave, (archivo, validar) in _ARCHIVOS.items():
            datos[clave] = validar(
                descargar(f"{URL_DDRAGON}/cdn/{version}/data/{IDIOMA}/{archivo}")
            )
        escribir_json_atomico(ruta_cache, datos)
        log.info("Data Dragon de TFT actualizado a la versión %s", version)
        return datos
    except (requests.RequestException, ValueError) as error:
        log.warning(
            "No se pudo consultar Data Dragon de TFT (%s); se usa el caché", type(error).__name__
        )
        return cache


def _leer_cache(ruta: Path) -> dict | None:
    try:
        datos = json.loads(Path(ruta).read_text(encoding="utf-8"))
        _validar_version(datos["version"])
        if datos.get("version_cache") != VERSION_CACHE:
            return None
        if not all(isinstance(datos[clave], dict) for clave in _ARCHIVOS):
            return None
        return datos
    except (FileNotFoundError, ValueError, KeyError, TypeError):
        return None


def para_salida(ddragon: dict | None, usados: dict[str, set[str]]) -> dict | None:
    """Solo la versión y los elementos que aparecen en tft.json."""
    if ddragon is None:
        return None
    salida = {"version": ddragon["version"]}
    for clave in _ARCHIVOS:
        disponibles = ddragon.get(clave) or {}
        ids = sorted(usados.get(clave, set()))
        salida[clave] = {i: disponibles[i] for i in ids if i in disponibles}
    return salida
