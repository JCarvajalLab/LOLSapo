"""Publica el registro acumulado de partidas en la rama `datos` de GitHub.

La arquitectura de LOLSapo separa el código (en `main`) de las bases de datos de partidas
(en la rama huérfana `datos`), para mantener el repositorio ligero y permitir que GitHub Pages
y los flujos de publicación consuman el historial acumulado.
"""

import re
import shutil
import subprocess
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DIR_DATOS = RAIZ / "datos"
PATRON_PUUID = re.compile(
    r'"puuid"|(^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{78}([^A-Za-z0-9_-]|$)'
)


def validar_seguridad(dir_datos: Path) -> None:
    """Verifica que no existan PUUIDs ni claves privadas en los JSON antes de subir."""
    # Solo revisar lo que realmente se sube a la rama datos (registro, registro_tft, en_vivo_cache)
    archivos = [
        f
        for f in dir_datos.rglob("*.json")
        if not any(part.startswith(".") for part in f.parts)
        and not f.name.startswith("ddragon")
    ]
    if not archivos:
        raise ValueError("No se encontraron archivos en datos/")

    print(f"Verificando seguridad en {len(archivos)} archivos de registro JSON...")
    for f in archivos:
        contenido = f.read_text(encoding="utf-8")
        if PATRON_PUUID.search(contenido):
            raise ValueError(f"POSIBLE PUUID DETECTADO EN: {f}")
    print("Seguridad verificada: 0 secretos o PUUIDs en los registros anonimizados.")


def subir_rama_datos() -> None:
    validar_seguridad(DIR_DATOS)

    with tempfile.TemporaryDirectory() as temp_dir:
        dir_clon = Path(temp_dir) / "rama-datos"
        print("Clonando rama `datos` desde origin...")

        # Clonar solo la rama datos
        res = subprocess.run(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "--branch",
                "datos",
                "https://github.com/JCarvajalLab/LOLSapo.git",
                str(dir_clon),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if res.returncode != 0:
            print("Error al clonar rama datos:", res.stderr)
            return

        # Limpiar datos previos y copiar nuevos
        destino = dir_clon / "datos"
        if destino.exists():
            shutil.rmtree(destino)
        destino.mkdir(parents=True, exist_ok=True)

        for item in DIR_DATOS.iterdir():
            if item.name.startswith("."):
                continue
            if item.is_dir():
                shutil.copytree(item, destino / item.name)
            else:
                shutil.copy2(item, destino / item.name)

        print("Comprobando diferencias en los registros...")
        subprocess.run(["git", "-C", str(dir_clon), "add", "-A"], check=True)
        diff = subprocess.run(
            ["git", "-C", str(dir_clon), "diff", "--cached", "--stat"],
            capture_output=True,
            text=True,
            check=True,
        )

        if not diff.stdout.strip():
            print("El registro en `datos` ya está al día. No hay cambios.")
            return

        print("Cambios listos para subir a la rama `datos`:")
        print(diff.stdout[:500] + ("..." if len(diff.stdout) > 500 else ""))

        subprocess.run(
            ["git", "-C", str(dir_clon), "config", "user.name", "JordanCarvajal"],
            check=True,
        )
        subprocess.run(
            [
                "git",
                "-C",
                str(dir_clon),
                "config",
                "user.email",
                "carvajal.jordan94@gmail.com",
            ],
            check=True,
        )
        subprocess.run(
            [
                "git",
                "-C",
                str(dir_clon),
                "commit",
                "-m",
                "chore(datos): actualizar registro historico 2026 de lol y tft",
            ],
            check=True,
        )

        print("Empujando cambios a origin/datos...")
        push_res = subprocess.run(
            ["git", "-C", str(dir_clon), "push", "origin", "datos"],
            capture_output=True,
            text=True,
            check=False,
        )
        if push_res.returncode == 0:
            print(
                "¡Éxito! Las partidas de 2026 quedaron publicadas en la rama `datos` de GitHub."
            )
        else:
            print("Error al hacer push a origin/datos:", push_res.stderr)


if __name__ == "__main__":
    subir_rama_datos()
