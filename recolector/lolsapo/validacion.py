"""Validación y limpieza de las respuestas de Riot antes de guardarlas.

Solo se guarda lo que la web necesita, con tipos verificados. Los textos se limpian de
caracteres de control y se recortan; React se encarga de escaparlos al mostrarlos.
"""

import re
import unicodedata

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

_PATRON_PUUID = re.compile(r"[A-Za-z0-9_-]{20,100}")
_PATRON_ID_PARTIDA = re.compile(r"[A-Z0-9]{2,6}_[0-9]{1,20}")
_PATRON_CAMPEON = re.compile(r"[A-Za-z0-9]{1,30}")


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


def texto_limpio(valor, campo: str, max_largo: int) -> str:
    if not isinstance(valor, str):
        raise DatoInvalido(f"'{campo}' debería ser texto")
    # Quita caracteres de control (Cc) y de formato invisibles (Cf), como los bidi.
    sin_invisibles = "".join(c for c in valor if unicodedata.category(c) not in ("Cc", "Cf"))
    limpio = sin_invisibles.strip()[:max_largo]
    if not limpio:
        raise DatoInvalido(f"'{campo}' está vacío")
    return limpio


def _puuid(valor) -> str:
    if not isinstance(valor, str) or not _PATRON_PUUID.fullmatch(valor):
        raise DatoInvalido("PUUID con formato inesperado")
    return valor


