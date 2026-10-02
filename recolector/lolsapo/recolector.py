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
    winrate,
)
from .riot_api import ClienteRiot, ErrorAutenticacion, ErrorRiot, PeticionInvalida
from .validacion import (
    DIVISIONES,
    TIERS,
    DatoInvalido,
    resumir_partida,
    validar_cuenta,
    validar_ids_partidas,
    validar_invocador,
    validar_ligas,
    validar_maestria,
    validar_partida_activa,
)

VERSION_SALIDA = 1
PARTIDAS_VISIBLES = 10
MENSAJE_ERROR = "No se pudieron actualizar los datos de este jugador."

log = logging.getLogger(__name__)


class SecretoEnSalida(Exception):
    """La API key o un PUUID apareció en el JSON de salida: no se escribe nada."""


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
) -> tuple[dict, str | None, dict | None]:
    """Actualiza el registro de un amigo.

    Devuelve (entrada para lol.json, PUUID, partida activa). La entrada aún trae los PUUID de
    los participantes: `ejecutar` los reemplaza antes de publicar.

    Si algo falla con este amigo, se marca con estado "error" y se muestran sus últimos datos
    conocidos, sin romper al resto. Solo un error de autenticación detiene toda la ejecución.
    """
    ruta_registro = Path(dir_registro) / f"{amigo.slug}.json"
    try:
        registro = leer_registro(ruta_registro, amigo.riot_id, ahora_ms)
    except ValueError as error:
        # Registro dañado: no se toca (para no perder historial) y se marca solo a este amigo.
        log.error("%s: %s", amigo.riot_id, error)
        vacio = registro_vacio(amigo.riot_id, ahora_ms)
        return _entrada(amigo, mapa, vacio, None, MENSAJE_ERROR), None, None
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
    entrada = _entrada(amigo, mapa, registro, jugando, mensaje_error)
    return entrada, registro.get("puuid"), jugando


def _entrada(
    amigo: Amigo, mapa: MapaModos, registro: dict, jugando: dict | None, mensaje_error: str | None
) -> dict:
    """Arma la entrada de un amigo para lol.json a partir de su registro."""
    if jugando is not None:
        modo = mapa.obtener(jugando["queue_id"])
        jugando = {
            "partida_id": jugando["id"],
            "campeon_id": jugando["campeon_id"],
            "queue_id": jugando["queue_id"],
            "inicio": jugando["inicio"],
            "duracion": jugando["duracion"],
            "modo": modo.nombre,
            "categoria": modo.categoria,
        }

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


def _publicar_participantes(participantes: list[dict], slug_por_puuid: dict) -> list[dict]:
    """Quita los PUUID y marca con el slug a los jugadores que son del grupo."""
    return [
        {
            "campeon_id": p["campeon_id"],
            "equipo": p["equipo"],
            "nombre": p["nombre"],
            "amigo": slug_por_puuid.get(p["puuid"]) if p["puuid"] else None,
        }
        for p in participantes
    ]


def _entero_valido(valor) -> bool:
    return isinstance(valor, int) and not isinstance(valor, bool) and valor >= 0


def _rango_guardado_valido(rango) -> bool:
    """Un rango leído del caché tiene que tener la misma forma que uno recién validado."""
    if rango is None:
        return True
    return (
        isinstance(rango, dict)
        and rango.get("tier") in TIERS
        and rango.get("division") in (*DIVISIONES, None)
        and all(_entero_valido(rango.get(c)) for c in ("lp", "victorias", "derrotas"))
        and isinstance(rango.get("racha", False), bool)
    )


def _maestria_guardada_valida(maestria) -> bool:
    return isinstance(maestria, dict) and all(
        _entero_valido(maestria.get(c)) for c in ("nivel", "puntos")
    )


