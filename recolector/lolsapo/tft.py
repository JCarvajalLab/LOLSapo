"""Orquesta la parte de TFT: consulta a Riot, actualiza los registros y genera tft.json.

Funciona igual que la de LoL (registro acumulado sin PUUID, barreras antes de escribir) con
dos diferencias:
- Si la key no tiene acceso a TFT, no se detiene la ejecución: tft.json se genera con los
  últimos datos conocidos y un aviso, y lol.json no se ve afectado.
- "Jugando ahora" usa spectator-tft; si la key no tiene acceso, prueba con el spectator de LoL
  (que también muestra partidas de TFT). Si ninguno responde, la web avisa que no está disponible.
"""

import json
import logging
import time
from datetime import UTC, datetime
from pathlib import Path

from . import ddragon_tft
from .config import Amigo
from .modos import MapaModos
from .ranking import valor_rango
from .recolector import MENSAJE_ERROR, SecretoEnSalida, _resolver_puuids
from .registro import (
    agregar_partidas,
    anonimizar_participantes,
    anonimizar_partidas,
    escribir_json_atomico,
    ids_nuevos,
    leer_registro,
    registro_vacio,
    ultimas_partidas,
)
from .riot_api import ClienteRiot, ErrorAutenticacion, ErrorRiot
from .validacion import DatoInvalido, validar_ids_partidas, validar_invocador
from .validacion_tft import (
    es_partida_tft,
    resumir_partida_tft,
    validar_ligas_tft,
    validar_partida_activa_tft,
)

VERSION_SALIDA_TFT = 1
PARTIDAS_VISIBLES = 10
# Grilla de posiciones: los últimos 30 puestos. Por eso TFT revisa siempre al menos 30 partidas
# recientes (solo se descargan las que faltan en el registro).
PUESTOS_HISTORIAL = 30
DIR_REGISTRO_TFT = "registro_tft"
MENSAJE_SIN_ACCESO = (
    "No se pudieron consultar los datos de TFT: la key no tiene acceso o caducó. "
    "Se muestran los últimos datos conocidos."
)
RANGOS_VACIOS = {"ranked": None, "doble": None, "turbo": None}

log = logging.getLogger(__name__)


class Espectador:
    """Consulta "jugando ahora" con la primera fuente que la key permita usar.

    Orden: spectator-tft y, si responde 401/403, el spectator de LoL. La decisión se toma con el
    primer amigo y se mantiene durante toda la ejecución (para no repetir llamadas fallidas).
    """

    def __init__(self, cliente: ClienteRiot):
        self._cliente = cliente
        self.fuente: str | None = "tft"

    @property
    def disponible(self) -> bool:
        return self.fuente is not None

    def consultar(self, puuid: str) -> dict | None:
        while self.fuente:
            try:
                if self.fuente == "tft":
                    datos = self._cliente.partida_activa_tft(puuid)
                else:
                    datos = self._cliente.partida_activa(puuid)
                    if datos is not None and not es_partida_tft(datos):
                        return None  # está en una partida de LoL
                return validar_partida_activa_tft(datos) if datos is not None else None
            except ErrorAutenticacion:
                log.info("La key no tiene acceso al spectator de %s", self.fuente.upper())
                self.fuente = "lol" if self.fuente == "tft" else None
            except (ErrorRiot, DatoInvalido) as error:
                log.warning("Partida en vivo de TFT no disponible: %s", error)
                return None
        return None


def _consultar(
    cliente: ClienteRiot,
    puuid: str,
    registro: dict,
    cantidad: int,
    slug_por_puuid: dict,
    espectador: Espectador,
) -> dict:
    perfil = validar_invocador(cliente.invocador_tft(puuid))
    rangos = validar_ligas_tft(cliente.ligas_tft(puuid))
    resumenes = []
    ids = validar_ids_partidas(cliente.ids_partidas_tft(puuid, max(cantidad, PUESTOS_HISTORIAL)))
    for id_partida in ids_nuevos(ids, registro):
        try:
            resumen = resumir_partida_tft(cliente.partida_tft(id_partida), puuid, id_partida)
        except DatoInvalido as error:
            log.warning("Partida de TFT %s omitida: %s", id_partida, error)
            continue
        resumen["participantes"] = anonimizar_participantes(
            resumen["participantes"], slug_por_puuid
        )
        resumenes.append(resumen)
    jugando = espectador.consultar(puuid)
    return {"perfil": perfil, "rangos": rangos, "jugando": jugando, "resumenes": resumenes}


