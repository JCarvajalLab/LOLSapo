"""Validación y limpieza de las respuestas de Riot antes de guardarlas.

Solo se guarda lo que la web necesita, con tipos verificados. Los textos se limpian de
caracteres de control y se recortan; React se encarga de escaparlos al mostrarlos.
"""

import re

TIERS = (
    "IRON",
    "BRONZE",
    "SILVER",
    "GOLD",
    "PLATINUM",
    "EMERALD",
    "DIAMOND",
    "MASTER",
    "GRANDMASTER",
    "CHALLENGER",
)
DIVISIONES = ("IV", "III", "II", "I")
COLAS_RANKED = {"RANKED_SOLO_5x5": "solo", "RANKED_FLEX_SR": "flex"}

_PATRON_PUUID = re.compile(r"^[A-Za-z0-9_-]{20,100}$")
_PATRON_ID_PARTIDA = re.compile(r"^[A-Z0-9]{2,6}_\d{1,20}$")
_PATRON_CAMPEON = re.compile(r"^[A-Za-z0-9]{1,30}$")
_CONTROL = re.compile(r"[\x00-\x1f\x7f-\x9f\u200b-\u200f\u2028-\u202e\u2066-\u2069]")


class DatoInvalido(ValueError):
    """Una respuesta de Riot no tiene la forma esperada."""


def _dict(valor, campo: str) -> dict:
    if not isinstance(valor, dict):
        raise DatoInvalido(f"'{campo}' debería ser un objeto")
    return valor


def _entero(valor, campo: str, minimo: int = 0) -> int:
    if isinstance(valor, bool) or not isinstance(valor, int) or valor < minimo:
        raise DatoInvalido(f"'{campo}' debería ser un entero >= {minimo}: {valor!r}")
    return valor


def _texto(valor, campo: str, max_largo: int) -> str:
    if not isinstance(valor, str):
        raise DatoInvalido(f"'{campo}' debería ser texto")
    limpio = _CONTROL.sub("", valor).strip()[:max_largo]
    if not limpio:
        raise DatoInvalido(f"'{campo}' está vacío")
    return limpio


def _puuid(valor) -> str:
    if not isinstance(valor, str) or not _PATRON_PUUID.match(valor):
        raise DatoInvalido("PUUID con formato inesperado")
    return valor


def validar_cuenta(datos) -> dict:
    """account-v1 -> {puuid, nombre, tag}."""
    datos = _dict(datos, "cuenta")
    return {
        "puuid": _puuid(datos.get("puuid")),
        "nombre": _texto(datos.get("gameName"), "gameName", 16),
        "tag": _texto(datos.get("tagLine"), "tagLine", 5),
    }


def validar_invocador(datos) -> dict:
    """summoner-v4 -> {icono, nivel}."""
    datos = _dict(datos, "invocador")
    return {
        "icono": _entero(datos.get("profileIconId"), "profileIconId"),
        "nivel": _entero(datos.get("summonerLevel"), "summonerLevel"),
    }


def validar_ligas(datos) -> dict:
    """league-v4 -> {"solo": rango | None, "flex": rango | None}."""
    if not isinstance(datos, list):
        raise DatoInvalido("'ligas' debería ser una lista")
    rangos = {"solo": None, "flex": None}
    for entrada in datos:
        entrada = _dict(entrada, "liga")
        clave = COLAS_RANKED.get(entrada.get("queueType"))
        if clave is None:
            continue
        tier = entrada.get("tier")
        if tier not in TIERS:
            raise DatoInvalido(f"tier desconocido: {tier!r}")
        division = entrada.get("rank")
        if TIERS.index(tier) >= TIERS.index("MASTER"):
            # Master, Grandmaster y Challenger no tienen división real (Riot manda "I").
            division = None
        elif division not in DIVISIONES:
            raise DatoInvalido(f"división desconocida: {division!r}")
        rangos[clave] = {
            "tier": tier,
            "division": division,
            "lp": _entero(entrada.get("leaguePoints"), "leaguePoints"),
            "victorias": _entero(entrada.get("wins"), "wins"),
            "derrotas": _entero(entrada.get("losses"), "losses"),
        }
    return rangos


