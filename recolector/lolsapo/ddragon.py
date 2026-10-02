"""Data Dragon: CDN público de Riot con imágenes y datos estáticos (no usa API key).

Se usa para saber la versión actual (con la que la web arma las URLs de imágenes) y para
traducir números (campeón, hechizo, runa, ítem) a nombres e íconos. lol.json solo incluye
los que aparecen en los datos, para que pese poco.
"""

import json
import logging
import re
from pathlib import Path

import requests

from . import __version__
from .registro import escribir_json_atomico
from .validacion import DatoInvalido, texto_limpio

URL_DDRAGON = "https://ddragon.leagueoflegends.com"
IDIOMA = "es_MX"
VERSION_CACHE = 2

_PATRON_VERSION = re.compile(r"[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}")
_PATRON_ID = re.compile(r"[A-Za-z0-9_]{1,40}")
# Ícono de runa relativo, ej. "perk-images/Styles/Domination/Electrocute/Electrocute.png".
_PATRON_ICONO_RUNA = re.compile(r"perk-images(/[A-Za-z0-9_]+)+\.png")

log = logging.getLogger(__name__)


def _validar_version(valor) -> str:
    if not isinstance(valor, str) or not _PATRON_VERSION.fullmatch(valor):
        raise DatoInvalido(f"versión de Data Dragon inesperada: {valor!r}")
    return valor


def _clave_numerica(valor) -> str:
    if isinstance(valor, int) and not isinstance(valor, bool) and valor >= 0:
        return str(valor)
    if isinstance(valor, str) and valor.isascii() and valor.isdigit():
        return str(int(valor))
    raise DatoInvalido(f"clave numérica inesperada: {valor!r}")


def _id(valor, campo: str) -> str:
    if not isinstance(valor, str) or not _PATRON_ID.fullmatch(valor):
        raise DatoInvalido(f"{campo} inesperado: {valor!r}")
    return valor


def _datos(json_ddragon) -> dict:
    if not isinstance(json_ddragon, dict) or not isinstance(json_ddragon.get("data"), dict):
        raise DatoInvalido("archivo de Data Dragon con formato inesperado")
    return json_ddragon["data"]


def validar_campeones(datos) -> dict[str, dict]:
    """champion.json -> {"103": {"id": "Ahri", "nombre": "Ahri"}, ...}."""
    campeones = {}
    for campeon in _datos(datos).values():
        if not isinstance(campeon, dict):
            raise DatoInvalido("campeón con formato inesperado")
        campeones[_clave_numerica(campeon.get("key"))] = {
            "id": _id(campeon.get("id"), "id de campeón"),
            "nombre": texto_limpio(campeon.get("name"), "name", 30),
        }
    return campeones


def validar_hechizos(datos) -> dict[str, dict]:
    """summoner.json -> {"4": {"id": "SummonerFlash", "nombre": "Destello"}, ...}."""
    hechizos = {}
    for hechizo in _datos(datos).values():
        if not isinstance(hechizo, dict):
            raise DatoInvalido("hechizo con formato inesperado")
        hechizos[_clave_numerica(hechizo.get("key"))] = {
            "id": _id(hechizo.get("id"), "id de hechizo"),
            "nombre": texto_limpio(hechizo.get("name"), "name", 40),
        }
    return hechizos


def validar_items(datos) -> dict[str, dict]:
    """item.json -> {"3031": {"nombre": "Filo del Infinito"}, ...}."""
    items = {}
    for clave, item in _datos(datos).items():
        if not isinstance(item, dict):
            raise DatoInvalido("ítem con formato inesperado")
        try:
            nombre = texto_limpio(item.get("name"), "name", 60)
        except DatoInvalido:
            continue  # Riot incluye algunos ítems internos sin nombre: se omiten.
        items[_clave_numerica(clave)] = {"nombre": nombre}
    return items


def _runa(datos) -> tuple[str, dict]:
    if not isinstance(datos, dict):
        raise DatoInvalido("runa con formato inesperado")
    icono = datos.get("icon")
    if not isinstance(icono, str) or not _PATRON_ICONO_RUNA.fullmatch(icono):
        raise DatoInvalido(f"ícono de runa inesperado: {icono!r}")
    nombre = texto_limpio(datos.get("name"), "name", 40)
    return _clave_numerica(datos.get("id")), {"nombre": nombre, "icono": icono}


def validar_runas(datos) -> dict[str, dict]:
    """runesReforged.json -> estilos y runas: {"8112": {"nombre", "icono"}, "8100": {...}}."""
    if not isinstance(datos, list):
        raise DatoInvalido("runesReforged.json debería ser una lista")
    runas = {}
    for estilo in datos:
        clave, valor = _runa(estilo)
        runas[clave] = valor
        filas = estilo.get("slots") or []
        if not isinstance(filas, list):
            raise DatoInvalido("'slots' de runas debería ser una lista")
        for fila in filas:
            lista = fila.get("runes") if isinstance(fila, dict) else None
            if not isinstance(lista, list):
                raise DatoInvalido("fila de runas con formato inesperado")
            for runa in lista:
                clave, valor = _runa(runa)
                runas[clave] = valor
    return runas


_ARCHIVOS = {
    "campeones": ("champion.json", validar_campeones),
    "hechizos": ("summoner.json", validar_hechizos),
    "items": ("item.json", validar_items),
    "runas": ("runesReforged.json", validar_runas),
}


def obtener(ruta_cache: Path, sesion: requests.Session | None = None, timeout: float = 10.0):
    """Devuelve {"version", "campeones", "hechizos", "items", "runas"} con caché por versión.

    Si Data Dragon falla, se usa el caché aunque sea de una versión anterior; si tampoco hay
    caché, devuelve None (la web muestra los datos sin imágenes).
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
        log.info("Data Dragon actualizado a la versión %s", version)
        return datos
    except (requests.RequestException, ValueError) as error:
        # DatoInvalido y JSONDecodeError heredan de ValueError.
        log.warning("No se pudo consultar Data Dragon (%s); se usa el caché", type(error).__name__)
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


def para_salida(ddragon: dict | None, usados: dict[str, set[int]]) -> dict | None:
    """Solo la versión y los elementos que aparecen en lol.json.

    `usados` es {"campeones": {...ids}, "hechizos": {...}, "items": {...}, "runas": {...}}.
    """
    if ddragon is None:
        return None
    salida = {"version": ddragon["version"]}
    for clave in _ARCHIVOS:
        disponibles = ddragon.get(clave) or {}
        ids = sorted(usados.get(clave, set()))
        salida[clave] = {str(i): disponibles[str(i)] for i in ids if str(i) in disponibles}
    return salida