def procesar_amigo_tft(
    cliente: ClienteRiot,
    amigo: Amigo,
    puuid: str | None,
    slug_por_puuid: dict,
    mapa: MapaModos,
    dir_registro: Path,
    cantidad: int,
    ahora_ms: int,
    espectador: Espectador,
) -> tuple[dict, dict | None]:
    """Actualiza el registro de TFT de un amigo. Devuelve (entrada para tft.json, partida activa).

    Un error de autenticación se propaga (lo maneja `ejecutar_tft`); cualquier otro solo marca
    a este amigo con error y muestra sus últimos datos conocidos.
    """
    ruta_registro = Path(dir_registro) / f"{amigo.slug}.json"
    try:
        registro = leer_registro(ruta_registro, amigo.riot_id, ahora_ms)
    except ValueError as error:
        log.error("%s (TFT): %s", amigo.riot_id, error)
        return _entrada(amigo, mapa, registro_vacio(amigo.riot_id, ahora_ms), None, True), None
    anonimizar_partidas(registro, slug_por_puuid)
    con_error, jugando = False, None

    try:
        if puuid is None:
            raise ErrorRiot("no se conoce su PUUID")
        datos = _consultar(cliente, puuid, registro, cantidad, slug_por_puuid, espectador)
        registro["perfil"] = datos["perfil"]
        registro["rangos"] = datos["rangos"]
        jugando = datos["jugando"]
        nuevas = agregar_partidas(registro, datos["resumenes"])
        log.info("%s (TFT): %d partidas nuevas", amigo.riot_id, nuevas)
    except ErrorAutenticacion:
        raise
    except (ErrorRiot, DatoInvalido, TypeError, KeyError, AttributeError) as error:
        con_error = True
        log.error("%s (TFT): %s (%s)", amigo.riot_id, error, type(error).__name__)

    # Barrera: el registro se publica en la rama de datos, así que nunca debe llevar PUUID.
    texto = json.dumps(registro, ensure_ascii=False)
    if '"puuid"' in texto or any(p in texto for p in (*slug_por_puuid, puuid) if p):
        raise SecretoEnSalida(
            f"Un PUUID apareció en el registro de TFT de {amigo.riot_id}; no se guardó."
        )
    escribir_json_atomico(ruta_registro, registro)
    return _entrada(amigo, mapa, registro, jugando, con_error), jugando


def _entrada(
    amigo: Amigo, mapa: MapaModos, registro: dict, jugando: dict | None, con_error: bool
) -> dict:
    if jugando is not None:
        modo = mapa.obtener(jugando["queue_id"])
        jugando = {
            "partida_id": jugando["id"],
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
        "estado": "error" if con_error else "ok",
        "error": MENSAJE_ERROR if con_error else None,
        "seguimiento_desde": registro["seguimiento_desde"],
        "perfil": registro.get("perfil"),
        "rangos": registro["rangos"] or dict(RANGOS_VACIOS),
        "jugando": jugando,
        "estadisticas": calcular_estadisticas_tft(registro["partidas"].values(), mapa),
        "partidas": partidas,
        # Del más reciente al más antiguo.
        "historial": [
            {"puesto": p["puesto"], "modo": modo.nombre, "categoria": modo.categoria}
            for p in ultimas_partidas(registro, PUESTOS_HISTORIAL)
            for modo in (mapa.obtener(p.get("queue_id")),)
        ],
    }


def _contador() -> dict:
    return {"partidas": 0, "primeros": 0, "top4": 0, "top4_pct": None, "promedio": None, "_suma": 0}


def _cerrar(contador: dict) -> dict:
    suma = contador.pop("_suma")
    if contador["partidas"]:
        contador["top4_pct"] = round(contador["top4"] * 100 / contador["partidas"], 1)
        contador["promedio"] = round(suma / contador["partidas"], 2)
    return contador


def calcular_estadisticas_tft(partidas, mapa: MapaModos) -> dict:
    """Partidas, primeros lugares, top 4 (y su %) y puesto promedio, en total y por modo."""
    total = _contador()
    por_modo: dict[str, dict] = {}
    for partida in partidas:
        modo = mapa.obtener(partida.get("queue_id"))
        if not mapa.conocido(modo.queue_id):
            modo = mapa.obtener(None)
        clave = str(modo.queue_id)
        if clave not in por_modo:
            por_modo[clave] = {
                "queue_id": modo.queue_id,
                "nombre": modo.nombre,
                "categoria": modo.categoria,
                **_contador(),
            }
        for contador in (total, por_modo[clave]):
            contador["partidas"] += 1
            contador["primeros"] += partida["puesto"] == 1
            contador["top4"] += partida["puesto"] <= 4
            contador["_suma"] += partida["puesto"]
    return {
        "total": _cerrar(total),
        "por_modo": sorted(
            (_cerrar(m) for m in por_modo.values()), key=lambda m: (-m["partidas"], m["nombre"])
        ),
    }


