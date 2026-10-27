"""Descarga histórica de partidas del 2026 para LoL y TFT.

Guarda progresivamente en datos/registro/ y datos/registro_tft/ respetando
el rate limit de Riot Games, y luego recompila lol.json y tft.json.
"""

import argparse
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Agregar recolector al sys.path
RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "recolector"))

from lolsapo.config import (
    DIR_DATOS,
    RUTA_AMIGOS,
    RUTA_MODOS,
    RUTA_MODOS_TFT,
    RUTA_SALIDA,
    RUTA_SALIDA_TFT,
    cargar_amigos,
    cargar_api_key,
    cargar_api_key_tft,
)
from lolsapo.modos import MapaModos
from lolsapo.recolector import (
    _curva_oro,
    ejecutar,
)
from lolsapo.registro import (
    agregar_partidas,
    anonimizar_participantes,
    anonimizar_partidas,
    escribir_json_atomico,
    leer_registro,
)
from lolsapo.riot_api import (
    URL_REGION,
    ClienteRiot,
    NoEncontrado,
    _segmento,
)
from lolsapo.tft import ejecutar_tft
from lolsapo.validacion import DatoInvalido, resumir_partida
from lolsapo.validacion_tft import resumir_partida_tft

INICIO_2026_S = int(datetime(2026, 1, 1, tzinfo=timezone.utc).timestamp())

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("sincronizar_2026")


def sincronizar_tft(
    cliente: ClienteRiot, amigos: list, limite_por_amigo: int | None = None
) -> None:
    log.info("=== INICIANDO DESCARGA HISTÓRICA DE TFT (2026) ===")
    ahora_ms = int(time.time() * 1000)
    dir_reg = DIR_DATOS / "registro_tft"
    dir_reg.mkdir(parents=True, exist_ok=True)

    # Mapeo universal de PUUIDs de amigos para anonimizar
    slug_por_puuid = {}
    puuid_por_amigo = {}
    for a in amigos:
        try:
            cuenta = cliente.cuenta_por_riot_id(a.nombre, a.tag)
            p = cuenta["puuid"]
            slug_por_puuid[p] = a.slug
            puuid_por_amigo[a.slug] = p
        except Exception as e:  # noqa: BLE001
            log.warning("No se pudo obtener cuenta de TFT para %s: %s", a.riot_id, e)

    for amigo in amigos:
        puuid = puuid_por_amigo.get(amigo.slug)
        if not puuid:
            continue

        ruta_reg = dir_reg / f"{amigo.slug}.json"
        registro = leer_registro(ruta_reg, amigo.riot_id, ahora_ms)
        guardadas = set(registro.get("partidas", {}).keys())

        # Buscar IDs de partidas desde el 1 de enero de 2026
        ids_2026 = []
        inicio = 0
        while True:
            try:
                lote = cliente._get(
                    f"{URL_REGION}/tft/match/v1/matches/by-puuid/{_segmento(puuid)}/ids",
                    params={"startTime": INICIO_2026_S, "start": inicio, "count": 100},
                )
            except Exception as e:  # noqa: BLE001
                log.error("Error al pedir IDs de TFT para %s: %s", amigo.riot_id, e)
                break
            if not lote:
                break
            ids_2026.extend(lote)
            if len(lote) < 100:
                break
            inicio += 100

        faltan = [i for i in ids_2026 if i not in guardadas]
        if limite_por_amigo:
            faltan = faltan[:limite_por_amigo]

        log.info(
            "[%s] TFT: %d partidas en 2026, %d ya guardadas. Descargando %d faltantes...",
            amigo.riot_id,
            len(ids_2026),
            len(guardadas),
            len(faltan),
        )

        descargadas = 0
        resumenes_lote = []
        for i, id_partida in enumerate(faltan, 1):
            try:
                raw = cliente.partida_tft(id_partida)
                resumen = resumir_partida_tft(raw, puuid, id_partida)
                resumen["participantes"] = anonimizar_participantes(
                    resumen["participantes"], slug_por_puuid
                )
                resumenes_lote.append(resumen)
                descargadas += 1
            except DatoInvalido as e:
                log.warning("Partida %s inválida: %s", id_partida, e)
            except NoEncontrado:
                log.warning("Partida %s ya no existe en Riot", id_partida)
            except Exception as e:  # noqa: BLE001
                log.error("Error en partida %s: %s", id_partida, e)

            # Guardar en disco cada 10 partidas para no perder progreso
            if len(resumenes_lote) >= 10 or i == len(faltan):
                agregar_partidas(registro, resumenes_lote)
                anonimizar_partidas(registro, slug_por_puuid)
                escribir_json_atomico(ruta_reg, registro)
                resumenes_lote = []
                log.info(
                    "[%s] Progreso TFT: %d/%d descargadas",
                    amigo.riot_id,
                    i,
                    len(faltan),
                )

    log.info("=== DESCARGA DE TFT COMPLETADA CON ÉXITO ===")


