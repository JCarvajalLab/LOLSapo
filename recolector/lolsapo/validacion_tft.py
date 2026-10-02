"""Validación y limpieza de las respuestas de TFT antes de guardarlas.

Mismas reglas que validacion.py: solo lo que la web necesita, con tipos verificados y textos
limpios de caracteres de control.
"""

import re

from .validacion import (
    DIVISIONES,
    TIERS,
    DatoInvalido,
    _dict,
    _entero,
    _entero_opcional,
    _nombre_visible,
    _puuid_opcional,
    texto_limpio,
)

# Hyper Roll no usa ligas: tiene "rated tiers" por colores y un puntaje.
TIERS_TURBO = ("GRAY", "GREEN", "BLUE", "PURPLE", "ORANGE")
COLAS_TFT = {"RANKED_TFT": "ranked", "RANKED_TFT_DOUBLE_UP": "doble"}
COLA_TURBO = "RANKED_TFT_TURBO"

# Ids de unidades, ítems y rasgos, ej. "DA_18_Sivir", "DA_InfinityEdge", "DA_Primal18".
_PATRON_ID_TFT = re.compile(r"[A-Za-z0-9_]{1,80}")
MAX_UNIDADES = 15
MAX_ITEMS_UNIDAD = 3
MAX_JUGADORES = 8


def _id_tft(valor, campo: str) -> str:
    if not isinstance(valor, str) or not _PATRON_ID_TFT.fullmatch(valor):
        raise DatoInvalido(f"{campo} con formato inesperado: {valor!r}")
    return valor


def _lista(valor, campo: str) -> list:
    if not isinstance(valor, list):
        raise DatoInvalido(f"'{campo}' debería ser una lista")
    return valor


def _rango_liga(entrada: dict) -> dict:
    tier = entrada.get("tier")
    if tier not in TIERS:
        raise DatoInvalido(f"tier desconocido: {tier!r}")
    division = entrada.get("rank")
    if TIERS.index(tier) >= TIERS.index("MASTER"):
        division = None
    elif division not in DIVISIONES:
        raise DatoInvalido(f"división desconocida: {division!r}")
    top4 = _entero(entrada.get("wins"), "wins")
    resto = _entero(entrada.get("losses"), "losses")
    return {
        "tier": tier,
        "division": division,
        "lp": _entero(entrada.get("leaguePoints"), "leaguePoints"),
        # En TFT, "wins" de la liga cuenta los top 4 (no solo los primeros lugares).
        "top4": top4,
        "partidas": top4 + resto,
        "racha": entrada.get("hotStreak") is True,
    }


def validar_ligas_tft(datos) -> dict:
    """tft-league-v1 -> {"ranked": rango | None, "doble": rango | None, "turbo": ... | None}."""
    if not isinstance(datos, list):
        raise DatoInvalido("'ligas' de TFT debería ser una lista")
    rangos = {"ranked": None, "doble": None, "turbo": None}
    for entrada in datos:
        entrada = _dict(entrada, "liga TFT")
        cola = entrada.get("queueType")
        if cola == COLA_TURBO:
            tier = entrada.get("ratedTier")
            if tier not in TIERS_TURBO:
                raise DatoInvalido(f"tier de Hyper Roll desconocido: {tier!r}")
            top4 = _entero(entrada.get("wins", 0), "wins")
            rangos["turbo"] = {
                "tier": tier,
                "puntos": _entero(entrada.get("ratedRating", 0), "ratedRating"),
                "top4": top4,
                "partidas": top4 + _entero(entrada.get("losses", 0), "losses"),
            }
            continue
        clave = COLAS_TFT.get(cola) if isinstance(cola, str) else None
        if clave is not None:
            rangos[clave] = _rango_liga(entrada)
    return rangos


def _unidad(datos) -> dict:
    datos = _dict(datos, "unidad")
    items = _lista(datos.get("itemNames", []), "itemNames")
    if len(items) > MAX_ITEMS_UNIDAD:
        raise DatoInvalido("una unidad no puede tener más de 3 ítems")
    estrellas = _entero(datos.get("tier"), "tier")
    if not 1 <= estrellas <= 4:
        raise DatoInvalido(f"estrellas fuera de rango: {estrellas}")
    return {
        "id": _id_tft(datos.get("character_id"), "character_id"),
        "estrellas": estrellas,
        "rareza": _entero(datos.get("rarity", 0), "rarity"),
        "items": [_id_tft(i, "itemNames") for i in items],
    }


def _rasgos_activos(rasgos: list) -> list[dict]:
    """Solo los rasgos activos: primero los de varias unidades, del más fuerte al más débil.

    Los rasgos únicos (de una sola unidad, ej. el de Lux) van al final aunque se vean dorados.
    """
    activos = []
    for rasgo in rasgos:
        rasgo = _dict(rasgo, "rasgo")
        nivel = _entero(rasgo.get("tier_current", 0), "tier_current")
        if nivel == 0:
            continue
        activos.append(
            {
                "id": _id_tft(rasgo.get("name"), "nombre de rasgo"),
                "unidades": _entero(rasgo.get("num_units", 0), "num_units"),
                # 1 bronce, 2 plata, 3 oro (también los rasgos únicos), 4 prismático.
                "estilo": _entero(rasgo.get("style", 0), "style"),
                "nivel": nivel,
                "unico": rasgo.get("tier_total") == 1,
            }
        )
    return sorted(activos, key=lambda r: (r["unico"], -r["estilo"], -r["unidades"], r["id"]))


