"""Destacados del grupo (LoL), calculados desde el registro de cada amigo.

Solo cuentan Normal y Ranked (Solo/Dúo y Flex): ARAM, ARAM Caos y los modos especiales
quedan fuera. Los remakes tampoco cuentan. Todo usa partidas "en grupo": 2 o más del grupo en
el mismo equipo.

Bloque "hoy" (desde las 12:00 de Chile; se reinicia cada día a esa hora):
- Mejor y peor jugador de la partida: cada amigo en cada partida es una actuación, y gana la de
  KDA más alto o más bajo (por partida, sin sumar).
- Balance del grupo: victorias y derrotas de las partidas en grupo (cada partida cuenta una vez).

Bloque "semana" (de lunes a domingo; se reinicia el lunes a la 01:00 de Chile):
- Más partidas: quien jugó más partidas en grupo.
- Mejor winrate: desde 2 partidas; gana el % más alto y, con el mismo %, quien jugó más.
- Mejor y peor jugador de la semana: como los de hoy, con las partidas de la semana.
- Rachas en equipo: las partidas en grupo de la semana, en orden. La racha sigue mientras se
  repite el resultado y cada partida comparte al menos un amigo con la anterior; trae a todos
  los que participaron y cuántas partidas de la racha jugó cada uno. Se arman desde las
  partidas (que dicen qué amigos estaban en el equipo), no desde el registro de cada uno: así
  una partida registrada por un amigo cuenta para todos los que la jugaron.

Bloque "mes" (del día 1 a la 01:00 de Chile al día 1 del mes siguiente; se actualiza durante
todo el mes): mejor y peor jugador y balance del grupo, con las partidas en grupo del mes. Los
días 1, 2 y 3 se muestra el mes anterior, ya cerrado, para que no quede vacío. Se cuenta desde
octubre de 2026.

Además, `tops` trae el ranking del grupo de cada tarjeta (menos las rachas), con una entrada
por amigo: su mejor o peor partida, su récord o sus partidas en el período.

Con empate exacto (después de los desempates) aparecen todos los amigos que lo ganan: lo normal,
porque el grupo suele jugar junto.
"""

from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from .modos import MapaModos
from .registro import winrate

CATEGORIAS = ("ranked", "normal")
MINIMO_EN_GRUPO = 2  # amigos en el mismo equipo para que una partida sea "en grupo"
MINIMO_PARTIDAS = 2  # para el winrate: así no gana alguien con 1 sola partida
ZONA = ZoneInfo("America/Santiago")
# El "día" del grupo empieza a las 12:00 de Chile (antes de esa hora nadie juega en grupo).
HORA_INICIO_DIA = 12
# La semana va de lunes a domingo y empieza el lunes a la 01:00 de Chile.
HORA_INICIO_SEMANA = 1


def _a_las(fecha: datetime, hora: int) -> datetime:
    return fecha.replace(hour=hora, minute=0, second=0, microsecond=0)


def _ms(fecha: datetime) -> int:
    return int(fecha.timestamp() * 1000)


def _en_chile(ahora_ms: int) -> datetime:
    return datetime.fromtimestamp(ahora_ms / 1000, tz=UTC).astimezone(ZONA)


def inicio_del_dia(ahora_ms: int) -> int:
    """Última vez que fueron las 12:00 en Chile (en ms). A las 2:00 sigue siendo "ayer"."""
    ahora = _en_chile(ahora_ms)
    inicio = _a_las(ahora, HORA_INICIO_DIA)
    if inicio > ahora:
        inicio = _a_las(ahora - timedelta(days=1), HORA_INICIO_DIA)
    return _ms(inicio)


def inicio_de_la_semana(ahora_ms: int) -> int:
    """Último lunes a la 01:00 de Chile (en ms). El lunes a las 00:30 sigue siendo la anterior."""
    ahora = _en_chile(ahora_ms)
    inicio = _a_las(ahora - timedelta(days=ahora.weekday()), HORA_INICIO_SEMANA)
    if inicio > ahora:
        inicio = _a_las(inicio - timedelta(days=7), HORA_INICIO_SEMANA)
    return _ms(inicio)


# El mes empieza el día 1 a la 01:00 de Chile (como la semana: lo jugado pasada la medianoche
# del último día cuenta para el mes que termina). Los primeros días se muestra el anterior.
HORA_INICIO_MES = 1
DIAS_MES_ANTERIOR = 3
PRIMER_MES = (2026, 10)  # antes de octubre de 2026 no hay registro completo
MESES = (
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)


def _inicio_mes(anio: int, mes: int) -> datetime:
    return datetime(anio, mes, 1, HORA_INICIO_MES, tzinfo=ZONA)


def _mes_siguiente(anio: int, mes: int) -> tuple[int, int]:
    return (anio + 1, 1) if mes == 12 else (anio, mes + 1)


