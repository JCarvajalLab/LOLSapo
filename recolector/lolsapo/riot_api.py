"""Cliente de la API de Riot. Es el único módulo que hace llamadas a Riot.

- La key viaja solo en el header X-Riot-Token; nunca en URLs, logs ni mensajes de error.
- Un limitador local evita superar los límites de la key.
- 429 se reintenta respetando Retry-After; 5xx y errores de red, con espera creciente.
"""

import logging
import re
import time
from collections import deque
from collections.abc import Callable
from urllib.parse import quote, urlsplit

import requests

from . import __version__

PLATAFORMA = "la2"
REGION = "americas"
URL_PLATAFORMA = f"https://{PLATAFORMA}.api.riotgames.com"
URL_REGION = f"https://{REGION}.api.riotgames.com"

# Límites de la development key: 20 llamadas/1 s y 100 llamadas/2 min. Usamos un margen.
VENTANAS_DEV_KEY = ((18, 1.0), (95, 120.0))

# Segmentos de URL con datos de jugadores (PUUID o Riot ID) que se ocultan en los logs.
_SEGMENTO_PRIVADO = re.compile(r"(by-puuid|by-summoner|by-riot-id)/.*?(?=/ids$|$)")

log = logging.getLogger(__name__)


class ErrorRiot(Exception):
    def __init__(self, mensaje: str, estado: int | None = None):
        super().__init__(mensaje)
        self.estado = estado


class ErrorAutenticacion(ErrorRiot):
    """401/403: la key no es válida o caducó (la dev key dura 24 horas)."""


class NoEncontrado(ErrorRiot):
    """404 en un recurso que debería existir (ej. un Riot ID mal escrito)."""


class PeticionInvalida(ErrorRiot):
    """400: suele pasar al usar un PUUID obtenido con otra key."""


class Limitador:
    """Ventanas deslizantes: como máximo `limite` llamadas cada `segundos`."""

    def __init__(
        self,
        ventanas=VENTANAS_DEV_KEY,
        reloj: Callable[[], float] = time.monotonic,
        dormir: Callable[[float], None] = time.sleep,
    ):
        self._ventanas = tuple(ventanas)
        self._reloj = reloj
        self._dormir = dormir
        self._historial: deque[float] = deque()
        self._ventana_mayor = max(segundos for _, segundos in self._ventanas)

    def esperar_turno(self) -> None:
        while True:
            ahora = self._reloj()
            while self._historial and ahora - self._historial[0] >= self._ventana_mayor:
                self._historial.popleft()
            espera = 0.0
            for limite, segundos in self._ventanas:
                recientes = [t for t in self._historial if ahora - t < segundos]
                if len(recientes) >= limite:
                    espera = max(espera, segundos - (ahora - recientes[-limite]))
            if espera <= 0:
                self._historial.append(ahora)
                return
            if espera > 5:
                log.info("Límite de la API alcanzado, esperando %.0f s...", espera)
            self._dormir(espera)


def _segmento(valor: str) -> str:
    return quote(valor, safe="")


