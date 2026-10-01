"""Datos de ejemplo que imitan las respuestas de Riot. Los tests nunca llaman a la API real."""

import shutil
from pathlib import Path

import pytest

from lolsapo.config import RAIZ
from lolsapo.modos import MapaModos
from lolsapo.riot_api import ClienteRiot, Limitador

# Key falsa armada en tiempo de ejecución (así gitleaks no la confunde con una real).
KEY_FALSA = "RGAPI-" + "-".join(["f" * 8, "e" * 4, "d" * 4, "c" * 4, "b" * 12])


def puuid_de(nombre: str) -> str:
    return f"puuid-{nombre}".ljust(78, "x")


def cuenta(nombre: str, tag: str = "LAS") -> dict:
    return {"puuid": puuid_de(nombre), "gameName": nombre, "tagLine": tag}


def invocador(puuid: str, icono: int = 29, nivel: int = 150) -> dict:
    return {"puuid": puuid, "profileIconId": icono, "summonerLevel": nivel, "revisionDate": 1}


def liga(cola="RANKED_SOLO_5x5", tier="GOLD", rank="II", lp=45, wins=30, losses=25) -> dict:
    return {
        "queueType": cola,
        "tier": tier,
        "rank": rank,
        "leaguePoints": lp,
        "wins": wins,
        "losses": losses,
        "puuid": "x",
        "hotStreak": False,
        "veteran": False,
        "freshBlood": False,
        "inactive": False,
    }


def partida(
    id_partida: str,
    puuid: str,
    *,
    queue_id: int = 420,
    win: bool = True,
    remake: bool = False,
    campeon: str = "Ahri",
    fin: int = 1_790_000_000_000,
    duracion: int = 1800,
    kda=(5, 2, 7),
) -> dict:
    jugador = {
        "puuid": puuid,
        "championName": campeon,
        "championId": 103,
        "kills": kda[0],
        "deaths": kda[1],
        "assists": kda[2],
        "win": win,
        "gameEndedInEarlySurrender": remake,
    }
    otro = {**jugador, "puuid": "otro".ljust(78, "y"), "win": not win}
    return {
        "metadata": {"matchId": id_partida, "participants": [puuid, otro["puuid"]]},
        "info": {
            "queueId": queue_id,
            "gameDuration": duracion,
            "gameStartTimestamp": fin - duracion * 1000,
            "gameEndTimestamp": fin,
            "participants": [otro, jugador],
        },
    }


def partida_activa(puuid: str, queue_id: int = 450, campeon_id: int = 103) -> dict:
    return {
        "gameId": 1,
        "gameQueueConfigId": queue_id,
        "gameStartTime": 1_790_000_000_000,
        "gameLength": 300,
        "participants": [{"puuid": puuid, "championId": campeon_id}],
    }


class SinEspera:
    """Reemplaza time.sleep: registra cuánto se habría esperado, sin esperar."""

    def __init__(self):
        self.esperas: list[float] = []

    def __call__(self, segundos: float) -> None:
        self.esperas.append(segundos)


@pytest.fixture
def dormir():
    return SinEspera()


@pytest.fixture
def cliente(dormir):
    sin_limite = Limitador(ventanas=((10_000, 1.0),), dormir=dormir)
    return ClienteRiot(KEY_FALSA, limitador=sin_limite, dormir=dormir, max_reintentos=2)


@pytest.fixture
def mapa() -> MapaModos:
    return MapaModos.desde_archivo(RAIZ / "config" / "modos.json")


@pytest.fixture
def carpeta(tmp_path: Path) -> Path:
    """Carpeta temporal con una copia de la configuración real."""
    shutil.copy(RAIZ / "config" / "modos.json", tmp_path / "modos.json")
    return tmp_path
