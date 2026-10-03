"""Destacados del grupo en los últimos 7 días (LoL), calculados desde el registro de cada amigo.

Solo cuentan Normal y Ranked (Solo/Dúo y Flex): ARAM, ARAM Caos y los modos especiales
quedan fuera. Los remakes tampoco cuentan.

"Más partidas" cuenta todo lo jugado en los 7 días. Winrate y mejor y peor partida usan solo
las últimas 7 partidas de cada amigo dentro de esos días, para que jugar mucho no premie ni
castigue.

Las rachas son "en equipo": solo cuentan las partidas de los 7 días en las que 2 o más del
grupo jugaron en el mismo equipo, en orden. La racha sigue mientras se repite el resultado y
cada partida comparte al menos un amigo con la anterior; trae a todos los que participaron y
cuántas partidas de la racha jugó cada uno. Se arman desde las partidas (que dicen qué amigos
estaban en el equipo), no desde el registro de cada uno: así una partida registrada por un
amigo cuenta para todos los que la jugaron, aunque no esté en sus propios registros.

Los demás destacados traen la lista de amigos que los ganan: si hay empate exacto (después de
los desempates), aparecen todos.
"""

from collections.abc import Iterable

from .modos import MapaModos
from .registro import winrate

DIAS = 7
VENTANA_MS = DIAS * 24 * 60 * 60 * 1000
CATEGORIAS = ("ranked", "normal")
ULTIMAS_PARTIDAS = 7  # muestra por amigo para winrate y mejor y peor partida
MINIMO_EN_GRUPO = 2  # amigos en el mismo equipo para que una partida cuente en las rachas
MINIMO_PARTIDAS = 5  # de esas 7, para el winrate: así no gana alguien con 1 partida
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


def companeros(partida: dict) -> set[str]:
    """Amigos (slugs) que jugaron en el mismo equipo que el dueño de la partida, incluido él."""
    equipo = partida.get("equipo")
    return {
        p["amigo"]
        for p in partida.get("participantes") or []
        if isinstance(p, dict) and isinstance(p.get("amigo"), str) and p.get("equipo") == equipo
    }


def en_grupo(partida: dict) -> bool:
    """True si 2 o más del grupo jugaron la partida en el mismo equipo."""
    return len(companeros(partida)) >= MINIMO_EN_GRUPO


def _partidas_en_grupo(validas: dict[str, list[dict]]) -> list[tuple[dict, set[str]]]:
    """Partidas en grupo de todos, sin repetir, en orden: (partida, amigos del equipo).

    Una partida aparece en el registro de quien la jugó, pero sus participantes dicen quiénes
    más estaban en el equipo (y el resultado es el mismo para todos ellos). Solo cuentan los
    amigos que siguen en la lista.
    """
    unicas: dict[str, tuple[dict, set[str]]] = {}
    for partidas in validas.values():
        for partida in partidas:
            equipo = companeros(partida) & validas.keys()
            if partida["id"] not in unicas and len(equipo) >= MINIMO_EN_GRUPO:
                unicas[partida["id"]] = (partida, equipo)
    return sorted(unicas.values(), key=lambda u: (u[0]["fecha"], u[0]["id"]))


def _racha_en_equipo(en_grupo_ordenadas: list[tuple[dict, set[str]]], resultado: str):
    """La racha más larga de `resultado` jugando en grupo.

    La racha sigue mientras el resultado se repite y cada partida comparte al menos un amigo
    con la anterior (si se suma alguien, la racha continúa). Se corta con el resultado
    contrario o si la partida siguiente la juega otro grupo sin nadie en común.
    Con empate de largo, gana la más reciente.
    """
    mejor: list[tuple[dict, set[str]]] = []
    actual: list[tuple[dict, set[str]]] = []
    for partida, equipo in en_grupo_ordenadas:
        sigue = (
            actual
            and partida["resultado"] == actual[-1][0]["resultado"]
            and (equipo & actual[-1][1])
        )
        actual = [*actual, (partida, equipo)] if sigue else [(partida, equipo)]
        if actual[0][0]["resultado"] == resultado and len(actual) >= len(mejor):
            mejor = actual
    if len(mejor) < RACHA_MINIMA:
        return None
    partidas_por_amigo: dict[str, int] = {}
    for _, equipo in mejor:
        for slug in equipo:
            partidas_por_amigo[slug] = partidas_por_amigo.get(slug, 0) + 1
    return {
        "racha": len(mejor),
        # Primero quienes jugaron más partidas de la racha.
        "amigos": sorted(partidas_por_amigo, key=lambda s: (-partidas_por_amigo[s], s)),
        "partidas": partidas_por_amigo,
        "desde": mejor[0][0]["fecha"],
        "hasta": mejor[-1][0]["fecha"],
    }


def _resumen(partidas: list[dict]) -> dict:
    victorias = sum(p["resultado"] == "victoria" for p in partidas)
    totales = {c: sum(p[c] for p in partidas) for c in ("asesinatos", "muertes", "asistencias")}
    return {
        "partidas": len(partidas),
        "victorias": victorias,
        "derrotas": len(partidas) - victorias,
        "winrate": winrate(victorias, len(partidas) - victorias),
        **totales,
        "kda": kda(totales["asesinatos"], totales["muertes"], totales["asistencias"]),
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
    en_grupo_ordenadas = _partidas_en_grupo(validas)

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
        "mejor_partida": _partida_destacada(recientes, mapa, mejor=True),
        "racha_victorias_grupo": _racha_en_equipo(en_grupo_ordenadas, "victoria"),
        "racha_derrotas_grupo": _racha_en_equipo(en_grupo_ordenadas, "derrota"),
        "peor_partida": _partida_destacada(recientes, mapa, mejor=False),
    }


def _partida_destacada(
    validas: dict[str, list[dict]], mapa: MapaModos, *, mejor: bool
) -> dict | None:
    """La partida individual con mejor o peor KDA del grupo (gane o pierda).

    Desempates: mejor -> más asesinatos + asistencias, menos muertes, la más reciente.
                peor  -> más muertes, la más reciente.
    """

    def orden(slug: str, p: dict):
        valor = kda(p["asesinatos"], p["muertes"], p["asistencias"])
        if mejor:
            return (-valor, -(p["asesinatos"] + p["asistencias"]), p["muertes"], -p["fecha"], slug)
        return (valor, -p["muertes"], -p["fecha"], slug)

    candidatas = [(orden(s, p), s, p) for s, partidas in validas.items() for p in partidas]
    if not candidatas:
        return None
    _, slug, partida = min(candidatas, key=lambda c: c[0])
    valor = kda(partida["asesinatos"], partida["muertes"], partida["asistencias"])
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
        # Solo las partidas guardadas desde que se agregó el daño lo traen.
        "danio": partida.get("danio") if isinstance(partida.get("danio"), int) else None,
    }