def sincronizar_lol(
    cliente: ClienteRiot, amigos: list, limite_por_amigo: int | None = None
) -> None:
    log.info("=== INICIANDO DESCARGA HISTÓRICA DE LOL (2026) ===")
    ahora_ms = int(time.time() * 1000)
    dir_reg = DIR_DATOS / "registro"
    dir_reg.mkdir(parents=True, exist_ok=True)

    slug_por_puuid = {}
    puuid_por_amigo = {}
    for a in amigos:
        try:
            cuenta = cliente.cuenta_por_riot_id(a.nombre, a.tag)
            p = cuenta["puuid"]
            slug_por_puuid[p] = a.slug
            puuid_por_amigo[a.slug] = p
        except Exception as e:  # noqa: BLE001
            log.warning("No se pudo obtener cuenta de LoL para %s: %s", a.riot_id, e)

    for amigo in amigos:
        puuid = puuid_por_amigo.get(amigo.slug)
        if not puuid:
            continue

        ruta_reg = dir_reg / f"{amigo.slug}.json"
        registro = leer_registro(ruta_reg, amigo.riot_id, ahora_ms)
        guardadas = set(registro.get("partidas", {}).keys())

        ids_2026 = []
        inicio = 0
        while True:
            try:
                lote = cliente.ids_partidas(
                    puuid, 100, inicio=inicio, desde_s=INICIO_2026_S
                )
            except Exception as e:  # noqa: BLE001
                log.error("Error al pedir IDs de LoL para %s: %s", amigo.riot_id, e)
                break
            if not lote:
                break
            ids_2026.extend(lote)
            if len(lote) < 100:
                break
            inicio += 100

        faltan = [i for i in ids_2026 if i not in guardadas]
        if limite_por_amigo:
            faltan = faltan[:limite_por_amigo]

        log.info(
            "[%s] LoL: %d partidas en 2026, %d ya guardadas. Descargando %d faltantes...",
            amigo.riot_id,
            len(ids_2026),
            len(guardadas),
            len(faltan),
        )

        descargadas = 0
        resumenes_lote = []
        for i, id_partida in enumerate(faltan, 1):
            try:
                raw = cliente.partida(id_partida)
                resumen = resumir_partida(raw, puuid, id_partida)
                try:
                    resumen["curva_oro"] = _curva_oro(cliente.timeline(id_partida))
                except Exception:  # noqa: BLE001
                    resumen["curva_oro"] = None
                resumen["participantes"] = anonimizar_participantes(
                    resumen["participantes"], slug_por_puuid
                )
                resumenes_lote.append(resumen)
                descargadas += 1
            except DatoInvalido as e:
                log.warning("Partida %s inválida: %s", id_partida, e)
            except NoEncontrado:
                log.warning("Partida %s ya no existe en Riot", id_partida)
            except Exception as e:  # noqa: BLE001
                log.error("Error en partida %s: %s", id_partida, e)

            if len(resumenes_lote) >= 10 or i == len(faltan):
                agregar_partidas(registro, resumenes_lote)
                anonimizar_partidas(registro, slug_por_puuid)
                escribir_json_atomico(ruta_reg, registro)
                resumenes_lote = []
                log.info(
                    "[%s] Progreso LoL: %d/%d descargadas",
                    amigo.riot_id,
                    i,
                    len(faltan),
                )

    log.info("=== DESCARGA DE LOL COMPLETADA CON ÉXITO ===")


def recompilar_tft(amigos: list, cliente_tft: ClienteRiot) -> None:
    log.info("=== RECOMPILANDO tft.json ===")
    mapa_tft = MapaModos.desde_archivo(RUTA_MODOS_TFT)
    key_tft = cargar_api_key_tft()
    ejecutar_tft(
        cliente_tft,
        key_tft,
        amigos,
        mapa_tft,
        DIR_DATOS,
        RUTA_SALIDA_TFT,
        cantidad=30,
    )
    log.info("tft.json generado exitosamente.")


def recompilar_lol(amigos: list, cliente_lol: ClienteRiot) -> None:
    log.info("=== RECOMPILANDO lol.json ===")
    mapa_lol = MapaModos.desde_archivo(RUTA_MODOS)
    key_lol = cargar_api_key()
    ejecutar(
        cliente_lol,
        key_lol,
        amigos,
        mapa_lol,
        DIR_DATOS,
        RUTA_SALIDA,
        cantidad=20,
    )
    log.info("lol.json generado exitosamente.")


def main():
    parser = argparse.ArgumentParser(
        description="Descarga el historial completo de 2026 de LoL y TFT"
    )
    parser.add_argument("--juego", choices=["tft", "lol", "ambos"], default="ambos")
    parser.add_argument(
        "--limite",
        type=int,
        default=None,
        help="Límite de partidas por amigo (para pruebas)",
    )
    args = parser.parse_args()

    amigos = cargar_amigos(RUTA_AMIGOS)
    c_lol = ClienteRiot(cargar_api_key())
    c_tft = ClienteRiot(cargar_api_key_tft())

    if args.juego in ("tft", "ambos"):
        sincronizar_tft(c_tft, amigos, limite_por_amigo=args.limite)
        recompilar_tft(amigos, c_tft)

    if args.juego in ("lol", "ambos"):
        sincronizar_lol(c_lol, amigos, limite_por_amigo=args.limite)
        recompilar_lol(amigos, c_lol)

    log.info("=== SINCRONIZACIÓN Y RECOMPILACIÓN TOTAL FINALIZADA ===")


if __name__ == "__main__":
    main()
