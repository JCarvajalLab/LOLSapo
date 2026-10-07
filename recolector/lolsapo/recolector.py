"""Orquesta una ejecución: consulta a Riot, actualiza los registros y genera lol.json."""

import hashlib
import json
import logging
import re
import time
from datetime import UTC, datetime
from pathlib import Path

from . import ddragon as datos_ddragon
from .config import Amigo
from .destacados import calcular_destacados
from .modos import MapaModos
from .ranking import calcular_ranking
from .registro import (
    agregar_partidas,
    anonimizar_participantes,
    anonimizar_partidas,
    calcular_estadisticas,
    escribir_json_atomico,
    ids_nuevos,
    leer_registro,
    registro_vacio,
    ultimas_partidas,
    winrate,
)
from .riot_api import ClienteRiot, ErrorAutenticacion, ErrorRiot, NoEncontrado
from .sinergia import calcular_sinergia
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
from .validacion_tft import es_partida_tft

VERSION_SALIDA = 1
# Carga de una sola vez hacia atrás: las partidas de los últimos 30 días que no estén en el
# registro (que empezó con las últimas 20 de cada uno). Se hace de a poco en cada ejecución y,
# al terminar, se marca en el registro para no repetirla.
DIAS_RELLENO = 30
LOTE_RELLENO = 15  # partidas antiguas por amigo y por ejecución
MAX_PAGINAS_RELLENO = 5  # hasta 500 ids en 30 días por amigo
PARTIDAS_VISIBLES = 10
MENSAJE_ERROR = "No se pudieron actualizar los datos de este jugador."

log = logging.getLogger(__name__)


class SecretoEnSalida(Exception):
    """La API key o un PUUID apareció en el JSON de salida: no se escribe nada."""


def _resolver_puuid(cliente: ClienteRiot, amigo: Amigo) -> str:
    return validar_cuenta(cliente.cuenta_por_riot_id(amigo.nombre, amigo.tag))["puuid"]


def _resumir_nuevas(
    cliente: ClienteRiot,
    puuid: str,
    ids: list[str],
    slug_por_puuid: dict,
    *,
    tolerante: bool = False,
) -> list[dict]:
    """Descarga y resume las partidas `ids`.

    Con `tolerante` (carga hacia atrás), una partida que Riot ya no tiene (404) solo se omite.
    Los errores pasajeros (429, 5xx, red) se propagan siempre: la carga queda pospuesta para la
    próxima ejecución en vez de darse por terminada.
    """
    resumenes = []
    for id_partida in ids:
        try:
            resumen = resumir_partida(cliente.partida(id_partida), puuid, id_partida)
        except DatoInvalido as error:
            # Se omite; como no queda guardada, se reintenta en la próxima ejecución.
            log.warning("Partida %s omitida: %s", id_partida, error)
            continue
        except NoEncontrado:
            if not tolerante:
                raise
            log.warning("Partida antigua %s omitida (Riot ya no la tiene)", id_partida)
            continue
        resumen["participantes"] = anonimizar_participantes(
            resumen["participantes"], slug_por_puuid
        )
        resumenes.append(resumen)
    return resumenes