def mes_a_mostrar(ahora_ms: int) -> dict:
    """El mes del bloque "mes": {"anio", "mes", "nombre", "desde", "hasta", "cerrado"}.

    El mes en curso (con `hasta` = inicio del siguiente) o, los días 1 a 3, el anterior cerrado.
    Nunca antes de PRIMER_MES.
    """
    ahora = _en_chile(ahora_ms)
    anio, mes = ahora.year, ahora.month
    if ahora < _inicio_mes(anio, mes):  # día 1 antes de la 01:00: sigue el mes anterior
        anio, mes = (anio - 1, 12) if mes == 1 else (anio, mes - 1)
    cerrado = False
    if ahora < _inicio_mes(anio, mes) + timedelta(days=DIAS_MES_ANTERIOR):
        anterior = (anio - 1, 12) if mes == 1 else (anio, mes - 1)
        if anterior >= PRIMER_MES:
            anio, mes, cerrado = *anterior, True
    if (anio, mes) < PRIMER_MES:
        anio, mes = PRIMER_MES
    return {
        "anio": anio,
        "mes": mes,
        "nombre": MESES[mes - 1],
        "desde": _ms(_inicio_mes(anio, mes)),
        "hasta": _ms(_inicio_mes(*_mes_siguiente(anio, mes))),
        "cerrado": cerrado,
    }


RACHA_MINIMA = 2


def kda(asesinatos: int, muertes: int, asistencias: int) -> float:
    """(asesinatos + asistencias) / muertes, con muertes mínimo 1 (sin muertes = "perfecto")."""
    return round((asesinatos + asistencias) / max(muertes, 1), 2)


def _entero(valor) -> bool:
    return isinstance(valor, int) and not isinstance(valor, bool) and valor >= 0


def _completa(partida) -> bool:
    """Una partida del registro con todo lo que usan los destacados (si no, se omite)."""
    return (
        isinstance(partida, dict)
        and isinstance(partida.get("id"), str)
        and isinstance(partida.get("campeon"), str)
        and all(
            _entero(partida.get(c)) for c in ("asesinatos", "muertes", "asistencias", "campeon_id")
        )
    )


