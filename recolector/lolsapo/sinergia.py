"""Sinergia del grupo (LoL): con quién gana más cada amigo jugando en el mismo equipo.

Para cada amigo, por cada otro amigo del grupo: cuántas partidas jugaron juntos en el mismo
equipo y cuántas ganaron. Solo Normal y Ranked (Solo/Dúo y Flex), sin remakes, con todo lo
registrado. Las partidas se juntan desde los registros de todos (sin repetir): una partida que
solo quedó en el registro de un amigo cuenta igual para todos los que la jugaron.
"""

from collections.abc import Iterable

from .destacados import _partidas_en_grupo, _partidas_validas
from .modos import MapaModos
from .registro import winrate


def calcular_sinergia(partidas_por_amigo: dict[str, Iterable[dict]], mapa: MapaModos) -> dict:
    """{slug: [{"amigo", "partidas", "victorias", "derrotas", "winrate"}, ...]}.

    Cada lista va de quien jugó más partidas juntos a quien jugó menos (y por nombre si empatan).
    Los amigos con los que nunca jugó no aparecen.
    """
    validas = {s: _partidas_validas(p, mapa, 0) for s, p in partidas_por_amigo.items()}
    juntos: dict[str, dict[str, list[int]]] = {s: {} for s in validas}
    for partida, equipo in _partidas_en_grupo(validas):
        gano = partida["resultado"] == "victoria"
        for amigo in equipo:
            for companero in equipo - {amigo}:
                conteo = juntos[amigo].setdefault(companero, [0, 0])
                conteo[0] += 1
                conteo[1] += gano

    return {
        amigo: [
            {
                "amigo": companero,
                "partidas": partidas,
                "victorias": victorias,
                "derrotas": partidas - victorias,
                "winrate": winrate(victorias, partidas - victorias),
            }
            for companero, (partidas, victorias) in sorted(
                companeros.items(), key=lambda c: (-c[1][0], c[0])
            )
        ]
        for amigo, companeros in juntos.items()
    }
