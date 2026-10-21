"""Cálculo de récords individuales y grupales para League of Legends.

Inspirado en League of Graphs / Blitz:
Calcula las mejores marcas logradas en partidas individuales (Normales y Rankeds)
organizadas en categorías: Básicos, Impacto, Multikills y Duración/Supervivencia.
Soporta períodos: 30 días, 90 días, año 2026 y todo lo registrado.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .modos import MapaModos

CATEGORIAS = {"normal", "ranked"}


def _formatear_duracion(segundos: int) -> str:
    """Convierte segundos a formato MM:SS."""
    if segundos <= 0:
        return "00:00"
    m = segundos // 60
    s = segundos % 60
    return f"{m}:{s:02d}"


def _extraer_oro_y_vision(partida: dict, slug: str) -> tuple[int, int]:
    """Obtiene oro y visión de la partida o del participante correspondiente."""
    oro = partida.get("oro")
    vision = partida.get("vision")

    if oro is None or vision is None:
        participantes = partida.get("participantes")
        if isinstance(participantes, list):
            for part in participantes:
                if isinstance(part, dict) and part.get("amigo") == slug:
                    if oro is None:
                        oro = part.get("oro")
                    if vision is None:
                        vision = part.get("vision")
                    break

    return (oro or 0, vision or 0)


def _crear_record_item(
    partida: dict,
    slug: str,
    nombre_amigo: str,
    valor_display: str | int | float,
    valor_raw: int | float,
    nombre_modo: str = "",
) -> dict:
    """Estructura normalizada para una marca récord."""
    return {
        "valor": valor_display,
        "valor_raw": valor_raw,
        "partida_id": partida.get("id"),
        "fecha": partida.get("fecha"),
        "campeon": partida.get("campeon") or "Desconocido",
        "campeon_id": partida.get("campeon_id") or 0,
        "resultado": partida.get("resultado") or "desconocido",
        "modo": nombre_modo or partida.get("modo") or "Partida",
        "duracion": partida.get("duracion") or 0,
        "amigo_slug": slug,
        "amigo_nombre": nombre_amigo,
    }


def _calcular_records_partidas(
    partidas_con_amigo: list[tuple[dict, str, str]],
    mapa: MapaModos,
) -> dict:
    """Calcula todas las categorías de récords a partir de una lista de (partida, slug, nombre)."""
    if not partidas_con_amigo:
        return {}

    # Candidatos para cada métrica
    mejor_kda = None
    mas_kills = None
    mas_assists = None
    mas_deaths = None
    mas_oro = None
    mas_cs = None
    mas_cs_min = None

    mas_danio = None
    mas_danio_recibido = None
    mas_danio_objetivos = None
    mas_participacion = None
    mas_vision = None

    mas_pentakills = None
    mas_quadrakills = None
    mas_triplekills = None
    mas_doblekills = None
    mas_racha_asesinatos = None

    mas_larga = None
    mas_corta_victoria = None
    mas_tiempo_vivo = None

    for partida, slug, nombre in partidas_con_amigo:
        qid = partida.get("queue_id")
        modo_obj = mapa.obtener(qid) if qid is not None else None
        nombre_modo = modo_obj.nombre if modo_obj else (partida.get("modo") or "Normal")

        k = partida.get("asesinatos") or 0
        d = partida.get("muertes") or 0
        a = partida.get("asistencias") or 0
        kda_ratio = round((k + a) / max(1, d), 2)
        duracion = partida.get("duracion") or 0
        minutos = duracion / 60 if duracion > 0 else 0
        cs = partida.get("cs") or 0
        cs_min = round(cs / minutos, 1) if minutos > 0 else 0.0
        danio = partida.get("danio") or 0
        danio_recibido = partida.get("danio_recibido") or 0
        danio_obj = partida.get("danio_objetivos") or 0
        part_kp = partida.get("participacion")
        oro, vision = _extraer_oro_y_vision(partida, slug)

        pentas = partida.get("pentakills") or 0
        quadras = partida.get("quadrakills") or 0
        triples = partida.get("triplekills") or 0
        dobles = partida.get("doblekills") or 0
        spree = partida.get("racha_asesinatos") or 0
        tiempo_vivo = partida.get("tiempo_vivo") or 0
        resultado = partida.get("resultado")

        # 1. Básicos
        # KDA
        if mejor_kda is None or (kda_ratio, k + a, -d, danio) > (
            mejor_kda["valor_raw"],
            mejor_kda["_ka"],
            -mejor_kda["_d"],
            mejor_kda["_danio"],
        ):
            rec = _crear_record_item(
                partida, slug, nombre, f"{kda_ratio:.2f}", kda_ratio, nombre_modo
            )
            rec["_ka"] = k + a
            rec["_d"] = d
            rec["_danio"] = danio
            mejor_kda = rec

        # Kills
        if mas_kills is None or (k, danio) > (mas_kills["valor_raw"], mas_kills["_danio"]):
            rec = _crear_record_item(partida, slug, nombre, k, k, nombre_modo)
            rec["_danio"] = danio
            mas_kills = rec

        # Assists
        if mas_assists is None or (a, danio) > (mas_assists["valor_raw"], mas_assists["_danio"]):
            rec = _crear_record_item(partida, slug, nombre, a, a, nombre_modo)
            rec["_danio"] = danio
            mas_assists = rec

        # Muertes (más muertes)
        if mas_deaths is None or d > mas_deaths["valor_raw"]:
            mas_deaths = _crear_record_item(partida, slug, nombre, d, d, nombre_modo)

        # Oro
        if oro > 0 and (mas_oro is None or oro > mas_oro["valor_raw"]):
            mas_oro = _crear_record_item(partida, slug, nombre, f"{oro:,}", oro, nombre_modo)

        # CS
        if cs > 0 and (mas_cs is None or cs > mas_cs["valor_raw"]):
            mas_cs = _crear_record_item(partida, slug, nombre, cs, cs, nombre_modo)

        # CS / Min
        if cs_min > 0 and (mas_cs_min is None or cs_min > mas_cs_min["valor_raw"]):
            mas_cs_min = _crear_record_item(
                partida, slug, nombre, f"{cs_min:.1f}", cs_min, nombre_modo
            )

        # 2. Impacto
        if danio > 0 and (mas_danio is None or danio > mas_danio["valor_raw"]):
            mas_danio = _crear_record_item(partida, slug, nombre, f"{danio:,}", danio, nombre_modo)

        if danio_recibido > 0 and (
            mas_danio_recibido is None or danio_recibido > mas_danio_recibido["valor_raw"]
        ):
            mas_danio_recibido = _crear_record_item(
                partida, slug, nombre, f"{danio_recibido:,}", danio_recibido, nombre_modo
            )

        if danio_obj > 0 and (
            mas_danio_objetivos is None or danio_obj > mas_danio_objetivos["valor_raw"]
        ):
            mas_danio_objetivos = _crear_record_item(
                partida, slug, nombre, f"{danio_obj:,}", danio_obj, nombre_modo
            )

        if part_kp is not None and (
            mas_participacion is None or part_kp > mas_participacion["valor_raw"]
        ):
            mas_participacion = _crear_record_item(
                partida, slug, nombre, f"{part_kp}%", part_kp, nombre_modo
            )

        if vision > 0 and (mas_vision is None or vision > mas_vision["valor_raw"]):
            mas_vision = _crear_record_item(partida, slug, nombre, vision, vision, nombre_modo)

        # 3. Multikills
        if pentas > 0 and (mas_pentakills is None or pentas > mas_pentakills["valor_raw"]):
            mas_pentakills = _crear_record_item(partida, slug, nombre, pentas, pentas, nombre_modo)

        if quadras > 0 and (mas_quadrakills is None or quadras > mas_quadrakills["valor_raw"]):
            mas_quadrakills = _crear_record_item(
                partida, slug, nombre, quadras, quadras, nombre_modo
            )

        if triples > 0 and (mas_triplekills is None or triples > mas_triplekills["valor_raw"]):
            mas_triplekills = _crear_record_item(
                partida, slug, nombre, triples, triples, nombre_modo
            )

        if dobles > 0 and (mas_doblekills is None or dobles > mas_doblekills["valor_raw"]):
            mas_doblekills = _crear_record_item(partida, slug, nombre, dobles, dobles, nombre_modo)

        if spree > 0 and (
            mas_racha_asesinatos is None or spree > mas_racha_asesinatos["valor_raw"]
        ):
            mas_racha_asesinatos = _crear_record_item(
                partida, slug, nombre, spree, spree, nombre_modo
            )

        # 4. Duración y supervivencia
        if duracion > 0 and (mas_larga is None or duracion > mas_larga["valor_raw"]):
            mas_larga = _crear_record_item(
                partida, slug, nombre, _formatear_duracion(duracion), duracion, nombre_modo
            )

        if (
            duracion > 0
            and resultado == "victoria"
            and (mas_corta_victoria is None or duracion < mas_corta_victoria["valor_raw"])
        ):
            mas_corta_victoria = _crear_record_item(
                partida, slug, nombre, _formatear_duracion(duracion), duracion, nombre_modo
            )

        if tiempo_vivo > 0 and (
            mas_tiempo_vivo is None or tiempo_vivo > mas_tiempo_vivo["valor_raw"]
        ):
            mas_tiempo_vivo = _crear_record_item(
                partida, slug, nombre, _formatear_duracion(tiempo_vivo), tiempo_vivo, nombre_modo
            )

    def _limpiar(item: dict | None) -> dict | None:
        if not item:
            return None
        res = dict(item)
        res.pop("_ka", None)
        res.pop("_d", None)
        res.pop("_danio", None)
        return res

    return {
        "basicos": {
            "kda": _limpiar(mejor_kda),
            "asesinatos": _limpiar(mas_kills),
            "asistencias": _limpiar(mas_assists),
            "muertes": _limpiar(mas_deaths),
            "oro": _limpiar(mas_oro),
            "cs": _limpiar(mas_cs),
            "cs_minuto": _limpiar(mas_cs_min),
        },
        "impacto": {
            "danio": _limpiar(mas_danio),
            "danio_recibido": _limpiar(mas_danio_recibido),
            "danio_objetivos": _limpiar(mas_danio_objetivos),
            "participacion": _limpiar(mas_participacion),
            "vision": _limpiar(mas_vision),
        },
        "multikills": {
            "pentakills": _limpiar(mas_pentakills),
            "quadrakills": _limpiar(mas_quadrakills),
            "triplekills": _limpiar(mas_triplekills),
            "doblekills": _limpiar(mas_doblekills),
            "racha_asesinatos": _limpiar(mas_racha_asesinatos),
        },
        "duracion": {
            "partida_mas_larga": _limpiar(mas_larga),
            "victoria_mas_rapida": _limpiar(mas_corta_victoria),
            "tiempo_vivo": _limpiar(mas_tiempo_vivo),
        },
    }


def calcular_records(
    registradas: dict[str, list[dict]],
    nombres_amigos: dict[str, str],
    mapa: MapaModos,
    ahora_ms: int,
) -> dict:
    """Calcula los récords estructurados por amigo y global para 30d, 90d, 2026 y todo."""
    # Filtrar solo partidas normales y ranked (sin remakes)
    partidas_filtradas: dict[str, list[dict]] = {}
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
        partidas_filtradas[slug] = validas

    # Límites temporales
    dt_ahora = datetime.fromtimestamp(ahora_ms / 1000, tz=UTC)
    anio_actual = dt_ahora.year
    inicio_anio_ms = int(datetime(anio_actual, 1, 1, tzinfo=UTC).timestamp() * 1000)
    fin_anio_ms = int(datetime(anio_actual + 1, 1, 1, tzinfo=UTC).timestamp() * 1000)

    periodos_def: dict[str, tuple[int, int | None]] = {
        "dias_30": (ahora_ms - 30 * 24 * 60 * 60 * 1000, None),
        "dias_90": (ahora_ms - 90 * 24 * 60 * 60 * 1000, None),
        f"anio_{anio_actual}": (inicio_anio_ms, fin_anio_ms),
        "todo": (0, None),
    }

    resultado: dict[str, dict] = {
        "anio_actual": anio_actual,
        "global": {},
        "por_amigo": {slug: {} for slug in registradas},
    }

    for clave_periodo, (inicio_ms, fin_ms) in periodos_def.items():
        todas_en_periodo: list[tuple[dict, str, str]] = []

        for slug, partidas in partidas_filtradas.items():
            nombre = nombres_amigos.get(slug, slug)
            en_periodo = []
            for p in partidas:
                fecha = p.get("fecha")
                if isinstance(fecha, int) and fecha >= inicio_ms:
                    if fin_ms is None or fecha < fin_ms:
                        en_periodo.append((p, slug, nombre))

            resultado["por_amigo"][slug][clave_periodo] = _calcular_records_partidas(
                en_periodo, mapa
            )
            todas_en_periodo.extend(en_periodo)

        # Récords globales del grupo
        resultado["global"][clave_periodo] = _calcular_records_partidas(todas_en_periodo, mapa)

    return resultado