def partidas_validas(partidas: Iterable[dict], mapa: MapaModos, desde_ms: int) -> list[dict]:
    validas = [
        p
        for p in partidas
        if _completa(p)
        and isinstance(p.get("fecha"), int)
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


def partidas_en_grupo(validas: dict[str, list[dict]]) -> list[tuple[dict, set[str]]]:
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
    hoy_desde = inicio_del_dia(ahora_ms)
    semana_desde = inicio_de_la_semana(ahora_ms)
    mes = mes_a_mostrar(ahora_ms)
    # Los períodos se superponen distinto según el día: se leen todos desde el más antiguo.
    desde = min(hoy_desde, semana_desde, mes["desde"])
    validas = {s: partidas_validas(p, mapa, desde) for s, p in partidas_por_amigo.items()}
    # Actuaciones en grupo: la partida de cada amigo, si la jugó con otro del grupo.
    en_grupo = {
        s: [p for p in partidas if _en_grupo_actual(p, validas)] for s, partidas in validas.items()
    }
    semana = {s: [p for p in ps if p["fecha"] >= semana_desde] for s, ps in en_grupo.items()}
    hoy = {s: [p for p in ps if p["fecha"] >= hoy_desde] for s, ps in en_grupo.items()}
    resumenes = {s: _resumen(p) for s, p in semana.items() if p}
    en_grupo_ordenadas = partidas_en_grupo(validas)
    en_grupo_semana = [(p, e) for p, e in en_grupo_ordenadas if p["fecha"] >= semana_desde]
    en_el_mes = lambda f: mes["desde"] <= f < mes["hasta"]  # noqa: E731
    del_mes = {s: [p for p in ps if en_el_mes(p["fecha"])] for s, ps in en_grupo.items()}
    en_grupo_mes = [(p, e) for p, e in en_grupo_ordenadas if en_el_mes(p["fecha"])]

    return {
        "hoy_desde": hoy_desde,
        "semana_desde": semana_desde,
        # Bloque "hoy"
        "mejor_jugador_hoy": _partida_destacada(hoy, mapa, mejor=True),
        "peor_jugador_hoy": _partida_destacada(hoy, mapa, mejor=False),
        "balance_hoy": _balance(en_grupo_ordenadas, hoy_desde),
        # Bloque "semana"
        "mas_partidas": _destacado(
            _ganadores(resumenes, lambda r: r["partidas"]), resumenes, ("partidas",)
        ),
        "mejor_winrate": _destacado(
            _ganadores(resumenes, lambda r: (r["winrate"], r["partidas"]), MINIMO_PARTIDAS),
            resumenes,
            ("winrate", "victorias", "derrotas", "partidas"),
        ),
        "mejor_jugador_semana": _partida_destacada(semana, mapa, mejor=True),
        "racha_victorias_grupo": _racha_en_equipo(en_grupo_semana, "victoria"),
        "racha_derrotas_grupo": _racha_en_equipo(en_grupo_semana, "derrota"),
        "peor_jugador_semana": _partida_destacada(semana, mapa, mejor=False),
        # Bloque "mes"
        "mes": mes,
        "mejor_jugador_mes": _partida_destacada(del_mes, mapa, mejor=True),
        "peor_jugador_mes": _partida_destacada(del_mes, mapa, mejor=False),
        "balance_mes": _balance(en_grupo_mes, mes["desde"]),
        # Ranking del grupo de cada tarjeta (se ve al hacer clic en ella)
        "tops": {
            "mejor_jugador_hoy": _top_partidas(hoy, mapa, mejor=True),
            "peor_jugador_hoy": _top_partidas(hoy, mapa, mejor=False),
            "balance_hoy": _top_records(hoy, por_winrate=False),
            "mas_partidas": _top_records(semana, por_winrate=False),
            "mejor_winrate": _top_records(semana, minimo=MINIMO_PARTIDAS),
            "mejor_jugador_semana": _top_partidas(semana, mapa, mejor=True),
            "peor_jugador_semana": _top_partidas(semana, mapa, mejor=False),
            "mejor_jugador_mes": _top_partidas(del_mes, mapa, mejor=True),
            "peor_jugador_mes": _top_partidas(del_mes, mapa, mejor=False),
            "balance_mes": _top_records(del_mes, por_winrate=False),
        },
    }


TOP = 5


def _top_partidas(actuaciones: dict[str, list[dict]], mapa: MapaModos, *, mejor: bool) -> list:
    """La mejor (o peor) partida de cada amigo en el período, ordenadas como la tarjeta."""
    entradas = [
        _partida_destacada({slug: partidas}, mapa, mejor=mejor)
        for slug, partidas in actuaciones.items()
        if partidas
    ]

    def orden(e: dict):
        if mejor:
            return (-e["kda"], -(e["asesinatos"] + e["asistencias"]), e["muertes"], -e["fecha"])
        return (e["kda"], -e["muertes"], -e["fecha"])

    return sorted(entradas, key=lambda e: (*orden(e), e["amigos"][0]))[:TOP]


def _top_records(
    actuaciones: dict[str, list[dict]], *, minimo: int = 1, por_winrate: bool = True
) -> list:
    """El récord de cada amigo en el período (partidas, V, D, winrate).

    Ordenado por winrate y luego partidas, o por partidas y luego winrate.
    """
    filas = []
    for slug, partidas in actuaciones.items():
        if len(partidas) < minimo:
            continue
        r = _resumen(partidas)
        filas.append(
            {
                "amigos": [slug],
                "partidas": r["partidas"],
                "victorias": r["victorias"],
                "derrotas": r["derrotas"],
                "winrate": r["winrate"],
            }
        )

    def orden(f: dict):
        w = f["winrate"] if f["winrate"] is not None else -1
        principal = (-w, -f["partidas"]) if por_winrate else (-f["partidas"], -w)
        return (*principal, f["amigos"][0])

    return sorted(filas, key=orden)[:TOP]


def _balance(en_grupo_ordenadas: list[tuple[dict, set[str]]], desde_ms: int) -> dict | None:
    """Victorias y derrotas del grupo en sus partidas en grupo desde `desde_ms`.

    Cada partida cuenta una vez, aunque la hayan jugado varios amigos.
    """
    partidas = [(p, equipo) for p, equipo in en_grupo_ordenadas if p["fecha"] >= desde_ms]
    if not partidas:
        return None
    victorias = sum(p["resultado"] == "victoria" for p, _ in partidas)
    derrotas = sum(p["resultado"] == "derrota" for p, _ in partidas)
    jugadas: dict[str, int] = {}
    for _, equipo in partidas:
        for slug in equipo:
            jugadas[slug] = jugadas.get(slug, 0) + 1
    return {
        "partidas": len(partidas),
        "victorias": victorias,
        "derrotas": derrotas,
        "winrate": winrate(victorias, derrotas),
        # Primero quienes jugaron más; `jugadas` dice cuántas partidas jugó cada uno.
        "amigos": sorted(jugadas, key=lambda s: (-jugadas[s], s)),
        "jugadas": jugadas,
    }


def _en_grupo_actual(partida: dict, validas: dict) -> bool:
    """En grupo contando solo a los amigos que siguen en la lista."""
    return len(companeros(partida) & validas.keys()) >= MINIMO_EN_GRUPO


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