def calcular_ranking_tft(amigos: list[dict]) -> list[dict]:
    """Primero quienes tienen rango en Ranked TFT; el resto por % de top 4 y luego partidas."""

    def clave(amigo: dict):
        ranked = valor_rango((amigo.get("rangos") or {}).get("ranked"))
        total = (amigo.get("estadisticas") or {}).get("total") or {}
        if ranked is not None:
            return (0, tuple(-x for x in ranked), 0, 0, amigo["riot_id"].casefold())
        top4 = total.get("top4_pct")
        return (
            1,
            (),
            -(top4 if top4 is not None else -1),
            -total.get("partidas", 0),
            amigo["riot_id"].casefold(),
        )

    return [
        {
            "posicion": posicion,
            "slug": amigo["slug"],
            "riot_id": amigo["riot_id"],
            "criterio": "rango" if clave(amigo)[0] == 0 else "top4",
        }
        for posicion, amigo in enumerate(sorted(amigos, key=clave), start=1)
    ]


def _partidas_en_vivo(activas: list[dict], mapa: MapaModos, slug_por_puuid: dict) -> list[dict]:
    """Una entrada por partida en curso, aunque haya varios amigos en ella."""
    por_id: dict[int, dict] = {}
    for activa in activas:
        if activa["id"] in por_id:
            continue
        modo = mapa.obtener(activa["queue_id"])
        jugadores = [
            {"nombre": j["nombre"], "amigo": slug_por_puuid.get(j["puuid"]) if j["puuid"] else None}
            for j in activa["participantes"]
        ]
        por_id[activa["id"]] = {
            "id": activa["id"],
            "queue_id": activa["queue_id"],
            "modo": modo.nombre,
            "categoria": modo.categoria,
            "inicio": activa["inicio"],
            "duracion": activa["duracion"],
            "amigos": sorted({j["amigo"] for j in jugadores if j["amigo"]}),
            "jugadores": jugadores,
        }
    return list(por_id.values())


def _elementos_usados(entradas: list[dict]) -> dict[str, set[str]]:
    usados: dict[str, set[str]] = {"campeones": set(), "rasgos": set(), "items": set()}
    for entrada in entradas:
        for partida in entrada["partidas"]:
            for unidad in partida.get("unidades", []):
                usados["campeones"].add(unidad["id"])
                usados["items"].update(unidad["items"])
            usados["rasgos"].update(r["id"] for r in partida.get("rasgos", []))
    return usados


def ejecutar_tft(
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
    dir_registro = Path(dir_datos) / DIR_REGISTRO_TFT
    sin_acceso = False

    try:
        puuids = _resolver_puuids(cliente, amigos)
    except ErrorAutenticacion as error:
        log.error("TFT: %s", error)
        sin_acceso, puuids = True, {amigo.slug: None for amigo in amigos}
    slug_por_puuid = {puuid: slug for slug, puuid in puuids.items() if puuid}
    espectador = Espectador(cliente)

    resultados = []
    for amigo in amigos:
        argumentos = (slug_por_puuid, mapa, dir_registro, cantidad, ahora_ms, espectador)
        try:
            puuid = None if sin_acceso else puuids[amigo.slug]
            resultados.append(procesar_amigo_tft(cliente, amigo, puuid, *argumentos))
        except ErrorAutenticacion as error:
            # La key dejó de servir a mitad de camino: el resto queda con sus últimos datos.
            log.error("TFT: %s", error)
            sin_acceso = True
            resultados.append(procesar_amigo_tft(cliente, amigo, None, *argumentos))

    entradas = [entrada for entrada, _ in resultados]
    activas = [activa for _, activa in resultados if activa]
    salida = {
        "version": VERSION_SALIDA_TFT,
        "actualizado": ahora.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "error": MENSAJE_SIN_ACCESO if sin_acceso else None,
        "en_vivo_disponible": espectador.disponible and not sin_acceso,
        "ddragon": ddragon_tft.para_salida(ddragon, _elementos_usados(entradas)),
        "en_vivo": _partidas_en_vivo(activas, mapa, slug_por_puuid),
        "amigos": entradas,
        "ranking": calcular_ranking_tft(entradas),
    }

    # Mismas barreras que lol.json: ninguna key ni PUUID en un archivo que lee la web.
    texto = json.dumps(salida, ensure_ascii=False)
    if (api_key and api_key in texto) or "RGAPI-" in texto.upper():
        raise SecretoEnSalida("La API key apareció en tft.json; no se escribió nada.")
    puuids_vistos = set(slug_por_puuid) | {
        j["puuid"] for activa in activas for j in activa["participantes"] if j["puuid"]
    }
    if '"puuid"' in texto or any(p in texto for p in puuids_vistos):
        raise SecretoEnSalida("Un PUUID apareció en tft.json; no se escribió nada.")

    escribir_json_atomico(ruta_salida, salida)
    log.info("tft.json generado en %.1f s: %s", time.monotonic() - inicio, ruta_salida)
    return salida
