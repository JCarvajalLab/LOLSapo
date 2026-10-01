"""Orquesta una ejecución: consulta a Riot, actualiza los registros y genera lol.json."""

import json
import logging
import time
from datetime import UTC, datetime
from pathlib import Path

from .config import Amigo
from .modos import MapaModos
from .ranking import calcular_ranking
from .registro import (
    agregar_partidas,
    calcular_estadisticas,
    escribir_json_atomico,
    ids_nuevos,
    leer_registro,
    ultimas_partidas,
)
from .riot_api import ClienteRiot, ErrorAutenticacion, ErrorRiot, PeticionInvalida
from .validacion import (
    DatoInvalido,
    resumir_partida,
    validar_cuenta,
    validar_invocador,
    validar_ligas,
    validar_partida_activa,
)

VERSION_SALIDA = 1
PARTIDAS_VISIBLES = 10

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
    for id_partida in ids_nuevos(cliente.ids_partidas(puuid, cantidad), registro):
        try:
            resumenes.append(resumir_partida(cliente.partida(id_partida), puuid))
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
    registro = leer_registro(ruta_registro, amigo.riot_id, ahora_ms)
    estado, mensaje_error, jugando = "ok", None, None

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
    except (ErrorRiot, DatoInvalido) as error:
        estado, mensaje_error = "error", "No se pudieron actualizar los datos de este jugador."
        log.error("%s: %s", amigo.riot_id, error)

    escribir_json_atomico(ruta_registro, registro)

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
        "estado": estado,
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
) -> dict:
    ahora = ahora or datetime.now(UTC)
    ahora_ms = int(ahora.timestamp() * 1000)
    inicio = time.monotonic()

    entradas = [
        procesar_amigo(cliente, amigo, mapa, Path(dir_datos) / "registro", cantidad, ahora_ms)
        for amigo in amigos
    ]
    salida = {
        "version": VERSION_SALIDA,
        "actualizado": ahora.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "amigos": entradas,
        "ranking": calcular_ranking(entradas),
    }

    # Última barrera: la key nunca debe terminar en un archivo que lee la web.
    if api_key and api_key in json.dumps(salida, ensure_ascii=False):
        raise SecretoEnSalida("La API key apareció en los datos de salida; no se escribió nada.")

    escribir_json_atomico(ruta_salida, salida)
    log.info("lol.json generado en %.1f s: %s", time.monotonic() - inicio, ruta_salida)
    return salida
