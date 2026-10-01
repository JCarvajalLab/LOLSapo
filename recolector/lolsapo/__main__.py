"""Comando: python -m lolsapo  (o simplemente: lolsapo)."""

import argparse
import logging
import sys
from pathlib import Path

from .config import (
    DIR_DATOS,
    RUTA_AMIGOS,
    RUTA_ENV,
    RUTA_MODOS,
    RUTA_SALIDA,
    ErrorConfiguracion,
    cargar_amigos,
    cargar_api_key,
)
from .modos import MapaModos
from .recolector import SecretoEnSalida, ejecutar
from .riot_api import ClienteRiot, ErrorAutenticacion


def _cantidad(valor: str) -> int:
    numero = int(valor)
    if not 1 <= numero <= 100:
        raise argparse.ArgumentTypeError("debe estar entre 1 y 100")
    return numero


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="lolsapo", description="Consulta la API de Riot y genera lol.json para la web."
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

    try:
        api_key = cargar_api_key(RUTA_ENV)
        amigos = cargar_amigos(args.amigos)
        mapa = MapaModos.desde_archivo(args.modos)
        cliente = ClienteRiot(api_key)
        salida = ejecutar(cliente, api_key, amigos, mapa, args.datos, args.salida, args.cantidad)
    except ErrorConfiguracion as error:
        log.error("Configuración: %s", error)
        return 1
    except ErrorAutenticacion as error:
        log.error("%s", error)
        return 2
    except SecretoEnSalida as error:
        log.error("%s", error)
        return 3

    con_error = [a["riot_id"] for a in salida["amigos"] if a["estado"] == "error"]
    if con_error:
        log.warning("Amigos con error: %s", ", ".join(con_error))
    return 0


if __name__ == "__main__":
    sys.exit(main())
