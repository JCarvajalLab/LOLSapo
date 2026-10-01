"""Traducción de queueId de Riot a un nombre de modo legible en español."""

import json
from dataclasses import dataclass
from pathlib import Path

from .config import RUTA_MODOS, ErrorConfiguracion

CATEGORIAS = ("ranked", "normal", "aram", "otros")
NOMBRE_DESCONOCIDO = "Modo especial"
CATEGORIA_DESCONOCIDA = "otros"


@dataclass(frozen=True)
class Modo:
    queue_id: int | None
    nombre: str
    categoria: str


class MapaModos:
    def __init__(self, modos: dict[int, Modo]):
        self._modos = modos

    @classmethod
    def desde_archivo(cls, ruta: Path = RUTA_MODOS) -> "MapaModos":
        try:
            datos = json.loads(Path(ruta).read_text(encoding="utf-8"))
            crudo = datos["modos"]
            modos = {}
            for clave, valor in crudo.items():
                queue_id = int(clave)
                nombre, categoria = valor["nombre"], valor["categoria"]
                if not isinstance(nombre, str) or not nombre.strip():
                    raise ValueError(f"nombre vacío en queueId {clave}")
                if categoria not in CATEGORIAS:
                    raise ValueError(f"categoría '{categoria}' inválida en queueId {clave}")
                modos[queue_id] = Modo(queue_id, nombre.strip(), categoria)
        except FileNotFoundError:
            raise ErrorConfiguracion(f"No existe el archivo de modos: {ruta}") from None
        except (json.JSONDecodeError, KeyError, TypeError, ValueError, AttributeError) as error:
            raise ErrorConfiguracion(f"Archivo de modos inválido: {error}") from None
        return cls(modos)

    def conocido(self, queue_id: int | None) -> bool:
        return queue_id in self._modos

    def obtener(self, queue_id: int | None) -> Modo:
        modo = self._modos.get(queue_id) if queue_id is not None else None
        return modo or Modo(queue_id, NOMBRE_DESCONOCIDO, CATEGORIA_DESCONOCIDA)
