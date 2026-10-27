"""Destacados del grupo en TFT, calculados desde el registro de cada amigo.

A diferencia de LoL, en TFT los amigos juegan partidas individuales o en parejas (Dúo dinámico),
y no hay bloque diario ("hoy") debido a que el volumen diario es menor. Se calculan:

Bloque "semana" (de lunes a domingo; se reinicia el lunes a la 01:00 de Chile):
- Mejor partida: la actuación con 1.º lugar (o el mejor puesto) con más daño, eliminados y nivel.
- Mejor % Top 4: amigo con mayor porcentaje de Top 4 (desde 2 partidas).
- Más partidas: quien jugó más partidas en la semana.
- Balance del grupo: total de partidas, primeros lugares (#1), Top 4s (#1-4) y puesto promedio.
- Peor partida: la actuación con 8.º lugar (o el puesto más bajo) con menor daño o menor ronda.

Bloque "mes" (del día 1 a la 01:00 de Chile al día 1 del mes siguiente):
- Mismas métricas agregadas del mes (Mejor % Top 4 pide mínimo 3 partidas).

Además, `tops` trae el ranking de cada tarjeta (top 5 por amigo) y `tops_global` las 5 mejores
o peores partidas del período de forma global.
"""

from collections.abc import Iterable

from .destacados import inicio_de_la_semana, mes_a_mostrar
from .modos import MapaModos

MINIMO_PARTIDAS_SEMANA = 2
MINIMO_PARTIDAS_MES = 3
TOP = 5

# Modos excluidos de destacados de TFT (Tutorial y Personalizada)
QUEUES_IGNORADAS = {0, 1110}


def _entero(valor) -> bool:
    return isinstance(valor, int) and not isinstance(valor, bool) and valor >= 0


def _completa_tft(partida) -> bool:
    """Una partida de TFT del registro con los campos mínimos requeridos."""
    if not isinstance(partida, dict):
        return False
    puesto = partida.get("puesto")
    fecha = partida.get("fecha")
    if not isinstance(puesto, int) or isinstance(puesto, bool) or not (1 <= puesto <= 8):
        return False
    if not isinstance(fecha, int) or isinstance(fecha, bool) or fecha <= 0:
        return False
    queue_id = partida.get("queue_id")
    if queue_id in QUEUES_IGNORADAS:
        return False
    return True


def partidas_validas_tft(
    partidas: Iterable[dict],
    desde_ms: int,
    hasta_ms: int | None = None,
) -> list[dict]:
    """Partidas completas dentro del rango temporal dado, ordenadas por fecha ascendente."""
    validas = [
        p
        for p in partidas
        if _completa_tft(p)
        and p["fecha"] >= desde_ms
        and (hasta_ms is None or p["fecha"] < hasta_ms)
    ]
    return sorted(validas, key=lambda p: p["fecha"])


def _orden_partida_tft(slug: str, p: dict, *, mejor: bool) -> tuple:
    """Orden de desempate para elegir la mejor o peor partida de TFT.

    Mejor: puesto menor (1 es el mejor), más daño, más eliminados, mayor nivel,
           mayor ronda, más reciente.
    Peor:  puesto mayor (8 es el peor), menor ronda, menor daño, más reciente.
    """
    puesto = p["puesto"]
    danio = p.get("danio") if _entero(p.get("danio")) else 0
    eliminados = p.get("eliminados") if _entero(p.get("eliminados")) else 0
    nivel = p.get("nivel") if _entero(p.get("nivel")) else 0
    ronda = p.get("ronda") if _entero(p.get("ronda")) else 0
    fecha = p["fecha"]

    if mejor:
        return (
            puesto,
            -danio,
            -eliminados,
            -nivel,
            -ronda,
            -fecha,
            slug,
        )
    return (
        -puesto,
        ronda,
        danio,
        -fecha,
        slug,
    )


def _formatear_partida(slug: str, p: dict, mapa: MapaModos) -> dict:
    """Formatea una partida individual de TFT para mostrarla en tarjetas o modales."""
    return {
        "amigos": [slug],
        "partida_id": p.get("id"),
        "puesto": p["puesto"],
        "nivel": p.get("nivel", 0),
        "ronda": p.get("ronda", 0),
        "danio": p.get("danio", 0),
        "eliminados": p.get("eliminados", 0),
        "duracion": p.get("duracion", 0),
        "modo": mapa.obtener(p.get("queue_id")).nombre,
        "fecha": p["fecha"],
        "unidades": p.get("unidades", []),
        "rasgos": p.get("rasgos", []),
    }


