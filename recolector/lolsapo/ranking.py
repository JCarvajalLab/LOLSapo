"""Ranking interno del grupo.

Orden: primero quienes tienen rango Solo/Dúo (de mayor a menor tier, división y LP); después
el resto, por winrate total del registro de LOLSapo y luego por cantidad de partidas.
"""

from .validacion import DIVISIONES, TIERS


def valor_rango(rango: dict | None) -> tuple[int, int, int] | None:
    if not rango:
        return None
    division = DIVISIONES.index(rango["division"]) if rango.get("division") else len(DIVISIONES)
    return (TIERS.index(rango["tier"]), division, rango["lp"])


def calcular_ranking(amigos: list[dict]) -> list[dict]:
    """Recibe los amigos ya armados para lol.json y devuelve su orden en el ranking."""

    def clave(amigo: dict):
        solo = valor_rango((amigo.get("rangos") or {}).get("solo"))
        total = (amigo.get("estadisticas") or {}).get("total") or {}
        winrate = total.get("winrate")
        if solo is not None:
            return (0, tuple(-x for x in solo), 0, 0, amigo["riot_id"].casefold())
        return (
            1,
            (),
            -(winrate if winrate is not None else -1),
            -total.get("partidas", 0),
            amigo["riot_id"].casefold(),
        )

    ordenados = sorted(amigos, key=clave)
    return [
        {
            "posicion": posicion,
            "slug": amigo["slug"],
            "riot_id": amigo["riot_id"],
            "criterio": "rango" if clave(amigo)[0] == 0 else "winrate",
        }
        for posicion, amigo in enumerate(ordenados, start=1)
    ]