def resumir_partida_tft(datos, puuid: str, id_esperado: str | None = None) -> dict:
    """tft-match-v1 -> resumen mínimo de la partida desde el punto de vista del amigo."""
    datos = _dict(datos, "partida TFT")
    metadata = _dict(datos.get("metadata"), "metadata")
    info = _dict(datos.get("info"), "info")
    id_partida = metadata.get("match_id")
    if not isinstance(id_partida, str) or (id_esperado and id_partida != id_esperado):
        raise DatoInvalido("la partida no corresponde al id pedido")

    participantes = _lista(info.get("participants"), "participants")
    if not 1 <= len(participantes) <= MAX_JUGADORES:
        raise DatoInvalido("cantidad de jugadores inesperada")
    participantes = [_dict(p, "participante") for p in participantes]
    jugador = next((p for p in participantes if p.get("puuid") == puuid), None)
    if jugador is None:
        raise DatoInvalido("el amigo no aparece en la partida")

    puesto = _entero(jugador.get("placement"), "placement", minimo=1)
    if puesto > MAX_JUGADORES:
        raise DatoInvalido(f"puesto fuera de rango: {puesto}")
    unidades = [_unidad(u) for u in _lista(jugador.get("units", []), "units")]
    if len(unidades) > MAX_UNIDADES:
        raise DatoInvalido("demasiadas unidades")
    queue_id = info.get("queueId", info.get("queue_id"))
    duracion = info.get("game_length", 0)
    if isinstance(duracion, bool) or not isinstance(duracion, int | float) or duracion < 0:
        raise DatoInvalido(f"'game_length' inesperado: {duracion!r}")

    return {
        "id": id_partida,
        "fecha": _entero(info.get("game_datetime"), "game_datetime"),
        "queue_id": _entero_opcional(queue_id, "queueId"),
        "set": _entero_opcional(info.get("tft_set_number"), "tft_set_number"),
        "duracion": round(duracion),
        "puesto": puesto,
        "nivel": _entero(jugador.get("level", 0), "level"),
        "ronda": _entero(jugador.get("last_round", 0), "last_round"),
        "eliminados": _entero(jugador.get("players_eliminated", 0), "players_eliminated"),
        "danio": _entero(jugador.get("total_damage_to_players", 0), "total_damage_to_players"),
        # Las de más estrellas y más caras primero.
        "unidades": sorted(unidades, key=lambda u: (-u["estrellas"], -u["rareza"], u["id"])),
        "rasgos": _rasgos_activos(_lista(jugador.get("traits", []), "traits")),
        "participantes": sorted(
            (
                {
                    "puuid": _puuid_opcional(p.get("puuid")),
                    "nombre": _nombre_visible(p.get("riotIdGameName"), p.get("riotIdTagline")),
                    "puesto": _entero(p.get("placement"), "placement", minimo=1),
                }
                for p in participantes
            ),
            key=lambda p: p["puesto"],
        ),
    }


def es_partida_tft(datos) -> bool:
    """True si una partida en curso (spectator) es de TFT: mapa 22 o modo "TFT"."""
    return isinstance(datos, dict) and (datos.get("gameMode") == "TFT" or datos.get("mapId") == 22)


def validar_partida_activa_tft(datos) -> dict:
    """spectator (TFT o LoL con una partida de TFT) -> partida en curso con sus jugadores."""
    datos = _dict(datos, "partida activa TFT")
    participantes = _lista(datos.get("participants"), "participants")
    if len(participantes) > MAX_JUGADORES:
        raise DatoInvalido("demasiados jugadores en la partida activa")
    duracion = datos.get("gameLength", 0)
    if isinstance(duracion, bool) or not isinstance(duracion, int):
        raise DatoInvalido(f"'gameLength' debería ser un entero: {duracion!r}")
    inicio = datos.get("gameStartTime")

    jugadores = []
    for p in participantes:
        p = _dict(p, "participante")
        try:
            nombre = texto_limpio(p.get("riotId"), "riotId", 22)
        except DatoInvalido:
            nombre = None  # modo streamer
        jugadores.append({"puuid": _puuid_opcional(p.get("puuid")), "nombre": nombre})

    return {
        "id": _entero(datos.get("gameId"), "gameId"),
        "queue_id": _entero_opcional(datos.get("gameQueueConfigId"), "gameQueueConfigId"),
        "inicio": _entero(inicio, "gameStartTime") if inicio else None,
        "duracion": max(duracion, 0),
        "participantes": jugadores,
    }
