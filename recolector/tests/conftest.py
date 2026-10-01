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
    """PUUID falso con el formato real (78 caracteres de [A-Za-z0-9_-])."""
    return ("puuid-" + "".join(c for c in nombre if c.isascii() and c.isalnum())).ljust(78, "x")


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
    companeros: tuple[str, ...] = (),
) -> dict:
    """Partida de 4 jugadores: el jugador y un aliado (equipo 100) contra 2 rivales (200).

    `companeros` agrega más PUUID al equipo del jugador (para probar amigos en la misma partida).
    """

    def participante(puuid_p, equipo, campeon_id, nombre, kills, gano):
        return {
            "puuid": puuid_p,
            "teamId": equipo,
            "championName": campeon if puuid_p == puuid else "Garen",
            "championId": campeon_id,
            "riotIdGameName": nombre,
            "riotIdTagline": "LAS",
            "kills": kills,
            "deaths": kda[1],
            "assists": kda[2],
            "win": gano,
            "gameEndedInEarlySurrender": remake,
            "champLevel": 16,
            "totalMinionsKilled": 150,
            "neutralMinionsKilled": 27,
            **{f"item{i}": item for i, item in enumerate([3031, 3006, 0, 0, 0, 0, 3340])},
            "summoner1Id": 4,
            "summoner2Id": 14,
            "perks": {
                "statPerks": {},
                "styles": [
                    {"style": 8100, "selections": [{"perk": 8112}], "description": "primaryStyle"},
                    {"style": 8000, "selections": [], "description": "subStyle"},
                ],
            },
        }

    participantes = [
        participante(puuid, 100, 103, "Yo", kda[0], win),
        participante("aliado".ljust(78, "a"), 100, 86, "Aliado", 10, win),
        *[participante(c, 100, 86, "Amigo", 0, win) for c in companeros],
        participante("rival1".ljust(78, "r"), 200, 62, "Rival1", 4, not win),
        participante("rival2".ljust(78, "r"), 200, 1, "Rival2", 3, not win),
    ]
    return {
        "metadata": {"matchId": id_partida, "participants": [p["puuid"] for p in participantes]},
        "info": {
            "queueId": queue_id,
            "gameDuration": duracion,
            "gameStartTimestamp": fin - duracion * 1000,
            "gameEndTimestamp": fin,
            "participants": participantes,
        },
    }


def partida_activa(
    puuid: str,
    queue_id: int = 450,
    campeon_id: int = 103,
    *,
    id_partida: int = 1,
    companeros: tuple[str, ...] = (),
) -> dict:
    """Partida en curso: el jugador, sus `companeros` y rivales (uno en modo streamer)."""
    participantes = [
        {"puuid": puuid, "championId": campeon_id, "teamId": 100, "riotId": "Yo#LAS"},
        *[{"puuid": c, "championId": 86, "teamId": 100, "riotId": "Amigo#LAS"} for c in companeros],
        {"puuid": "rival1".ljust(78, "r"), "championId": 62, "teamId": 200, "riotId": "Rival#LAS"},
        # Modo streamer: sin PUUID ni nombre, solo el campeón.
        {"championId": 1, "teamId": 200, "bot": False},
    ]
    return {
        "gameId": id_partida,
        "gameQueueConfigId": queue_id,
        "gameStartTime": 1_790_000_000_000,
        "gameLength": 300,
        "participants": participantes,
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