def _partida_destacada_tft(
    partidas_por_slug: dict[str, list[dict]],
    mapa: MapaModos,
    *,
    mejor: bool,
) -> dict | None:
    candidatas = [(slug, p) for slug, partidas in partidas_por_slug.items() for p in partidas]
    if not candidatas:
        return None
    candidatas.sort(key=lambda c: _orden_partida_tft(c[0], c[1], mejor=mejor))
    ganador_slug, ganador_partida = candidatas[0]
    return _formatear_partida(ganador_slug, ganador_partida, mapa)


def _calcular_resumen_jugador(partidas: list[dict]) -> dict:
    total = len(partidas)
    if total == 0:
        return {
            "partidas": 0,
            "primeros": 0,
            "top4": 0,
            "top4_pct": None,
            "promedio": None,
        }
    primeros = sum(1 for p in partidas if p["puesto"] == 1)
    top4 = sum(1 for p in partidas if p["puesto"] <= 4)
    top4_pct = round(top4 * 100 / total, 1)
    promedio = round(sum(p["puesto"] for p in partidas) / total, 2)
    return {
        "partidas": total,
        "primeros": primeros,
        "top4": top4,
        "top4_pct": top4_pct,
        "promedio": promedio,
    }


def _mejor_top4_tft(
    partidas_por_slug: dict[str, list[dict]],
    minimo: int,
) -> dict | None:
    """Amigo con mejor % de Top 4 en el período (con un mínimo de partidas)."""
    candidatos = []
    for slug, partidas in partidas_por_slug.items():
        if len(partidas) < minimo:
            continue
        res = _calcular_resumen_jugador(partidas)
        candidatos.append((slug, res))

    if not candidatos:
        return None

    # Orden: mayor % top 4, más partidas, menor puesto promedio, slug
    candidatos.sort(
        key=lambda c: (
            -(c[1]["top4_pct"] if c[1]["top4_pct"] is not None else -1),
            -c[1]["partidas"],
            c[1]["promedio"] if c[1]["promedio"] is not None else 9,
            c[0],
        )
    )

    mejor_slug, mejor_res = candidatos[0]
    # Buscar empates exactos
    empatados = [
        slug
        for slug, res in candidatos
        if res["top4_pct"] == mejor_res["top4_pct"]
        and res["partidas"] == mejor_res["partidas"]
        and res["promedio"] == mejor_res["promedio"]
    ]

    return {
        "amigos": empatados,
        "top4_pct": mejor_res["top4_pct"],
        "top4": mejor_res["top4"],
        "partidas": mejor_res["partidas"],
        "primeros": mejor_res["primeros"],
        "promedio": mejor_res["promedio"],
    }


def _mas_partidas_tft(partidas_por_slug: dict[str, list[dict]]) -> dict | None:
    """Amigo que más partidas jugó en el período."""
    con_partidas = [
        (slug, len(partidas)) for slug, partidas in partidas_por_slug.items() if len(partidas) > 0
    ]
    if not con_partidas:
        return None

    con_partidas.sort(key=lambda c: (-c[1], c[0]))
    max_partidas = con_partidas[0][1]
    empatados = [slug for slug, cant in con_partidas if cant == max_partidas]

    return {
        "amigos": empatados,
        "partidas": max_partidas,
    }


def _balance_tft(partidas_por_slug: dict[str, list[dict]]) -> dict | None:
    """Balance agregado de todo el grupo en el período."""
    total_partidas = sum(len(partidas) for partidas in partidas_por_slug.values())
    if total_partidas == 0:
        return None

    todas = [p for partidas in partidas_por_slug.values() for p in partidas]
    primeros = sum(1 for p in todas if p["puesto"] == 1)
    top4 = sum(1 for p in todas if p["puesto"] <= 4)
    top4_pct = round(top4 * 100 / total_partidas, 1)
    promedio = round(sum(p["puesto"] for p in todas) / total_partidas, 2)

    jugadas = {
        slug: len(partidas) for slug, partidas in partidas_por_slug.items() if len(partidas) > 0
    }
    amigos_ordenados = sorted(jugadas, key=lambda s: (-jugadas[s], s))

    return {
        "partidas": total_partidas,
        "primeros": primeros,
        "top4": top4,
        "top4_pct": top4_pct,
        "promedio": promedio,
        "amigos": amigos_ordenados,
        "jugadas": jugadas,
    }


def _top_partidas_tft(
    partidas_por_slug: dict[str, list[dict]],
    mapa: MapaModos,
    *,
    mejor: bool,
) -> list[dict]:
    """La mejor (o peor) partida de cada amigo en el período."""
    primeras: dict[str, dict] = {}
    candidatas = [(slug, p) for slug, partidas in partidas_por_slug.items() for p in partidas]
    candidatas.sort(key=lambda c: _orden_partida_tft(c[0], c[1], mejor=mejor))
    for slug, partida in candidatas:
        if slug not in primeras:
            primeras[slug] = partida
    return [_formatear_partida(slug, p, mapa) for slug, p in primeras.items()][:TOP]


