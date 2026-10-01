"""Configuración del recolector: rutas, lista de amigos y API key."""

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parents[2]
RUTA_AMIGOS = RAIZ / "config" / "amigos.json"
RUTA_MODOS = RAIZ / "config" / "modos.json"
RUTA_ENV = RAIZ / ".env"
DIR_DATOS = RAIZ / "datos"
RUTA_SALIDA = RAIZ / "frontend" / "public" / "datos" / "lol.json"

MAX_AMIGOS = 10

# Riot ID = nombre (3 a 16 caracteres, sin '#' ni caracteres de control) + '#' + tag (3 a 5
# letras o números). Ej: "Big Gato#LAS".
_PATRON_RIOT_ID = re.compile(r"^(?P<nombre>[^#\x00-\x1f\x7f]{3,16})#(?P<tag>[^\W_]{3,5})$")
_PATRON_API_KEY = re.compile(r"^RGAPI-[0-9a-fA-F-]{36}$")


class ErrorConfiguracion(Exception):
    """La configuración (amigos, modos o .env) falta o no es válida."""


@dataclass(frozen=True)
class Amigo:
    nombre: str
    tag: str

    @property
    def riot_id(self) -> str:
        return f"{self.nombre}#{self.tag}"

    @property
    def slug(self) -> str:
        """Identificador seguro para nombres de archivo y URLs (ej. 'big-gato-las')."""
        return re.sub(r"\W+", "-", self.riot_id.casefold()).strip("-")


def parsear_riot_id(texto: str) -> Amigo:
    if not isinstance(texto, str):
        raise ErrorConfiguracion(f"Riot ID inválido (no es texto): {texto!r}")
    coincidencia = _PATRON_RIOT_ID.match(texto.strip())
    if not coincidencia or not coincidencia["nombre"].strip():
        raise ErrorConfiguracion(f"Riot ID inválido, se espera 'nombre#tag': {texto!r}")
    return Amigo(nombre=coincidencia["nombre"].strip(), tag=coincidencia["tag"])


def cargar_amigos(ruta: Path = RUTA_AMIGOS) -> list[Amigo]:
    try:
        datos = json.loads(Path(ruta).read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise ErrorConfiguracion(f"No existe el archivo de amigos: {ruta}") from None
    except json.JSONDecodeError as error:
        raise ErrorConfiguracion(f"El archivo de amigos no es JSON válido: {error}") from None

    lista = datos.get("amigos") if isinstance(datos, dict) else None
    if not isinstance(lista, list) or not lista:
        raise ErrorConfiguracion("El archivo de amigos debe tener una lista 'amigos' no vacía.")
    if len(lista) > MAX_AMIGOS:
        raise ErrorConfiguracion(f"Máximo {MAX_AMIGOS} amigos (hay {len(lista)}).")

    amigos = [parsear_riot_id(texto) for texto in lista]
    slugs = [amigo.slug for amigo in amigos]
    repetidos = {slug for slug in slugs if slugs.count(slug) > 1}
    if repetidos:
        raise ErrorConfiguracion(f"Riot ID repetidos en la lista de amigos: {sorted(repetidos)}")
    return amigos


def cargar_api_key(ruta_env: Path = RUTA_ENV) -> str:
    """Lee RIOT_API_KEY del entorno o de .env. Los mensajes de error nunca incluyen la key."""
    load_dotenv(ruta_env, override=False)
    api_key = os.environ.get("RIOT_API_KEY", "").strip()
    if not api_key:
        raise ErrorConfiguracion(
            "Falta RIOT_API_KEY: cópiala en el archivo .env (ver .env.example)."
        )
    if not _PATRON_API_KEY.match(api_key):
        raise ErrorConfiguracion("RIOT_API_KEY no tiene el formato esperado (RGAPI-...).")
    return api_key
