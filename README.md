# LOLSapo

Web estilo op.gg para un grupo cerrado de amigos del servidor **LAS**. Muestra quién está jugando ahora, rango, victorias y derrotas en todos los modos de juego y las últimas 10 partidas de cada uno. Primero League of Legends; Teamfight Tactics después.

> 🚧 Proyecto en desarrollo (fase 4: pulido). Por ahora funciona solo en local.

El detalle completo del proyecto está en [docs/REQUERIMIENTOS.md](docs/REQUERIMIENTOS.md).

## Cómo funciona

La API de Riot necesita una key secreta, así que la web **nunca** llama a Riot directamente:

1. Un script en Python consulta la API de Riot y genera archivos JSON.
2. El frontend (React + Vite) solo lee esos JSON.

## Requisitos

- Git
- Python 3.12 o superior
- Node.js LTS (incluye npm)
- Una cuenta en el [Riot Developer Portal](https://developer.riotgames.com/) para obtener la *development key*

## Configuración inicial

```bash
git clone https://github.com/JCarvajalLab/LOLSapo.git
cd LOLSapo
cp .env.example .env   # luego pega tu RIOT_API_KEY dentro de .env
```

`.env` está ignorado por git. Nunca subas la key al repositorio.

### Entorno de desarrollo y chequeos de seguridad

```powershell
py -3.14 -m venv .venv
.venv\Scripts\Activate.ps1
pip install --require-hashes -r recolector/requirements-dev.txt
pip install --no-deps --no-build-isolation -e recolector
pre-commit install
```

Desde ahí, cada `git commit` corre automáticamente [gitleaks](https://github.com/gitleaks/gitleaks), que bloquea el commit si detecta una key o un secreto, junto con algunos chequeos de formato. Para correrlos a mano sobre todo el repo:

```powershell
pre-commit run --all-files
```

## Correr el proyecto

### Recolector de datos

Con el entorno virtual activado y la key en `.env`:

```powershell
python -m lolsapo
```

Consulta la API de Riot y genera `frontend/public/datos/lol.json`. Por cada amigo revisa las últimas 20 partidas (`--cantidad N` para cambiarlo, máximo 100) y descarga solo las que aún no están guardadas. La primera ejecución tarda unos minutos por los límites de la dev key; las siguientes, segundos.

El registro acumulado de partidas queda en `datos/registro/` (ignorado por git). Las estadísticas de victorias y derrotas por modo se calculan a partir de ese registro, así que cuentan desde que LOLSapo empezó a seguir a cada amigo.

Para que se repita solo (útil en local para ver "En partida"): `python -m lolsapo --cada 3` repite cada 3 minutos hasta presionar `Ctrl + C`.

Códigos de salida: `0` bien · `1` configuración inválida o falta la key · `2` Riot rechazó la key (la dev key caduca cada 24 h) · `3` la key apareció en la salida (no se escribe nada).

### Tests y chequeos del recolector

```powershell
cd recolector
python -m pytest            # tests (nunca llaman a la API real)
ruff check . ; ruff format --check .
bandit -c pyproject.toml -r lolsapo
pip-audit --strict --require-hashes -r requirements-dev.txt
```

### Frontend

Web en React + Vite + Tailwind que solo lee `frontend/public/datos/lol.json` (nunca llama a Riot):

```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173
```

La página vuelve a leer los datos cada 2 minutos mientras la pestaña está visible. Para ver datos nuevos (por ejemplo, quién está en partida), el recolector tiene que estar corriendo: en local, `python -m lolsapo --cada 3` en otra terminal. Si los datos tienen más de 15 minutos, la web lo avisa; con más de 60, oculta las partidas en vivo.

Chequeos del frontend:

```powershell
npm run lint
npm test
npm run build
npm run verificar:build   # el build no debe contener keys de Riot
npm audit
```

Los colores están como variables en `frontend/src/estilos/index.css` (por ejemplo, `--color-victoria`).

## Agregar o quitar un amigo

Edita [config/amigos.json](config/amigos.json) y agrega o quita su Riot ID con el formato `nombre#tag`:

```json
{ "amigos": ["Johnadis#LAS", "Nuevo Amigo#LAS"] }
```

En la siguiente ejecución del recolector aparece el amigo nuevo (con sus últimas partidas como carga inicial). Al quitar a alguien, su registro queda en `datos/registro/` por si vuelve.

## Modos de juego

[config/modos.json](config/modos.json) traduce el `queueId` de Riot a un nombre en español y una categoría (`ranked`, `normal`, `aram`, `otros`). Si Riot saca un modo nuevo, aparece como "Modo especial" hasta que se agregue a ese archivo.

## Estructura del repositorio

```text
config/      Lista de amigos y mapa de modos de juego
recolector/  Script de Python que consulta a Riot (paquete lolsapo) y sus tests
frontend/    Web en React + Vite + Tailwind y sus tests
docs/        Documentación y requerimientos
.github/     Workflows de CI y configuración de Dependabot
.claude/     Configuración y subagentes de Claude Code
```

Las carpetas del script de datos, del frontend y de los workflows se agregan en sus fases.

## Aviso legal

LOLSapo no está respaldado por Riot Games y no refleja las opiniones de Riot Games ni de nadie oficialmente involucrado en la producción o gestión de las propiedades de Riot Games. Riot Games y todas las propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc.