def _top_global_tft(
    partidas_por_slug: dict[str, list[dict]],
    mapa: MapaModos,
    *,
    mejor: bool,
) -> list[dict]:
    """Las 5 mejores (o peores) partidas de todo el grupo (puede repetir amigo)."""
    candidatas = [(slug, p) for slug, partidas in partidas_por_slug.items() for p in partidas]
    candidatas.sort(key=lambda c: _orden_partida_tft(c[0], c[1], mejor=mejor))
    return [_formatear_partida(slug, p, mapa) for slug, p in candidatas[:TOP]]


def _top_records_tft(
    partidas_por_slug: dict[str, list[dict]],
    *,
    por_top4: bool = True,
    minimo: int = 1,
) -> list[dict]:
    filas = []
    for slug, partidas in partidas_por_slug.items():
        if len(partidas) < minimo:
            continue
        res = _calcular_resumen_jugador(partidas)
        filas.append(
            {
                "amigos": [slug],
                "partidas": res["partidas"],
                "primeros": res["primeros"],
                "top4": res["top4"],
                "top4_pct": res["top4_pct"],
                "promedio": res["promedio"],
            }
        )

    def orden(f: dict):
        t4 = f["top4_pct"] if f["top4_pct"] is not None else -1
        if por_top4:
            return (-t4, -f["partidas"], f["promedio"] or 9, f["amigos"][0])
        return (-f["partidas"], -t4, f["promedio"] or 9, f["amigos"][0])

    return sorted(filas, key=orden)[:TOP]


def calcular_destacados_tft(
    registradas: dict[str, list[dict]],
    mapa: MapaModos,
    ahora_ms: int,
) -> dict:
    """Calcula el bloque de destacados de la semana y del mes para TFT."""
    desde_semana = inicio_de_la_semana(ahora_ms)
    mes = mes_a_mostrar(ahora_ms)

    semana = {
        slug: partidas_validas_tft(partidas, desde_semana) for slug, partidas in registradas.items()
    }
    del_mes = {
        slug: partidas_validas_tft(partidas, mes["desde"], mes["hasta"])
        for slug, partidas in registradas.items()
    }

    return {
        "semana_desde": desde_semana,
        "mejor_jugador_semana": _partida_destacada_tft(semana, mapa, mejor=True),
        "mejor_top4_semana": _mejor_top4_tft(semana, MINIMO_PARTIDAS_SEMANA),
        "mas_partidas_semana": _mas_partidas_tft(semana),
        "balance_semana": _balance_tft(semana),
        "peor_jugador_semana": _partida_destacada_tft(semana, mapa, mejor=False),
        # Bloque mes
        "mes": mes,
        "mejor_jugador_mes": _partida_destacada_tft(del_mes, mapa, mejor=True),
        "mejor_top4_mes": _mejor_top4_tft(del_mes, MINIMO_PARTIDAS_MES),
        "mas_partidas_mes": _mas_partidas_tft(del_mes),
        "balance_mes": _balance_tft(del_mes),
        "peor_jugador_mes": _partida_destacada_tft(del_mes, mapa, mejor=False),
        # Tops
        "tops": {
            "mejor_jugador_semana": _top_partidas_tft(semana, mapa, mejor=True),
            "peor_jugador_semana": _top_partidas_tft(semana, mapa, mejor=False),
            "mejor_top4_semana": _top_records_tft(
                semana, por_top4=True, minimo=MINIMO_PARTIDAS_SEMANA
            ),
            "mas_partidas_semana": _top_records_tft(semana, por_top4=False),
            "balance_semana": _top_records_tft(semana, por_top4=False),
            "mejor_jugador_mes": _top_partidas_tft(del_mes, mapa, mejor=True),
            "peor_jugador_mes": _top_partidas_tft(del_mes, mapa, mejor=False),
            "mejor_top4_mes": _top_records_tft(del_mes, por_top4=True, minimo=MINIMO_PARTIDAS_MES),
            "mas_partidas_mes": _top_records_tft(del_mes, por_top4=False),
            "balance_mes": _top_records_tft(del_mes, por_top4=False),
        },
        "tops_global": {
            "mejor_jugador_semana": _top_global_tft(semana, mapa, mejor=True),
            "peor_jugador_semana": _top_global_tft(semana, mapa, mejor=False),
            "mejor_jugador_mes": _top_global_tft(del_mes, mapa, mejor=True),
            "peor_jugador_mes": _top_global_tft(del_mes, mapa, mejor=False),
        },
    }