def resumir_partida(datos, puuid: str) -> dict:
    """match-v5 -> resumen mínimo de la partida desde el punto de vista de `puuid`."""
    datos = _dict(datos, "partida")
    metadata = _dict(datos.get("metadata"), "metadata")
    info = _dict(datos.get("info"), "info")

    id_partida = metadata.get("matchId")
    if not isinstance(id_partida, str) or not _PATRON_ID_PARTIDA.match(id_partida):
        raise DatoInvalido(f"matchId con formato inesperado: {id_partida!r}")

    participantes = info.get("participants")
    if not isinstance(participantes, list):
        raise DatoInvalido("'participants' debería ser una lista")
    jugador = next(
        (p for p in participantes if isinstance(p, dict) and p.get("puuid") == puuid), None
    )
    if jugador is None:
        raise DatoInvalido(f"el jugador no aparece en la partida {id_partida}")

    duracion = _entero(info.get("gameDuration"), "gameDuration")
    if "gameEndTimestamp" in info:
        fecha = _entero(info["gameEndTimestamp"], "gameEndTimestamp")
    else:
        # Partidas antiguas: gameDuration venía en milisegundos y no había gameEndTimestamp.
        duracion //= 1000
        fecha = _entero(info.get("gameStartTimestamp"), "gameStartTimestamp") + duracion * 1000

    campeon = jugador.get("championName")
    if not isinstance(campeon, str) or not _PATRON_CAMPEON.match(campeon):
        raise DatoInvalido(f"championName con formato inesperado: {campeon!r}")

    if jugador.get("gameEndedInEarlySurrender") is True:
        resultado = "remake"
    elif isinstance(jugador.get("win"), bool):
        resultado = "victoria" if jugador["win"] else "derrota"
    else:
        raise DatoInvalido("'win' debería ser true o false")

    queue_id = info.get("queueId")
    return {
        "id": id_partida,
        "fecha": fecha,
        "queue_id": _entero(queue_id, "queueId") if queue_id is not None else None,
        "campeon": campeon,
        "campeon_id": _entero(jugador.get("championId"), "championId"),
        "resultado": resultado,
        "asesinatos": _entero(jugador.get("kills"), "kills"),
        "muertes": _entero(jugador.get("deaths"), "deaths"),
        "asistencias": _entero(jugador.get("assists"), "assists"),
        "duracion": duracion,
    }


def validar_partida_activa(datos, puuid: str) -> dict:
    """spectator-v5 -> {campeon_id, queue_id, inicio, duracion} del jugador `puuid`."""
    datos = _dict(datos, "partida activa")
    participantes = datos.get("participants")
    if not isinstance(participantes, list):
        raise DatoInvalido("'participants' debería ser una lista")
    jugador = next(
        (p for p in participantes if isinstance(p, dict) and p.get("puuid") == puuid), None
    )
    if jugador is None:
        raise DatoInvalido("el jugador no aparece en la partida activa")
    queue_id = datos.get("gameQueueConfigId")
    inicio = datos.get("gameStartTime")
    duracion = datos.get("gameLength", 0)
    if isinstance(duracion, bool) or not isinstance(duracion, int):
        raise DatoInvalido(f"'gameLength' debería ser un entero: {duracion!r}")
    return {
        "campeon_id": _entero(jugador.get("championId"), "championId"),
        "queue_id": _entero(queue_id, "gameQueueConfigId") if queue_id is not None else None,
        # gameStartTime vale 0 mientras la partida está cargando.
        "inicio": _entero(inicio, "gameStartTime") if inicio else None,
        # gameLength puede ser negativo en los primeros segundos (pantalla de carga).
        "duracion": max(duracion, 0),
    }