def _rellenar(
    cliente: ClienteRiot,
    puuid: str,
    registro: dict,
    ya_pedidas: set[str],
    slug_por_puuid: dict,
    ahora_ms: int,
) -> tuple[list[dict], bool]:
    """Un lote de partidas de los últimos 30 días que faltan. Devuelve (resúmenes, terminó)."""
    desde_s = (ahora_ms // 1000) - DIAS_RELLENO * 24 * 60 * 60
    ids: list[str] = []
    for pagina in range(MAX_PAGINAS_RELLENO):
        lote = validar_ids_partidas(
            cliente.ids_partidas(puuid, 100, inicio=pagina * 100, desde_s=desde_s)
        )
        ids += lote
        if len(lote) < 100:
            break
    faltan = [i for i in ids_nuevos(ids, registro) if i not in ya_pedidas]
    lote = faltan[:LOTE_RELLENO]
    resumenes = _resumir_nuevas(cliente, puuid, lote, slug_por_puuid, tolerante=True)
    if lote and not resumenes:
        # Ninguna del lote se pudo guardar: se da por terminada para no reintentar siempre.
        log.warning("Carga de 30 días terminada sin poder guardar %d partidas", len(lote))
        return [], True
    return resumenes, len(faltan) <= LOTE_RELLENO


def _consultar(
    cliente: ClienteRiot,
    puuid: str,
    registro: dict,
    cantidad: int,
    slug_por_puuid: dict,
    ahora_ms: int = 0,
) -> dict:
    perfil = validar_invocador(cliente.invocador(puuid))
    rangos = validar_ligas(cliente.ligas(puuid))

    activa = cliente.partida_activa(puuid)
    if es_partida_tft(activa):
        activa = None  # las partidas de TFT se muestran en tft.json
    jugando = validar_partida_activa(activa, puuid) if activa is not None else None

    ids = validar_ids_partidas(cliente.ids_partidas(puuid, cantidad))
    nuevas = ids_nuevos(ids, registro)
    resumenes = _resumir_nuevas(cliente, puuid, nuevas, slug_por_puuid)
    relleno_completo = bool(registro.get("relleno_30_dias"))
    if not relleno_completo and ahora_ms:
        # La carga hacia atrás nunca debe tumbar la actualización normal del amigo.
        try:
            antiguas, relleno_completo = _rellenar(
                cliente, puuid, registro, set(nuevas), slug_por_puuid, ahora_ms
            )
            resumenes += antiguas
        except ErrorAutenticacion:
            raise
        except (ErrorRiot, DatoInvalido) as error:
            log.warning("Carga de 30 días pospuesta (%s)", type(error).__name__)
    return {
        "perfil": perfil,
        "rangos": rangos,
        "jugando": jugando,
        "resumenes": resumenes,
        "relleno_completo": relleno_completo,
    }


def _resolver_puuids(cliente: ClienteRiot, amigos: list[Amigo]) -> dict[str, str | None]:
    """PUUID de cada amigo por slug (solo en memoria: no se guarda en ningún archivo).

    Si un Riot ID no se puede resolver, ese amigo queda en None y se marca con error.
    """
    puuids: dict[str, str | None] = {}
    for amigo in amigos:
        try:
            puuids[amigo.slug] = _resolver_puuid(cliente, amigo)
        except ErrorAutenticacion:
            raise
        except (ErrorRiot, DatoInvalido) as error:
            log.error("%s: no se pudo obtener su PUUID (%s)", amigo.riot_id, error)
            puuids[amigo.slug] = None
    return puuids


def procesar_amigo(
    cliente: ClienteRiot,
    amigo: Amigo,
    puuid: str | None,
    slug_por_puuid: dict,
    mapa: MapaModos,
    dir_registro: Path,
    cantidad: int,
    ahora_ms: int,
) -> tuple[dict, dict | None]:
    """Actualiza el registro de un amigo. Devuelve (entrada para lol.json, partida activa).

    El registro se guarda sin PUUID: los participantes de cada partida quedan marcados con el
    slug del amigo o como desconocidos.

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
        return _entrada(amigo, mapa, vacio, None, MENSAJE_ERROR), None
    anonimizar_partidas(registro, slug_por_puuid)
    mensaje_error, jugando = None, None

    try:
        if puuid is None:
            raise ErrorRiot("no se conoce su PUUID")
        datos = _consultar(cliente, puuid, registro, cantidad, slug_por_puuid, ahora_ms)
        registro["perfil"] = datos["perfil"]
        registro["rangos"] = datos["rangos"]
        jugando = datos["jugando"]
        nuevas = agregar_partidas(registro, datos["resumenes"])
        if datos["relleno_completo"]:
            registro["relleno_30_dias"] = True
        log.info("%s: %d partidas nuevas", amigo.riot_id, nuevas)
    except ErrorAutenticacion:
        raise
    except (ErrorRiot, DatoInvalido, TypeError, KeyError, AttributeError) as error:
        # TypeError/KeyError/AttributeError: respuesta de Riot con una forma no prevista.
        mensaje_error = MENSAJE_ERROR
        log.error("%s: %s (%s)", amigo.riot_id, error, type(error).__name__)

    # Barrera: el registro se publica en la rama de datos, así que nunca debe llevar PUUID.
    texto = json.dumps(registro, ensure_ascii=False)
    if '"puuid"' in texto or any(p in texto for p in (*slug_por_puuid, puuid) if p):
        raise SecretoEnSalida(f"Un PUUID apareció en el registro de {amigo.riot_id}; no se guardó.")
    escribir_json_atomico(ruta_registro, registro)
    return _entrada(amigo, mapa, registro, jugando, mensaje_error), jugando


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


_PATRON_HUELLA = re.compile(r"[0-9a-f]{32}")
_PATRON_HUELLA_CAMPEON = re.compile(r"[0-9a-f]{32}:[0-9]{1,6}")


def _huella(puuid: str) -> str:
    """Identificador irreversible de un PUUID para el caché (que se publica en la rama de datos)."""
    return hashlib.sha256(puuid.encode()).hexdigest()[:32]


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
        # Las claves tienen que ser huellas (nunca PUUID crudos de cachés antiguos).
        cache[clave] = {
            "rangos": {
                huella: rango
                for huella, rango in valor["rangos"].items()
                if _PATRON_HUELLA.fullmatch(huella) and _rango_guardado_valido(rango)
            },
            "maestrias": {
                c: m
                for c, m in valor["maestrias"].items()
                if _PATRON_HUELLA_CAMPEON.fullmatch(c) and _maestria_guardada_valida(m)
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

            huella = _huella(puuid)
            if puuid not in rangos:
                if huella in guardado["rangos"]:
                    rangos[puuid] = guardado["rangos"][huella]
                else:
                    try:
                        ligas = validar_ligas(cliente.ligas(puuid))
                        rangos[puuid] = guardado["rangos"][huella] = ligas["solo"] or ligas["flex"]
                    except ErrorAutenticacion:
                        raise
                    except (ErrorRiot, DatoInvalido) as error:
                        log.warning("Rango de un jugador en vivo no disponible: %s", error)
                        rangos[puuid] = None

            clave = f"{huella}:{campeon}"
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


def _partidas_registradas(dir_registro: Path, amigo: Amigo, ahora_ms: int) -> list[dict]:
    """Partidas del registro (ya guardado en esta ejecución). Si no se puede leer, ninguna."""
    try:
        registro = leer_registro(Path(dir_registro) / f"{amigo.slug}.json", amigo.riot_id, ahora_ms)
    except (OSError, ValueError):
        return []
    return list(registro["partidas"].values())


def _elementos_usados(
    entradas: list[dict], en_vivo: list[dict], destacados: dict | None = None
) -> dict[str, set[int]]:
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
    for clave in (
        "mejor_jugador_hoy",
        "peor_jugador_hoy",
        "mejor_jugador_semana",
        "peor_jugador_semana",
        "mejor_jugador_mes",
        "peor_jugador_mes",
    ):
        destacada = (destacados or {}).get(clave)
        if destacada:
            usados["campeones"].add(destacada["campeon_id"])
    # Los campeones de los rankings de las tarjetas (ventana al hacer clic).
    for grupo in ("tops", "tops_global"):
        for entradas in ((destacados or {}).get(grupo) or {}).values():
            for entrada in entradas:
                if "campeon_id" in entrada:
                    usados["campeones"].add(entrada["campeon_id"])
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

    puuids = _resolver_puuids(cliente, amigos)
    slug_por_puuid = {puuid: slug for slug, puuid in puuids.items() if puuid}
    resultados = [
        procesar_amigo(
            cliente,
            amigo,
            puuids[amigo.slug],
            slug_por_puuid,
            mapa,
            Path(dir_datos) / "registro",
            cantidad,
            ahora_ms,
        )
        for amigo in amigos
    ]
    entradas = [entrada for entrada, _ in resultados]
    activas = [activa for _, activa in resultados if activa]
    # Los destacados usan el registro completo (lol.json solo lleva las últimas 10 partidas).
    # Si un registro trae algo raro, se omiten los destacados y el resto de lol.json sigue.
    registradas = {
        amigo.slug: _partidas_registradas(Path(dir_datos) / "registro", amigo, ahora_ms)
        for amigo in amigos
    }
    # Si un cálculo falla por algo raro en un registro, el otro y el resto de lol.json siguen.
    try:
        destacados = calcular_destacados(registradas, mapa, ahora_ms)
    except (TypeError, KeyError, AttributeError, ValueError) as error:
        log.error("No se pudieron calcular los destacados (%s)", type(error).__name__)
        destacados = None
    try:
        sinergia = {
            "ultimos_30_dias": calcular_sinergia(
                registradas, mapa, ahora_ms - DIAS_RELLENO * 24 * 60 * 60 * 1000
            ),
            "todo": calcular_sinergia(registradas, mapa),
        }
    except (TypeError, KeyError, AttributeError, ValueError) as error:
        log.error("No se pudo calcular la sinergia (%s)", type(error).__name__)
        sinergia = None
    rangos_amigos = {
        puuids[entrada["slug"]]: (entrada["rangos"]["solo"] or entrada["rangos"]["flex"])
        for entrada in entradas
        if puuids.get(entrada["slug"])
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
        "ddragon": datos_ddragon.para_salida(
            ddragon, _elementos_usados(entradas, en_vivo, destacados)
        ),
        "en_vivo": en_vivo,
        "destacados": destacados,
        "sinergia": sinergia,
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