def _leer_cache_en_vivo(ruta: Path) -> dict:
    """Caché local de rango y maestría por partida en vivo: {"<gameId>": {...}}.

    Se valida todo lo que se lee: una entrada con forma inesperada se descarta (y se vuelve
    a pedir a Riot) en vez de pasar a lol.json o detener la ejecución.
    """
    try:
        datos = json.loads(Path(ruta).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    if not isinstance(datos, dict):
        return {}
    cache = {}
    for clave, valor in datos.items():
        if not (
            isinstance(valor, dict)
            and isinstance(valor.get("rangos"), dict)
            and isinstance(valor.get("maestrias"), dict)
        ):
            continue
        cache[clave] = {
            "rangos": {
                puuid: rango
                for puuid, rango in valor["rangos"].items()
                if _rango_guardado_valido(rango)
            },
            "maestrias": {
                c: m for c, m in valor["maestrias"].items() if _maestria_guardada_valida(m)
            },
        }
    return cache


def _datos_en_vivo(
    cliente: ClienteRiot, activas: list[dict], rangos_amigos: dict, cache: dict
) -> tuple[dict, dict, dict]:
    """Rango y maestría de cada jugador de las partidas en vivo.

    Ninguno de los dos cambia durante una partida, así que se guardan por gameId y en las
    pasadas siguientes no se vuelven a pedir. Devuelve (rangos por PUUID, maestrías por
    (PUUID, campeón), caché nuevo solo con las partidas que siguen en curso).

    - Rango: Solo/Dúo, o Flex si no tiene. Los de los amigos ya se consultaron.
    - Maestría: con el campeón que está jugando; si nunca lo jugó, nivel y puntos en 0.
    - Si una llamada falla, ese dato queda en None y no se guarda en el caché (se reintenta).
    - Los jugadores en modo streamer no traen PUUID: quedan sin rango ni maestría.
    """
    rangos = dict(rangos_amigos)
    maestrias: dict[tuple[str, int], dict | None] = {}
    cache_nuevo: dict[str, dict] = {}

    for activa in activas:
        guardado = cache.get(str(activa["id"])) or {"rangos": {}, "maestrias": {}}
        for jugador in activa["participantes"]:
            puuid, campeon = jugador["puuid"], jugador["campeon_id"]
            if not puuid:
                continue

            if puuid not in rangos:
                if puuid in guardado["rangos"]:
                    rangos[puuid] = guardado["rangos"][puuid]
                else:
                    try:
                        ligas = validar_ligas(cliente.ligas(puuid))
                        rangos[puuid] = guardado["rangos"][puuid] = ligas["solo"] or ligas["flex"]
                    except ErrorAutenticacion:
                        raise
                    except (ErrorRiot, DatoInvalido) as error:
                        log.warning("Rango de un jugador en vivo no disponible: %s", error)
                        rangos[puuid] = None

            clave = f"{puuid}:{campeon}"
            if clave in guardado["maestrias"]:
                maestrias[(puuid, campeon)] = guardado["maestrias"][clave]
            else:
                try:
                    datos = cliente.maestria(puuid, campeon)
                    maestria = (
                        validar_maestria(datos) if datos is not None else {"nivel": 0, "puntos": 0}
                    )
                    maestrias[(puuid, campeon)] = guardado["maestrias"][clave] = maestria
                except ErrorAutenticacion:
                    raise
                except (ErrorRiot, DatoInvalido) as error:
                    log.warning("Maestría de un jugador en vivo no disponible: %s", error)
                    maestrias[(puuid, campeon)] = None
        cache_nuevo[str(activa["id"])] = guardado
    return rangos, maestrias, cache_nuevo


def _partidas_en_vivo(
    activas: list[dict],
    mapa: MapaModos,
    slug_por_puuid: dict,
    rangos: dict,
    maestrias: dict | None = None,
) -> list[dict]:
    """Una entrada por partida en curso, aunque haya varios amigos en ella."""
    por_id: dict[int, dict] = {}
    for activa in activas:
        if activa["id"] in por_id:
            continue
        modo = mapa.obtener(activa["queue_id"])
        jugadores = [
            {
                **publico,
                "hechizos": original["hechizos"],
                "runas": original["runas"],
                "rango": _rango_en_vivo(rangos.get(original["puuid"])),
                "maestria": (maestrias or {}).get((original["puuid"], original["campeon_id"])),
            }
            for publico, original in zip(
                _publicar_participantes(activa["participantes"], slug_por_puuid),
                activa["participantes"],
                strict=True,
            )
        ]
        equipos = sorted({j["equipo"] for j in jugadores})
        por_id[activa["id"]] = {
            "id": activa["id"],
            "queue_id": activa["queue_id"],
            "modo": modo.nombre,
            "categoria": modo.categoria,
            "inicio": activa["inicio"],
            "duracion": activa["duracion"],
            "amigos": sorted({j["amigo"] for j in jugadores if j["amigo"]}),
            "equipos": [
                {
                    "equipo": e,
                    "jugadores": [j for j in jugadores if j["equipo"] == e],
                    "bloqueos": [b["campeon_id"] for b in activa["bloqueos"] if b["equipo"] == e],
                }
                for e in equipos
            ],
        }
    return list(por_id.values())


def _rango_en_vivo(rango: dict | None) -> dict | None:
    """Rango para la partida en vivo: tier, división, LP, winrate de la temporada y racha."""
    if not rango:
        return None
    return {
        "tier": rango["tier"],
        "division": rango["division"],
        "lp": rango["lp"],
        "victorias": rango["victorias"],
        "derrotas": rango["derrotas"],
        "winrate": winrate(rango["victorias"], rango["derrotas"]),
        # Rangos guardados antes de agregar la racha no traen el campo.
        "racha": rango.get("racha", False),
    }


def _elementos_usados(entradas: list[dict], en_vivo: list[dict]) -> dict[str, set[int]]:
    usados: dict[str, set[int]] = {
        "campeones": set(),
        "hechizos": set(),
        "items": set(),
        "runas": set(),
    }
    for entrada in entradas:
        if entrada["jugando"] and entrada["jugando"]["campeon_id"] is not None:
            usados["campeones"].add(entrada["jugando"]["campeon_id"])
        for partida in entrada["partidas"]:
            usados["campeones"].add(partida["campeon_id"])
            usados["campeones"].update(p["campeon_id"] for p in partida.get("participantes", []))
            usados["hechizos"].update(h for h in partida.get("hechizos", []) if h)
            usados["items"].update(i for i in partida.get("items", []) if i)
            runas = partida.get("runas") or {}
            usados["runas"].update(r for r in runas.values() if r)
    for partida in en_vivo:
        for equipo in partida["equipos"]:
            usados["campeones"].update(equipo["bloqueos"])
            for jugador in equipo["jugadores"]:
                usados["campeones"].add(jugador["campeon_id"])
                usados["hechizos"].update(h for h in jugador["hechizos"] if h)
                usados["runas"].update(r for r in jugador["runas"].values() if r)
    return usados


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

    resultados = [
        procesar_amigo(cliente, amigo, mapa, Path(dir_datos) / "registro", cantidad, ahora_ms)
        for amigo in amigos
    ]
    slug_por_puuid = {puuid: entrada["slug"] for entrada, puuid, _ in resultados if puuid}
    entradas = [entrada for entrada, _, _ in resultados]
    for entrada in entradas:
        for partida in entrada["partidas"]:
            if "participantes" in partida:
                partida["participantes"] = _publicar_participantes(
                    partida["participantes"], slug_por_puuid
                )
    activas = [activa for _, _, activa in resultados if activa]
    rangos_amigos = {
        puuid: (entrada["rangos"]["solo"] or entrada["rangos"]["flex"])
        for entrada, puuid, _ in resultados
        if puuid
    }
    ruta_cache = Path(dir_datos) / "en_vivo_cache.json"
    rangos, maestrias, cache_en_vivo = _datos_en_vivo(
        cliente, activas, rangos_amigos, _leer_cache_en_vivo(ruta_cache)
    )
    escribir_json_atomico(ruta_cache, cache_en_vivo)
    en_vivo = _partidas_en_vivo(activas, mapa, slug_por_puuid, rangos, maestrias)

    salida = {
        "version": VERSION_SALIDA,
        "actualizado": ahora.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "ddragon": datos_ddragon.para_salida(ddragon, _elementos_usados(entradas, en_vivo)),
        "en_vivo": en_vivo,
        "amigos": entradas,
        "ranking": calcular_ranking(entradas),
    }

    # Última barrera: ninguna key (esta u otra) debe terminar en un archivo que lee la web.
    texto = json.dumps(salida, ensure_ascii=False)
    if (api_key and api_key in texto) or "RGAPI-" in texto.upper():
        raise SecretoEnSalida("La API key apareció en los datos de salida; no se escribió nada.")
    # Los PUUID solo viven en el registro local: la web identifica a los amigos por su slug.
    puuids = set(slug_por_puuid) | {
        j["puuid"] for activa in activas for j in activa["participantes"] if j["puuid"]
    }
    if any(puuid in texto for puuid in puuids):
        raise SecretoEnSalida("Un PUUID apareció en los datos de salida; no se escribió nada.")

    escribir_json_atomico(ruta_salida, salida)
    log.info("lol.json generado en %.1f s: %s", time.monotonic() - inicio, ruta_salida)
    return salida
