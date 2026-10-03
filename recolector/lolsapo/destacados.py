"""Destacados del grupo en los últimos 7 días (LoL), calculados desde el registro de cada amigo.

Solo cuentan Normal y Ranked (Solo/Dúo y Flex): ARAM, ARAM Caos y los modos especiales
quedan fuera. Los remakes tampoco cuentan.

"Más partidas" cuenta todo lo jugado en los 7 días. El resto (winrate, KDA, racha y peor
partida) usa solo las últimas 7 partidas de cada amigo dentro de esos días, para que jugar
mucho no premie ni castigue.

Cada destacado trae la lista de amigos que lo ganan: si hay empate exacto (después de los
desempates), aparecen todos. En la racha es lo normal, porque el grupo suele jugar junto.
"""

from collections.abc import Iterable

from .modos import MapaModos
from .registro import winrate

DIAS = 7
VENTANA_MS = DIAS * 24 * 60 * 60 * 1000
CATEGORIAS = ("ranked", "normal")
ULTIMAS_PARTIDAS = 7  # muestra por amigo para winrate, KDA, racha y peor partida
MINIMO_PARTIDAS = 5  # de esas 7, para winrate y KDA: así no gana alguien con 1 partida
RACHA_MINIMA = 2


def kda(asesinatos: int, muertes: int, asistencias: int) -> float:
    """(asesinatos + asistencias) / muertes, con muertes mínimo 1 (sin muertes = "perfecto")."""
    return round((asesinatos + asistencias) / max(muertes, 1), 2)


def _partidas_validas(partidas: Iterable[dict], mapa: MapaModos, desde_ms: int) -> list[dict]:
    validas = [
        p
        for p in partidas
        if isinstance(p.get("fecha"), int)
        and p["fecha"] >= desde_ms
        and p.get("resultado") in ("victoria", "derrota")
        and mapa.obtener(p.get("queue_id")).categoria in CATEGORIAS
    ]
    return sorted(validas, key=lambda p: p["fecha"])


def _resumen(partidas: list[dict]) -> dict:
    victorias = sum(p["resultado"] == "victoria" for p in partidas)
    totales = {c: sum(p[c] for p in partidas) for c in ("asesinatos", "muertes", "asistencias")}
    racha = mejor_racha = 0
    for partida in partidas:
        racha = racha + 1 if partida["resultado"] == "victoria" else 0
        mejor_racha = max(mejor_racha, racha)
    return {
        "partidas": len(partidas),
        "victorias": victorias,
        "derrotas": len(partidas) - victorias,
        "winrate": winrate(victorias, len(partidas) - victorias),
        **totales,
        "kda": kda(totales["asesinatos"], totales["muertes"], totales["asistencias"]),
        "racha": mejor_racha,
    }


def _ganadores(resumenes: dict[str, dict], clave, minimo: int = 1) -> list[str]:
    """Slugs con la mejor `clave` entre los que tienen al menos `minimo` partidas."""
    candidatos = {s: r for s, r in resumenes.items() if r["partidas"] >= minimo}
    if not candidatos:
        return []
    mejor = max(clave(r) for r in candidatos.values())
    return sorted(s for s, r in candidatos.items() if clave(r) == mejor)


def _destacado(ganadores: list[str], resumenes: dict, campos: tuple[str, ...]) -> dict | None:
    if not ganadores:
        return None
    # Con empate exacto los valores son iguales: se toman del primero.
    datos = resumenes[ganadores[0]]
    return {"amigos": ganadores, **{c: datos[c] for c in campos}}


def calcular_destacados(
    partidas_por_amigo: dict[str, Iterable[dict]], mapa: MapaModos, ahora_ms: int
) -> dict:
    desde = ahora_ms - VENTANA_MS
    validas = {s: _partidas_validas(p, mapa, desde) for s, p in partidas_por_amigo.items()}
    totales = {s: _resumen(p) for s, p in validas.items() if p}
    recientes = {s: p[-ULTIMAS_PARTIDAS:] for s, p in validas.items()}
    resumenes = {s: _resumen(p) for s, p in recientes.items() if p}

    campos_kda = ("kda", "asesinatos", "muertes", "asistencias", "partidas")
    racha = _ganadores(resumenes, lambda r: r["racha"])
    if racha and resumenes[racha[0]]["racha"] < RACHA_MINIMA:
        racha = []

    return {
        "dias": DIAS,
        "desde": desde,
        "ultimas_partidas": ULTIMAS_PARTIDAS,
        "mas_partidas": _destacado(
            _ganadores(totales, lambda r: r["partidas"]), totales, ("partidas",)
        ),
        "mejor_winrate": _destacado(
            _ganadores(resumenes, lambda r: (r["winrate"], r["partidas"]), MINIMO_PARTIDAS),
            resumenes,
            ("winrate", "victorias", "derrotas", "partidas"),
        ),
        "mejor_kda": _destacado(
            _ganadores(resumenes, lambda r: (r["kda"], r["partidas"]), MINIMO_PARTIDAS),
            resumenes,
            campos_kda,
        ),
        "peor_kda": _destacado(
            _ganadores(resumenes, lambda r: (-r["kda"], r["partidas"]), MINIMO_PARTIDAS),
            resumenes,
            campos_kda,
        ),
        "racha": _destacado(racha, resumenes, ("racha",)),
        "peor_partida": _peor_partida(recientes, mapa),
    }


def _peor_partida(validas: dict[str, list[dict]], mapa: MapaModos) -> dict | None:
    """La partida con peor KDA; con empate, la de más muertes y luego la más reciente."""
    candidatas = [
        (kda(p["asesinatos"], p["muertes"], p["asistencias"]), -p["muertes"], -p["fecha"], s, p)
        for s, partidas in validas.items()
        for p in partidas
    ]
    if not candidatas:
        return None
    valor, _, _, slug, partida = min(candidatas, key=lambda c: c[:4])
    return {
        "amigos": [slug],
        "partida_id": partida["id"],
        "campeon_id": partida["campeon_id"],
        "campeon": partida["campeon"],
        "asesinatos": partida["asesinatos"],
        "muertes": partida["muertes"],
        "asistencias": partida["asistencias"],
        "kda": valor,
        "resultado": partida["resultado"],
        "modo": mapa.obtener(partida.get("queue_id")).nombre,
        "fecha": partida["fecha"],
    }
