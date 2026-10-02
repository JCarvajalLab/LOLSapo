"""Configuración del recolector: rutas, lista de amigos y API key."""

import hashlib
import json
import os
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parents[2]
RUTA_AMIGOS = RAIZ / "config" / "amigos.json"
RUTA_MODOS = RAIZ / "config" / "modos.json"
RUTA_ENV = RAIZ / ".env"
DIR_DATOS = RAIZ / "datos"
RUTA_SALIDA = RAIZ / "frontend" / "public" / "datos" / "lol.json"
RUTA_MODOS_TFT = RAIZ / "config" / "modos_tft.json"
RUTA_SALIDA_TFT = RAIZ / "frontend" / "public" / "datos" / "tft.json"

MAX_AMIGOS = 10

# Riot ID = nombre (3 a 16 caracteres, sin '#') + '#' + tag (3 a 5 letras o números).
# Ej: "Big Gato#LAS". Los caracteres invisibles se rechazan aparte (ver tiene_invisibles).
_PATRON_RIOT_ID = re.compile(r"^(?P<nombre>[^#]{3,16})#(?P<tag>[^\W_]{3,5})$")
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
        """Identificador ASCII seguro para nombres de archivo y URLs (ej. 'big-gato-las')."""
        return f"{_ascii(self.nombre)}-{_ascii(self.tag)}"


def _ascii(texto: str) -> str:
    """'Nicø' -> 'nic', 'Big Gato' -> 'big-gato'. Si no queda nada ASCII, usa un hash corto."""
    base = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().casefold()
    limpio = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    if limpio:
        return limpio
    return "j" + hashlib.sha256(texto.encode()).hexdigest()[:8]


def tiene_invisibles(texto: str) -> bool:
    """Caracteres de control (Cc) o de formato invisibles (Cf), como los bidireccionales."""
    return any(unicodedata.category(c) in ("Cc", "Cf") for c in texto)


def parsear_riot_id(texto: str) -> Amigo:
    if not isinstance(texto, str):
        raise ErrorConfiguracion(f"Riot ID inválido (no es texto): {texto!r}")
    if tiene_invisibles(texto):
        raise ErrorConfiguracion(f"Riot ID con caracteres invisibles: {texto!r}")
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


def cargar_api_key_tft(ruta_env: Path = RUTA_ENV) -> str | None:
    """Lee RIOT_API_KEY_TFT (opcional). Si no está, TFT usa la misma key que LoL (None)."""
    load_dotenv(ruta_env, override=False)
    api_key = os.environ.get("RIOT_API_KEY_TFT", "").strip()
    if not api_key:
        return None
    if not _PATRON_API_KEY.match(api_key):
        raise ErrorConfiguracion("RIOT_API_KEY_TFT no tiene el formato esperado (RGAPI-...).")
    return api_key
