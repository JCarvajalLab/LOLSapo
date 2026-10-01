"""Data Dragon: CDN público de Riot con imágenes y datos estáticos (no usa API key).

Se usa para saber la versión actual (con la que la web arma las URLs de imágenes) y para
traducir el número de campeón (que es lo único que entrega spectator-v5) a su nombre.
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

_PATRON_VERSION = re.compile(r"[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}")
_PATRON_ID_CAMPEON = re.compile(r"[A-Za-z0-9]{1,30}")

log = logging.getLogger(__name__)


def _validar_version(valor) -> str:
    if not isinstance(valor, str) or not _PATRON_VERSION.fullmatch(valor):
        raise DatoInvalido(f"versión de Data Dragon inesperada: {valor!r}")
    return valor


def validar_campeones(datos) -> dict[str, dict]:
    """champion.json -> {"103": {"id": "Ahri", "nombre": "Ahri"}, ...}."""
    if not isinstance(datos, dict) or not isinstance(datos.get("data"), dict):
        raise DatoInvalido("champion.json con formato inesperado")
    campeones = {}
    for campeon in datos["data"].values():
        if not isinstance(campeon, dict):
            raise DatoInvalido("campeón con formato inesperado")
        id_campeon, clave = campeon.get("id"), campeon.get("key")
        if not isinstance(id_campeon, str) or not _PATRON_ID_CAMPEON.fullmatch(id_campeon):
            raise DatoInvalido(f"id de campeón inesperado: {id_campeon!r}")
        if not isinstance(clave, str) or not clave.isascii() or not clave.isdigit():
            raise DatoInvalido(f"key de campeón inesperada: {clave!r}")
        campeones[str(int(clave))] = {
            "id": id_campeon,
            "nombre": texto_limpio(campeon.get("name"), "name", 30),
        }
    return campeones


def obtener(ruta_cache: Path, sesion: requests.Session | None = None, timeout: float = 10.0):
    """Devuelve {"version", "campeones"} usando un caché local por versión.

    Si Data Dragon falla, se usa el caché aunque sea de una versión anterior; si tampoco hay
    caché, devuelve None (la web mostrará el número de campeón sin imagen).
    """
    # Sesión propia y sin headers extra: la key de Riot nunca viaja a Data Dragon.
    sesion = sesion or requests.Session()
    cabeceras = {"User-Agent": f"LOLSapo/{__version__}"}
    cache = _leer_cache(ruta_cache)
    try:
        respuesta = sesion.get(
            f"{URL_DDRAGON}/api/versions.json", headers=cabeceras, timeout=timeout
        )
        respuesta.raise_for_status()
        versiones = respuesta.json()
        if not isinstance(versiones, list) or not versiones:
            raise DatoInvalido("versions.json vacío")
        version = _validar_version(versiones[0])
        if cache and cache["version"] == version:
            return cache

        respuesta = sesion.get(
            f"{URL_DDRAGON}/cdn/{version}/data/{IDIOMA}/champion.json",
            headers=cabeceras,
            timeout=timeout,
        )
        respuesta.raise_for_status()
        datos = {"version": version, "campeones": validar_campeones(respuesta.json())}
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
        if not isinstance(datos["campeones"], dict):
            return None
        return datos
    except (FileNotFoundError, ValueError, KeyError, TypeError):
        return None


def para_salida(ddragon: dict | None, ids_usados: set[int]) -> dict | None:
    """Solo la versión y los campeones que aparecen en lol.json, para que pese poco."""
    if ddragon is None:
        return None
    campeones = ddragon["campeones"]
    return {
        "version": ddragon["version"],
        "campeones": {str(i): campeones[str(i)] for i in sorted(ids_usados) if str(i) in campeones},
    }
