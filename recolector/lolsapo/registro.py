"""Registro acumulado de partidas por amigo y cálculo de estadísticas.

Riot solo da victorias/derrotas oficiales para rankeds, así que LOLSapo guarda un resumen de
cada partida que ve (de cualquier modo) y calcula sus propias estadísticas a partir de ahí.
Cada amigo tiene su archivo en datos/registro/<slug>.json.
"""

import json
import logging
import os
import tempfile
from collections.abc import Iterable
from pathlib import Path

from .modos import CATEGORIAS, MapaModos

VERSION_REGISTRO = 1

log = logging.getLogger(__name__)


def registro_vacio(riot_id: str, ahora_ms: int) -> dict:
    return {
        "version": VERSION_REGISTRO,
        "riot_id": riot_id,
        "puuid": None,
        "seguimiento_desde": ahora_ms,
        "perfil": None,
        "rangos": None,
        "partidas": {},
    }


def leer_registro(ruta: Path, riot_id: str, ahora_ms: int) -> dict:
    """Lee el registro de un amigo. Si no existe, devuelve uno vacío.

    Si el archivo está dañado no se sobrescribe: se lanza el error para no perder historial.
    """
    try:
        registro = json.loads(Path(ruta).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return registro_vacio(riot_id, ahora_ms)
    if (
        not isinstance(registro, dict)
        or registro.get("version") != VERSION_REGISTRO
        or not isinstance(registro.get("partidas"), dict)
    ):
        raise ValueError(f"Registro con formato inesperado: {ruta}")
    return registro


def escribir_json_atomico(ruta: Path, datos) -> None:
    """Escribe a un archivo temporal y luego lo renombra, para no dejar archivos a medias."""
    ruta = Path(ruta)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporal = tempfile.mkstemp(dir=ruta.parent, prefix=f".{ruta.name}.", suffix=".tmp")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as archivo:
            json.dump(datos, archivo, ensure_ascii=False, indent=2, sort_keys=True)
            archivo.write("\n")
        os.replace(temporal, ruta)
    except BaseException:
        Path(temporal).unlink(missing_ok=True)
        raise


def ids_nuevos(ids: Iterable[str], registro: dict) -> list[str]:
    """Ids que todavía no están en el registro (para no volver a descargarlos)."""
    guardadas = registro["partidas"]
    return [id_partida for id_partida in ids if id_partida not in guardadas]


def agregar_partidas(registro: dict, resumenes: Iterable[dict]) -> int:
    agregadas = 0
    for resumen in resumenes:
        if resumen["id"] not in registro["partidas"]:
            registro["partidas"][resumen["id"]] = resumen
            agregadas += 1
    return agregadas


def ultimas_partidas(registro: dict, cantidad: int = 10) -> list[dict]:
    partidas = sorted(registro["partidas"].values(), key=lambda p: p["fecha"], reverse=True)
    return partidas[:cantidad]


def winrate(victorias: int, derrotas: int) -> float | None:
    jugadas = victorias + derrotas
    return round(victorias * 100 / jugadas, 1) if jugadas else None


def _contador() -> dict:
    return {"partidas": 0, "victorias": 0, "derrotas": 0, "remakes": 0, "winrate": None}


def _sumar(contador: dict, resultado: str) -> None:
    contador["partidas"] += 1
    clave = {"victoria": "victorias", "derrota": "derrotas", "remake": "remakes"}[resultado]
    contador[clave] += 1


def calcular_estadisticas(partidas: Iterable[dict], mapa: MapaModos) -> dict:
    """Victorias, derrotas y winrate en total, por categoría y por modo.

    Los remakes se cuentan aparte y no afectan el winrate.
    """
    total = _contador()
    por_categoria = {categoria: _contador() for categoria in CATEGORIAS}
    por_modo: dict[str, dict] = {}

    for partida in partidas:
        modo = mapa.obtener(partida.get("queue_id"))
        if not mapa.conocido(modo.queue_id):
            # Todos los modos desconocidos se agrupan en una sola fila "Modo especial".
            modo = mapa.obtener(None)
        clave_modo = str(modo.queue_id)
        if clave_modo not in por_modo:
            por_modo[clave_modo] = {
                "queue_id": modo.queue_id,
                "nombre": modo.nombre,
                "categoria": modo.categoria,
                **_contador(),
            }
        for contador in (total, por_categoria[modo.categoria], por_modo[clave_modo]):
            _sumar(contador, partida["resultado"])

    for contador in (total, *por_categoria.values(), *por_modo.values()):
        contador["winrate"] = winrate(contador["victorias"], contador["derrotas"])

    return {
        "total": total,
        "por_categoria": por_categoria,
        "por_modo": sorted(por_modo.values(), key=lambda m: (-m["partidas"], m["nombre"])),
    }
