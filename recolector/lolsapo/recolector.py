"""Orquesta una ejecución: consulta a Riot, actualiza los registros y genera lol.json."""

import json
import logging
import time
from datetime import UTC, datetime
from pathlib import Path

from . import ddragon as datos_ddragon
from .config import Amigo
from .modos import MapaModos
from .ranking import calcular_ranking
from .registro import (
    agregar_partidas,
    calcular_estadisticas,
    escribir_json_atomico,
    ids_nuevos,
    leer_registro,
    registro_vacio,
    ultimas_partidas,
)
from .riot_api import ClienteRiot, ErrorAutenticacion, ErrorRiot, PeticionInvalida
from .validacion import (
    DatoInvalido,
    resumir_partida,
    validar_cuenta,
    validar_ids_partidas,
    validar_invocador,
    validar_ligas,
    validar_partida_activa,
)

VERSION_SALIDA = 1
PARTIDAS_VISIBLES = 10
MENSAJE_ERROR = "No se pudieron actualizar los datos de este jugador."

log = logging.getLogger(__name__)


class SecretoEnSalida(Exception):
    """La API key apareció en el JSON de salida: no se escribe nada."""


def _resolver_puuid(cliente: ClienteRiot, amigo: Amigo) -> str:
    return validar_cuenta(cliente.cuenta_por_riot_id(amigo.nombre, amigo.tag))["puuid"]


def _consultar(cliente: ClienteRiot, puuid: str, registro: dict, cantidad: int) -> dict:
    perfil = validar_invocador(cliente.invocador(puuid))
    rangos = validar_ligas(cliente.ligas(puuid))

    activa = cliente.partida_activa(puuid)
    jugando = validar_partida_activa(activa, puuid) if activa is not None else None

    resumenes = []
    ids = validar_ids_partidas(cliente.ids_partidas(puuid, cantidad))
    for id_partida in ids_nuevos(ids, registro):
        try:
            resumenes.append(resumir_partida(cliente.partida(id_partida), puuid, id_partida))
        except DatoInvalido as error:
            # Se omite; como no queda guardada, se reintenta en la próxima ejecución.
            log.warning("Partida %s omitida: %s", id_partida, error)
    return {"perfil": perfil, "rangos": rangos, "jugando": jugando, "resumenes": resumenes}


def procesar_amigo(
    cliente: ClienteRiot,
    amigo: Amigo,
    mapa: MapaModos,
    dir_registro: Path,
    cantidad: int,
    ahora_ms: int,
) -> dict:
    """Actualiza el registro de un amigo y devuelve su entrada para lol.json.

    Si algo falla con este amigo, se marca con estado "error" y se muestran sus últimos datos
    conocidos, sin romper al resto. Solo un error de autenticación detiene toda la ejecución.
    """
    ruta_registro = Path(dir_registro) / f"{amigo.slug}.json"
    try:
        registro = leer_registro(ruta_registro, amigo.riot_id, ahora_ms)
    except ValueError as error:
        # Registro dañado: no se toca (para no perder historial) y se marca solo a este amigo.
        log.error("%s: %s", amigo.riot_id, error)
        return _entrada(amigo, mapa, registro_vacio(amigo.riot_id, ahora_ms), None, MENSAJE_ERROR)
    mensaje_error, jugando = None, None

    try:
        puuid = registro.get("puuid") or _resolver_puuid(cliente, amigo)
        try:
            datos = _consultar(cliente, puuid, registro, cantidad)
        except PeticionInvalida:
            # PUUID guardado con otra key (cada key de Riot cifra los PUUID distinto).
            log.info("PUUID de %s no válido para esta key, se vuelve a pedir", amigo.riot_id)
            puuid = _resolver_puuid(cliente, amigo)
            datos = _consultar(cliente, puuid, registro, cantidad)
        registro["puuid"] = puuid
        registro["perfil"] = datos["perfil"]
        registro["rangos"] = datos["rangos"]
        jugando = datos["jugando"]
        nuevas = agregar_partidas(registro, datos["resumenes"])
        log.info("%s: %d partidas nuevas", amigo.riot_id, nuevas)
    except ErrorAutenticacion:
        raise
    except (ErrorRiot, DatoInvalido, TypeError, KeyError, AttributeError) as error:
        # TypeError/KeyError/AttributeError: respuesta de Riot con una forma no prevista.
        mensaje_error = MENSAJE_ERROR
        log.error("%s: %s (%s)", amigo.riot_id, error, type(error).__name__)

    escribir_json_atomico(ruta_registro, registro)
    return _entrada(amigo, mapa, registro, jugando, mensaje_error)


def _entrada(
    amigo: Amigo, mapa: MapaModos, registro: dict, jugando: dict | None, mensaje_error: str | None
) -> dict:
    """Arma la entrada de un amigo para lol.json a partir de su registro."""
    if jugando is not None:
        modo = mapa.obtener(jugando["queue_id"])
        jugando = {**jugando, "modo": modo.nombre, "categoria": modo.categoria}

    partidas = []
    for partida in ultimas_partidas(registro, PARTIDAS_VISIBLES):
        modo = mapa.obtener(partida.get("queue_id"))
        partidas.append({**partida, "modo": modo.nombre, "categoria": modo.categoria})

    return {
        "riot_id": amigo.riot_id,
        "nombre": amigo.nombre,
        "tag": amigo.tag,
        "slug": amigo.slug,
        "estado": "error" if mensaje_error else "ok",
        "error": mensaje_error,
        "seguimiento_desde": registro["seguimiento_desde"],
        "perfil": registro["perfil"],
        "rangos": registro["rangos"] or {"solo": None, "flex": None},
        "jugando": jugando,
        "estadisticas": calcular_estadisticas(registro["partidas"].values(), mapa),
        "partidas": partidas,
    }


def ejecutar(
    cliente: ClienteRiot,
    api_key: str,
    amigos: list[Amigo],
    mapa: MapaModos,
    dir_datos: Path,
    ruta_salida: Path,
    cantidad: int = 20,
    ahora: datetime | None = None,
    ddragon: dict | None = None,
) -> dict:
    ahora = ahora or datetime.now(UTC)
    ahora_ms = int(ahora.timestamp() * 1000)
    inicio = time.monotonic()

    entradas = [
        procesar_amigo(cliente, amigo, mapa, Path(dir_datos) / "registro", cantidad, ahora_ms)
        for amigo in amigos
    ]
    campeones_usados = {p["campeon_id"] for a in entradas for p in a["partidas"]} | {
        a["jugando"]["campeon_id"] for a in entradas if a["jugando"]
    }
    salida = {
        "version": VERSION_SALIDA,
        "actualizado": ahora.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "ddragon": datos_ddragon.para_salida(ddragon, campeones_usados),
        "amigos": entradas,
        "ranking": calcular_ranking(entradas),
    }

    # Última barrera: ninguna key (esta u otra) debe terminar en un archivo que lee la web.
    texto = json.dumps(salida, ensure_ascii=False)
    if (api_key and api_key in texto) or "RGAPI-" in texto.upper():
        raise SecretoEnSalida("La API key apareció en los datos de salida; no se escribió nada.")

    escribir_json_atomico(ruta_salida, salida)
    log.info("lol.json generado en %.1f s: %s", time.monotonic() - inicio, ruta_salida)
    return salida