def validar_cuenta(datos) -> dict:
    """account-v1 -> {puuid, nombre, tag}."""
    datos = _dict(datos, "cuenta")
    return {
        "puuid": _puuid(datos.get("puuid")),
        "nombre": texto_limpio(datos.get("gameName"), "gameName", 16),
        "tag": texto_limpio(datos.get("tagLine"), "tagLine", 5),
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
        cola = entrada.get("queueType")
        clave = COLAS_RANKED.get(cola) if isinstance(cola, str) else None
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


def validar_ids_partidas(datos) -> list[str]:
    """match-v5 ids -> lista de ids con formato válido (ej. "LA2_1604993040")."""
    if not isinstance(datos, list):
        raise DatoInvalido("'ids de partidas' debería ser una lista")
    for id_partida in datos:
        if not isinstance(id_partida, str) or not _PATRON_ID_PARTIDA.fullmatch(id_partida):
            raise DatoInvalido(f"id de partida con formato inesperado: {id_partida!r}")
    return datos


def _entero_opcional(valor, campo: str) -> int | None:
    return None if valor is None else _entero(valor, campo)


def _nombre_visible(nombre, tag) -> str | None:
    """Riot ID visible de otro jugador ("Nombre#TAG"), o None si no viene (modo streamer)."""
    try:
        limpio = texto_limpio(nombre, "nombre", 16)
    except DatoInvalido:
        return None
    try:
        return f"{limpio}#{texto_limpio(tag, 'tag', 5)}"
    except DatoInvalido:
        return limpio


def _puuid_opcional(valor) -> str | None:
    if valor in (None, ""):
        return None
    return _puuid(valor)


def _equipo(participante: dict) -> int:
    """Equipo del jugador. En Arena se usa el subequipo (parejas o tríos)."""
    subequipo = participante.get("playerSubteamId")
    if isinstance(subequipo, int) and not isinstance(subequipo, bool) and subequipo > 0:
        return subequipo
    return _entero(participante.get("teamId"), "teamId")


def _runas(perks) -> dict:
    """Runa principal (keystone) y estilo secundario. Si no vienen, quedan en None."""
    principal = secundaria = None
    estilos = perks.get("styles") if isinstance(perks, dict) else None
    if isinstance(estilos, list) and estilos:
        primero = estilos[0] if isinstance(estilos[0], dict) else {}
        selecciones = primero.get("selections")
        if isinstance(selecciones, list) and selecciones and isinstance(selecciones[0], dict):
            principal = _entero_opcional(selecciones[0].get("perk"), "perk")
        if len(estilos) > 1 and isinstance(estilos[1], dict):
            secundaria = _entero_opcional(estilos[1].get("style"), "style")
    return {"principal": principal, "secundaria": secundaria}


def resumir_partida(datos, puuid: str, id_esperado: str | None = None) -> dict:
    """match-v5 -> resumen de la partida desde el punto de vista de `puuid`.

    Incluye lo que muestra la fila de partida: KDA, CS, participación en asesinatos, ítems,
    hechizos, runas y los participantes (campeón, equipo y nombre visible).
    """
    datos = _dict(datos, "partida")
    metadata = _dict(datos.get("metadata"), "metadata")
    info = _dict(datos.get("info"), "info")

    id_partida = metadata.get("matchId")
    if not isinstance(id_partida, str) or not _PATRON_ID_PARTIDA.fullmatch(id_partida):
        raise DatoInvalido(f"matchId con formato inesperado: {id_partida!r}")
    if id_esperado is not None and id_partida != id_esperado:
        raise DatoInvalido(f"se pidió {id_esperado} y llegó {id_partida}")

    participantes = info.get("participants")
    if not isinstance(participantes, list) or not all(isinstance(p, dict) for p in participantes):
        raise DatoInvalido("'participants' debería ser una lista de objetos")
    jugador = next((p for p in participantes if p.get("puuid") == puuid), None)
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
    if not isinstance(campeon, str) or not _PATRON_CAMPEON.fullmatch(campeon):
        raise DatoInvalido(f"championName con formato inesperado: {campeon!r}")

    if jugador.get("gameEndedInEarlySurrender") is True:
        resultado = "remake"
    elif isinstance(jugador.get("win"), bool):
        resultado = "victoria" if jugador["win"] else "derrota"
    else:
        raise DatoInvalido("'win' debería ser true o false")

    asesinatos = _entero(jugador.get("kills"), "kills")
    asistencias = _entero(jugador.get("assists"), "assists")
    equipo = _equipo(jugador)
    asesinatos_equipo = sum(
        _entero(p.get("kills"), "kills") for p in participantes if _equipo(p) == equipo
    )
    participacion = (
        round((asesinatos + asistencias) * 100 / asesinatos_equipo) if asesinatos_equipo else None
    )

    queue_id = info.get("queueId")
    return {
        "id": id_partida,
        "fecha": fecha,
        "queue_id": _entero_opcional(queue_id, "queueId"),
        "campeon": campeon,
        "campeon_id": _entero(jugador.get("championId"), "championId"),
        "resultado": resultado,
        "asesinatos": asesinatos,
        "muertes": _entero(jugador.get("deaths"), "deaths"),
        "asistencias": asistencias,
        "duracion": duracion,
        "nivel": _entero(jugador.get("champLevel", 0), "champLevel"),
        "cs": _entero(jugador.get("totalMinionsKilled", 0), "totalMinionsKilled")
        + _entero(jugador.get("neutralMinionsKilled", 0), "neutralMinionsKilled"),
        "participacion": participacion,
        "equipo": equipo,
        "items": [_entero(jugador.get(f"item{i}", 0), f"item{i}") for i in range(7)],
        "hechizos": [
            _entero(jugador.get("summoner1Id", 0), "summoner1Id"),
            _entero(jugador.get("summoner2Id", 0), "summoner2Id"),
        ],
        "runas": _runas(jugador.get("perks")),
        "participantes": [
            {
                "puuid": _puuid_opcional(p.get("puuid")),
                "campeon_id": _entero(p.get("championId"), "championId"),
                "equipo": _equipo(p),
                "nombre": _nombre_visible(p.get("riotIdGameName"), p.get("riotIdTagline")),
            }
            for p in participantes
        ],
    }


def validar_partida_activa(datos, puuid: str) -> dict:
    """spectator-v5 -> partida en curso con los equipos completos.

    Con el modo streamer, Riot puede omitir el PUUID y el nombre de algunos jugadores: en ese
    caso solo se conoce su campeón.
    """
    datos = _dict(datos, "partida activa")
    participantes = datos.get("participants")
    if not isinstance(participantes, list) or not all(isinstance(p, dict) for p in participantes):
        raise DatoInvalido("'participants' debería ser una lista de objetos")
    jugador = next((p for p in participantes if p.get("puuid") == puuid), None)
    queue_id = datos.get("gameQueueConfigId")
    inicio = datos.get("gameStartTime")
    duracion = datos.get("gameLength", 0)
    if isinstance(duracion, bool) or not isinstance(duracion, int):
        raise DatoInvalido(f"'gameLength' debería ser un entero: {duracion!r}")

    jugadores = []
    for p in participantes:
        riot_id = p.get("riotId")
        try:
            nombre = texto_limpio(riot_id, "riotId", 22)
        except DatoInvalido:
            nombre = None
        jugadores.append(
            {
                "puuid": _puuid_opcional(p.get("puuid")),
                "campeon_id": _entero(p.get("championId"), "championId"),
                "equipo": _entero(p.get("teamId"), "teamId"),
                "nombre": nombre,
            }
        )

    return {
        "id": _entero(datos.get("gameId"), "gameId"),
        # Si el propio amigo usa modo streamer, puede que no se sepa su campeón.
        "campeon_id": _entero(jugador.get("championId"), "championId") if jugador else None,
        "queue_id": _entero_opcional(queue_id, "gameQueueConfigId"),
        # gameStartTime vale 0 mientras la partida está cargando.
        "inicio": _entero(inicio, "gameStartTime") if inicio else None,
        # gameLength puede ser negativo en los primeros segundos (pantalla de carga).
        "duracion": max(duracion, 0),
        "participantes": jugadores,
    }
