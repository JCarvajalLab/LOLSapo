"""Estadísticas agregadas de campeones jugados por el grupo y por cada amigo.

Calcula campeones más jugados, KDA, winrate, CS/min y desglose por líneas (TOP, JUNGLE,
MIDDLE, BOTTOM, UTILITY) para diferentes períodos (30, 60, 90 días y todo lo registrado).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from lolsapo.modos import MapaModos

POSICIONES = ("TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY")
CATEGORIAS = {"normal", "ranked"}

PERIODOS: dict[str, int | None] = {
    "dias_30": 30,
    "dias_90": 90,
    "todo": None,
}


def _posicion_jugador(partida: dict, slug: str) -> str | None:
    """Detecta la línea o rol en que jugó el amigo en la partida."""
    participantes = partida.get("participantes")
    if not isinstance(participantes, list):
        return None

    # Primero por slug de amigo directo
    for p in participantes:
        if isinstance(p, dict) and p.get("amigo") == slug:
            pos = p.get("posicion")
            if pos in POSICIONES:
                return pos

    # Si no tiene amigo asignado, por campeón y equipo
    cid = partida.get("campeon_id")
    eq = partida.get("equipo")
    for p in participantes:
        if isinstance(p, dict) and p.get("campeon_id") == cid and p.get("equipo") == eq:
            pos = p.get("posicion")
            if pos in POSICIONES:
                return pos

    # Inferencia de respaldo para partidas antiguas sin campo posicion:
    hechizos = partida.get("hechizos") or []
    if 11 in hechizos:
        return "JUNGLE"

    items = set(partida.get("items") or [])
    # Ítems iniciales y evoluciones de soporte oficiales de LoL (S14 / S15 / S16)
    items_soporte = {
        3865,
        3866,
        3867,
        3869,
        3870,
        3871,
        3876,
        3877,
        3850,
        3851,
        3853,
        3854,
        3855,
        3857,
        3858,
        3859,
        3860,
    }
    if items & items_soporte:
        return "UTILITY"

    return None


def _kda(asesinatos: int, muertes: int, asistencias: int) -> float:
    """Ratio KDA formateado a 2 decimales."""
    return round((asesinatos + asistencias) / max(1, muertes), 2)


def _winrate(victorias: int, derrotas: int) -> float | None:
    total = victorias + derrotas
    return round(victorias * 100 / total, 1) if total > 0 else None


def _agregar_partidas(partidas_con_amigo: list[tuple[dict, str]]) -> dict:
    """Agrega partidas en estadísticas por campeón y por línea."""
    por_campeon: dict[int, dict] = {}
    por_linea: dict[str, dict[int, dict]] = {pos: {} for pos in POSICIONES}
    conteo_lineas: dict[str, dict] = {
        pos: {"partidas": 0, "victorias": 0, "derrotas": 0} for pos in POSICIONES
    }
    partidas_con_linea = 0

    for partida, slug in partidas_con_amigo:
        cid = partida.get("campeon_id")
        cname = partida.get("campeon")
        if not isinstance(cid, int) or not isinstance(cname, str):
            continue

        res = partida.get("resultado")
        es_victoria = res == "victoria"
        es_derrota = res == "derrota"
        if not (es_victoria or es_derrota):
            continue

        kills = partida.get("asesinatos") or 0
        deaths = partida.get("muertes") or 0
        assists = partida.get("asistencias") or 0
        cs = partida.get("cs") or 0
        duracion = partida.get("duracion") or 0
        danio = partida.get("danio") or 0

        # Acumular a nivel de campeón total
        if cid not in por_campeon:
            por_campeon[cid] = {
                "campeon_id": cid,
                "campeon": cname,
                "partidas": 0,
                "victorias": 0,
                "derrotas": 0,
                "asesinatos": 0,
                "muertes": 0,
                "asistencias": 0,
                "cs": 0,
                "danio": 0,
                "duracion": 0,
                "amigos_conteo": {},
            }
        c_stat = por_campeon[cid]
        c_stat["partidas"] += 1
        c_stat["amigos_conteo"][slug] = c_stat["amigos_conteo"].get(slug, 0) + 1
        if es_victoria:
            c_stat["victorias"] += 1
        else:
            c_stat["derrotas"] += 1
        c_stat["asesinatos"] += kills
        c_stat["muertes"] += deaths
        c_stat["asistencias"] += assists
        c_stat["cs"] += cs
        c_stat["danio"] += danio
        c_stat["duracion"] += duracion

        # Acumular por línea
        pos = _posicion_jugador(partida, slug)
        if pos in POSICIONES:
            partidas_con_linea += 1
            conteo_lineas[pos]["partidas"] += 1
            if es_victoria:
                conteo_lineas[pos]["victorias"] += 1
            else:
                conteo_lineas[pos]["derrotas"] += 1

            if cid not in por_linea[pos]:
                por_linea[pos][cid] = {
                    "campeon_id": cid,
                    "campeon": cname,
                    "posicion": pos,
                    "partidas": 0,
                    "victorias": 0,
                    "derrotas": 0,
                    "asesinatos": 0,
                    "muertes": 0,
                    "asistencias": 0,
                    "cs": 0,
                    "danio": 0,
                    "duracion": 0,
                    "amigos_conteo": {},
                }
            l_stat = por_linea[pos][cid]
            l_stat["partidas"] += 1
            l_stat["amigos_conteo"][slug] = l_stat["amigos_conteo"].get(slug, 0) + 1
            if es_victoria:
                l_stat["victorias"] += 1
            else:
                l_stat["derrotas"] += 1
            l_stat["asesinatos"] += kills
            l_stat["muertes"] += deaths
            l_stat["asistencias"] += assists
            l_stat["cs"] += cs
            l_stat["danio"] += danio
            l_stat["duracion"] += duracion

    def _formatear_lista(stats_dict: dict[int, dict]) -> list[dict]:
        lista = []
        for s in stats_dict.values():
            n = s["partidas"]
            minutos = s["duracion"] / 60 if s["duracion"] > 0 else 0
            amigos_ordenados = sorted(
                [{"slug": sm, "partidas": cant} for sm, cant in s["amigos_conteo"].items()],
                key=lambda x: -x["partidas"],
            )
            amigo_ppal = amigos_ordenados[0]["slug"] if amigos_ordenados else None
            lista.append(
                {
                    "campeon_id": s["campeon_id"],
                    "campeon": s["campeon"],
                    "partidas": n,
                    "victorias": s["victorias"],
                    "derrotas": s["derrotas"],
                    "winrate": _winrate(s["victorias"], s["derrotas"]),
                    "kda": _kda(s["asesinatos"], s["muertes"], s["asistencias"]),
                    "promedio_kda": {
                        "asesinatos": round(s["asesinatos"] / n, 1) if n else 0.0,
                        "muertes": round(s["muertes"] / n, 1) if n else 0.0,
                        "asistencias": round(s["asistencias"] / n, 1) if n else 0.0,
                    },
                    "cs": s["cs"],
                    "cs_promedio": round(s["cs"] / n, 1) if n else 0.0,
                    "cs_minuto": round(s["cs"] / minutos, 1) if minutos > 0 else 0.0,
                    "danio_promedio": round(s["danio"] / n) if n else 0,
                    "amigos": amigos_ordenados,
                    "amigo_principal": amigo_ppal,
                }
            )
        lista.sort(key=lambda c: (-c["partidas"], -(c["winrate"] or 0), c["campeon"]))
        return lista

    campeones_lista = _formatear_lista(por_campeon)
    campeones_por_linea = {pos: _formatear_lista(por_linea[pos]) for pos in POSICIONES}

    resumen_lineas = {}
    for pos in POSICIONES:
        cl = conteo_lineas[pos]
        n_pos = cl["partidas"]
        pct = round(n_pos * 100 / partidas_con_linea, 1) if partidas_con_linea > 0 else 0.0
        resumen_lineas[pos] = {
            "posicion": pos,
            "partidas": n_pos,
            "victorias": cl["victorias"],
            "derrotas": cl["derrotas"],
            "winrate": _winrate(cl["victorias"], cl["derrotas"]),
            "porcentaje": pct,
        }

    return {
        "campeones": campeones_lista,
        "por_linea": campeones_por_linea,
        "resumen_lineas": resumen_lineas,
        "total_partidas": sum(c["partidas"] for c in campeones_lista),
    }


def calcular_estadisticas_campeones(
    registradas: dict[str, list[dict]],
    mapa: MapaModos,
    ahora_ms: int,
) -> dict:
    """Calcula las estadísticas de campeones en períodos de 30d, 60d, 90d y todo.

    Devuelve un diccionario estructurado con:
    - 'global': estadísticas consolidadas del grupo completo.
    - 'por_amigo': desglose para cada amigo por slug.
    """
    # Filtrar partidas válidas de LoL (Normal y Ranked)
    partidas_por_slug: dict[str, list[dict]] = {}
    for slug, partidas in registradas.items():
        validas = []
        for p in partidas:
            if not isinstance(p, dict):
                continue
            qid = p.get("queue_id")
            modo = mapa.obtener(qid) if qid is not None else None
            if (
                modo
                and modo.categoria in CATEGORIAS
                and p.get("resultado") in ("victoria", "derrota")
            ):
                validas.append(p)
        partidas_por_slug[slug] = validas

    resultado: dict[str, dict] = {"global": {}, "por_amigo": {slug: {} for slug in registradas}}

    for clave_periodo, dias in PERIODOS.items():
        limite_ms = (ahora_ms - dias * 24 * 60 * 60 * 1000) if dias is not None else 0

        # 1. Por amigo
        todas_en_periodo: list[tuple[dict, str]] = []
        for slug, partidas in partidas_por_slug.items():
            en_periodo = [
                (p, slug)
                for p in partidas
                if isinstance(p.get("fecha"), int) and p["fecha"] >= limite_ms
            ]
            resultado["por_amigo"][slug][clave_periodo] = _agregar_partidas(en_periodo)
            todas_en_periodo.extend(en_periodo)

        # 2. Global (agregado de todos los amigos del grupo)
        resultado["global"][clave_periodo] = _agregar_partidas(todas_en_periodo)

    return resultado
