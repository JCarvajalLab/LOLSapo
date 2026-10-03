"""Comando: python -m lolsapo  (o simplemente: lolsapo)."""

import argparse
import logging
import sys
import time
from collections.abc import Callable
from pathlib import Path

from . import ddragon as datos_ddragon
from . import ddragon_tft
from .config import (
    DIR_DATOS,
    RUTA_AMIGOS,
    RUTA_ENV,
    RUTA_MODOS,
    RUTA_MODOS_TFT,
    RUTA_SALIDA,
    RUTA_SALIDA_TFT,
    ErrorConfiguracion,
    cargar_amigos,
    cargar_api_key,
    cargar_api_key_tft,
)
from .modos import MapaModos
from .recolector import SecretoEnSalida, ejecutar
from .riot_api import ClienteRiot, ErrorAutenticacion
from .tft import ejecutar_tft


def _cantidad(valor: str) -> int:
    numero = int(valor)
    if not 1 <= numero <= 100:
        raise argparse.ArgumentTypeError("debe estar entre 1 y 100")
    return numero


def _minutos(valor: str) -> int:
    numero = int(valor)
    # Mínimo 2: con partidas en vivo cada pasada usa más llamadas (rango y maestría).
    if not 2 <= numero <= 60:
        raise argparse.ArgumentTypeError("debe estar entre 2 y 60 minutos")
    return numero


def main(argv: list[str] | None = None, dormir: Callable[[float], None] = time.sleep) -> int:
    parser = argparse.ArgumentParser(
        prog="lolsapo",
        description="Consulta la API de Riot y genera lol.json y tft.json para la web.",
    )
    parser.add_argument(
        "--juego",
        choices=("ambos", "lol", "tft"),
        default="ambos",
        help="qué datos generar (por defecto ambos)",
    )
    parser.add_argument(
        "--cantidad",
        type=_cantidad,
        default=20,
        help="partidas recientes a revisar por amigo (1-100, por defecto 20)",
    )
    parser.add_argument("--amigos", type=Path, default=RUTA_AMIGOS)
    parser.add_argument("--modos", type=Path, default=RUTA_MODOS)
    parser.add_argument("--datos", type=Path, default=DIR_DATOS, help="carpeta del registro")
    parser.add_argument("--salida", type=Path, default=RUTA_SALIDA)
    parser.add_argument("--modos-tft", type=Path, default=RUTA_MODOS_TFT)
    parser.add_argument("--salida-tft", type=Path, default=RUTA_SALIDA_TFT)
    parser.add_argument(
        "--cada",
        type=_minutos,
        metavar="MIN",
        help="repetir cada MIN minutos (2-60) hasta presionar Ctrl+C; útil en local",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    # La consola de Windows no siempre usa UTF-8: sin esto, "Nicø" o "Límite" salen rotos.
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
    )
    # urllib3 en modo debug imprime URLs; nunca headers, pero no hace falta tanto detalle.
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    log = logging.getLogger("lolsapo")

    if not args.cada:
        return _una_vez(args, log)

    try:
        while True:
            codigo = _una_vez(args, log)
            if codigo != 0:
                # Configuración, key rechazada o key en la salida: reintentar no lo arregla.
                log.error("Se detiene la repetición (código %d).", codigo)
                return codigo
            log.info("Próxima consulta en %d min. Ctrl+C para detener.", args.cada)
            dormir(args.cada * 60)
    except KeyboardInterrupt:
        log.info("Detenido.")
        return 0


def _una_vez(args: argparse.Namespace, log: logging.Logger) -> int:
    """Una consulta completa a Riot. Devuelve el código de salida."""
    try:
        api_key = cargar_api_key(RUTA_ENV)
        amigos = cargar_amigos(args.amigos)
        mapa = MapaModos.desde_archivo(args.modos)
        mapa_tft = MapaModos.desde_archivo(args.modos_tft)
        cliente = ClienteRiot(api_key)
        salida = salida_tft = None
        if args.juego in ("ambos", "lol"):
            ddragon = datos_ddragon.obtener(args.datos / "ddragon.json")
            salida = ejecutar(
                cliente,
                api_key,
                amigos,
                mapa,
                args.datos,
                args.salida,
                args.cantidad,
                ddragon=ddragon,
            )
        if args.juego in ("ambos", "tft"):
            try:
                api_key_tft = cargar_api_key_tft(RUTA_ENV)
            except ErrorConfiguracion as error:
                # Una key de TFT mal copiada no debe detener la publicación de LoL.
                log.error("Configuración: %s Se usa la key de LoL para TFT.", error)
                api_key_tft = None
            # Con una key propia de TFT se usa otro cliente (los límites son por key); si no,
            # se comparte el de LoL para respetar el mismo límite.
            if api_key_tft and api_key_tft != api_key:
                cliente_tft, key_tft = ClienteRiot(api_key_tft), api_key_tft
            else:
                cliente_tft, key_tft = cliente, api_key
            salida_tft = ejecutar_tft(
                cliente_tft,
                key_tft,
                amigos,
                mapa_tft,
                args.datos,
                args.salida_tft,
                args.cantidad,
                ddragon=ddragon_tft.obtener(args.datos / "ddragon_tft.json"),
            )
    except ErrorConfiguracion as error:
        log.error("Configuración: %s", error)
        return 1
    except ErrorAutenticacion as error:
        log.error("%s", error)
        return 2
    except SecretoEnSalida as error:
        log.error("%s", error)
        return 3

    for nombre, datos in (("LoL", salida), ("TFT", salida_tft)):
        if datos is None:
            continue
        con_error = [a["riot_id"] for a in datos["amigos"] if a["estado"] == "error"]
        if con_error:
            log.warning("Amigos con error en %s: %s", nombre, ", ".join(con_error))
    if salida_tft and salida_tft["error"]:
        log.warning("TFT: %s", salida_tft["error"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