class ClienteRiot:
    def __init__(
        self,
        api_key: str,
        *,
        sesion: requests.Session | None = None,
        limitador: Limitador | None = None,
        dormir: Callable[[float], None] = time.sleep,
        max_reintentos: int = 3,
        timeout: float = 10.0,
    ):
        self._sesion = sesion or requests.Session()
        self._sesion.headers.update(
            {
                "X-Riot-Token": api_key,
                "Accept": "application/json",
                "User-Agent": f"LOLSapo/{__version__}",
            }
        )
        self._limitador = limitador or Limitador(dormir=dormir)
        self._dormir = dormir
        self._max_reintentos = max_reintentos
        self._timeout = timeout

    def __repr__(self) -> str:
        return "ClienteRiot(api_key=***)"

    def _get(self, url: str, params: dict | None = None, *, permitir_404: bool = False):
        ruta = _ruta_para_logs(url)
        ultimo_estado = None
        for intento in range(self._max_reintentos + 1):
            self._limitador.esperar_turno()
            try:
                # Sin redirecciones: requests reenviaría X-Riot-Token al host de destino.
                respuesta = self._sesion.get(
                    url, params=params, timeout=self._timeout, allow_redirects=False
                )
            except requests.RequestException as error:
                ultimo_estado = None
                log.warning(
                    "Error de red en %s (%s), reintento %d", ruta, type(error).__name__, intento + 1
                )
                self._dormir(2**intento)
                continue

            estado = ultimo_estado = respuesta.status_code
            if estado == 200:
                try:
                    return respuesta.json()
                except ValueError:
                    raise ErrorRiot(
                        f"Riot devolvió una respuesta que no es JSON en {ruta}", estado
                    ) from None
            if 300 <= estado < 400:
                raise ErrorRiot(f"Riot respondió una redirección ({estado}) en {ruta}", estado)
            if estado == 404:
                if permitir_404:
                    return None
                raise NoEncontrado(f"Riot no encontró el recurso {ruta}", estado)
            if estado == 429:
                espera = _retry_after(respuesta)
                log.warning("Riot respondió 429 (límite), esperando %.0f s", espera)
                self._dormir(espera)
                continue
            if estado >= 500:
                log.warning("Riot respondió %d en %s, reintento %d", estado, ruta, intento + 1)
                self._dormir(2**intento)
                continue
            if estado in (401, 403):
                raise ErrorAutenticacion(
                    f"Riot rechazó la API key ({estado}). Si es la dev key, renuévala en el portal",
                    estado,
                )
            if estado == 400:
                raise PeticionInvalida(f"Riot respondió 400 en {ruta}", estado)
            raise ErrorRiot(f"Riot respondió {estado} en {ruta}", estado)

        raise ErrorRiot(
            f"Riot no respondió bien tras {self._max_reintentos + 1} intentos en {ruta}",
            ultimo_estado,
        )

    # --- Endpoints -----------------------------------------------------------------

    def cuenta_por_riot_id(self, nombre: str, tag: str) -> dict:
        """account-v1: Riot ID -> cuenta (incluye el PUUID)."""
        url = (
            f"{URL_REGION}/riot/account/v1/accounts/by-riot-id/{_segmento(nombre)}/{_segmento(tag)}"
        )
        return self._get(url)

    def invocador(self, puuid: str) -> dict:
        """summoner-v4: nivel e ícono."""
        return self._get(f"{URL_PLATAFORMA}/lol/summoner/v4/summoners/by-puuid/{_segmento(puuid)}")

    def ligas(self, puuid: str) -> list:
        """league-v4: rango, LP y W/L oficiales de Solo/Dúo y Flex."""
        return self._get(f"{URL_PLATAFORMA}/lol/league/v4/entries/by-puuid/{_segmento(puuid)}")

    def ids_partidas(self, puuid: str, cantidad: int) -> list:
        """match-v5: ids de las últimas partidas de cualquier modo (sin filtro de tipo)."""
        url = f"{URL_REGION}/lol/match/v5/matches/by-puuid/{_segmento(puuid)}/ids"
        return self._get(url, params={"start": 0, "count": cantidad})

    def partida(self, id_partida: str) -> dict:
        """match-v5: detalle de una partida."""
        return self._get(f"{URL_REGION}/lol/match/v5/matches/{_segmento(id_partida)}")

    def maestria(self, puuid: str, campeon_id: int) -> dict | None:
        """champion-mastery-v4: maestría con un campeón, o None si nunca lo jugó (404)."""
        url = (
            f"{URL_PLATAFORMA}/lol/champion-mastery/v4/champion-masteries/by-puuid/"
            f"{_segmento(puuid)}/by-champion/{int(campeon_id)}"
        )
        return self._get(url, permitir_404=True)

    def partida_activa(self, puuid: str) -> dict | None:
        """spectator-v5: partida en curso, o None si no está jugando (404)."""
        url = f"{URL_PLATAFORMA}/lol/spectator/v5/active-games/by-summoner/{_segmento(puuid)}"
        return self._get(url, permitir_404=True)


def _ruta_para_logs(url: str) -> str:
    """Ruta de la URL sin PUUID ni Riot ID, para que no queden en logs ni mensajes de error."""
    ruta = urlsplit(url).path
    return _SEGMENTO_PRIVADO.sub(r"\1/***", ruta)


def _retry_after(respuesta: requests.Response) -> float:
    try:
        return min(max(float(respuesta.headers.get("Retry-After", 1)), 1.0), 120.0)
    except ValueError:
        return 1.0
