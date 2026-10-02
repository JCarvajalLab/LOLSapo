# LOLSapo

Web estilo op.gg para un grupo cerrado de amigos del servidor **LAS**. Muestra quién está jugando ahora (con los dos equipos), rango, victorias y derrotas en todos los modos de juego y las últimas partidas de cada uno. Primero League of Legends; Teamfight Tactics después.

**Sitio:** https://jcarvajallab.github.io/LOLSapo/ (se actualiza solo cada ~10 minutos).

> Fase 5 (publicación) completa. Próxima: fase 6, TFT. El detalle del proyecto está en [docs/REQUERIMIENTOS.md](docs/REQUERIMIENTOS.md).

## Cómo funciona

La API de Riot necesita una key secreta, así que la web **nunca** llama a Riot directamente:

1. Un script en Python (el **recolector**) consulta la API de Riot y genera `lol.json`.
2. El frontend (React + Vite) solo lee ese JSON.
3. En producción, GitHub Actions corre el recolector cada ~10 minutos y publica la web en GitHub Pages. En local lo corres tú.

## Usarlo con tus amigos

¿Quieres tu propio LOLSapo? Haz un fork (o clónalo) y cambia estas cosas:

| Qué | Dónde | Obligatorio |
|-----|-------|-------------|
| Tu API key de Riot | `.env` (local) o un secret de GitHub (publicado) | Sí |
| La lista de amigos (máximo 10) | [config/amigos.json](config/amigos.json) | Sí |
| El servidor, si no juegan en LAS | `PLATAFORMA` y `REGION` en [recolector/lolsapo/riot_api.py](recolector/lolsapo/riot_api.py) | Solo si no es LAS |
| Nombres de modos de juego | [config/modos.json](config/modos.json) | No |
| Colores (por ejemplo, el de victoria) | [frontend/src/estilos/index.css](frontend/src/estilos/index.css) | No |

**Servidor:** `PLATAFORMA` es el servidor (`la1` LAN, `la2` LAS, `br1` Brasil, `na1` Norteamérica, `euw1` Europa Oeste…) y `REGION` es el grupo al que pertenece (`americas` para LAN, LAS, BR y NA; `europe` para EUW, EUNE y TR; `asia` para KR y JP). La lista completa está en la [documentación de Riot](https://developer.riotgames.com/docs/lol#routing-values).

**Amigos:** escribe cada Riot ID completo, con su tag:

```json
{ "amigos": ["TuNombre#LAS", "Amigo Uno#LAS", "Amigo Dos#1234"] }
```

En la siguiente ejecución aparecen los amigos nuevos, con sus últimas partidas como carga inicial. Al quitar a alguien, su registro se conserva por si vuelve.

## Correrlo en tu computador

### 1. Requisitos

- Git
- Python 3.12 o superior
- Node.js LTS (incluye npm)
- Una cuenta en el [Riot Developer Portal](https://developer.riotgames.com/). Al entrar con tu cuenta de Riot te da una *development key* gratis, que caduca cada 24 horas (se renueva con un clic en el portal).

### 2. Clonar y poner tu key

```bash
git clone https://github.com/JCarvajalLab/LOLSapo.git
cd LOLSapo
cp .env.example .env
```

Abre `.env` y pega tu key después del `=`:

```text
RIOT_API_KEY=pega-aqui-tu-key
```

`.env` está ignorado por git: nunca se sube al repositorio. No compartas tu key con nadie ni la pegues en otro archivo.

Luego edita [config/amigos.json](config/amigos.json) con tus amigos (y el servidor, si no es LAS; ver la sección anterior).

### 3. Instalar el recolector (Python)

En Windows (PowerShell):

```powershell
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
pip install --require-hashes -r recolector/requirements-dev.txt
pip install --no-deps --no-build-isolation -e recolector
```

En macOS o Linux cambia las dos primeras líneas por `python3 -m venv .venv` y `source .venv/bin/activate`.

### 4. Generar los datos

Con el entorno virtual activado:

```powershell
python -m lolsapo
```

Genera `frontend/public/datos/lol.json`. La primera vez tarda unos minutos (descarga las últimas 20 partidas de cada amigo respetando los límites de la key); las siguientes, segundos, porque nunca vuelve a descargar una partida ya guardada.

- `--cantidad N`: cuántas partidas recientes revisar por amigo (1 a 100, por defecto 20).
- `--cada MIN`: repetir cada MIN minutos hasta presionar `Ctrl + C`. Útil para ver "En partida" en local: `python -m lolsapo --cada 3`.
- `-v`: más detalle en la consola.

Códigos de salida: `0` bien · `1` configuración inválida o falta la key · `2` Riot rechazó la key (probablemente caducó) · `3` la key o un PUUID apareció en la salida (no se escribe nada).

El registro acumulado de partidas queda en `datos/registro/`. Las victorias y derrotas por modo se calculan desde ese registro, así que cuentan desde que LOLSapo empezó a seguir a cada amigo.

### 5. Levantar la web

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173. La página vuelve a leer los datos cada 2 minutos mientras la pestaña está visible. Si los datos tienen más de 15 minutos lo avisa, y con más de 60 oculta las partidas en vivo.

## Publicarlo en GitHub Pages

El workflow [`.github/workflows/publicar.yml`](.github/workflows/publicar.yml) corre cada ~10 minutos, al mergear en `main` o a mano (**Actions → Publicar → Run workflow**):

1. **Consultar Riot:** trae el registro desde la rama `datos`, corre el recolector y, si el registro cambió, lo guarda de vuelta en `datos`. `main` nunca recibe commits automáticos.
2. **Publicar:** construye la web, corre `verificar:build` (sin keys, sin PUUID y con CSP) y la publica en GitHub Pages.

⚠️ **Necesitas una *Personal API Key*.** Las políticas de Riot no permiten usar la *development key* en un sitio público (además caduca cada 24 horas). Se pide en el portal de Riot con **Register Product → Personal API Key**, explicando que es un sitio para tu grupo de amigos; la aprobación puede tardar.

Para activarlo en tu fork, en **Settings** del repo:

1. **General:** el repo tiene que ser **público** (GitHub Pages y los minutos ilimitados de Actions son gratis solo en repos públicos).
2. **Actions:** en la pestaña **Actions** de tu fork, habilita los workflows (GitHub los desactiva en los forks).
3. **Pages → Source:** elige **GitHub Actions**.
4. **Environments → New environment:** nómbralo `produccion`. En **Deployment branches and tags** limítalo a `main` y agrega el **environment secret** `RIOT_API_KEY_LOL` con tu Personal Key. Tiene que ser secret del environment, no del repo.
5. **Secrets and variables → Actions → pestaña Variables:** crea `PUBLICAR_ACTIVO` con valor `true`. Es el interruptor: sin ella el workflow no hace nada. Para pausar la publicación, cámbiala a `false`.

Tu sitio queda en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

La rama `datos` solo la escribe el workflow: no la borres, ahí vive el registro acumulado de partidas. Los registros no guardan PUUID.

### Renovar la API key

La key vive en **Settings → Environments → produccion → `RIOT_API_KEY_LOL`** (para TFT habrá otro, `RIOT_API_KEY_TFT`). Para cambiarla, edita ese secret y pega la nueva (nadie puede ver la anterior, solo reemplazarla). Si el workflow empieza a fallar y la web avisa que los datos están viejos, lo primero es revisar la key.

## Para desarrollar

### Chequeos antes de cada commit

```powershell
pre-commit install
```

Desde ahí, cada `git commit` corre [gitleaks](https://github.com/gitleaks/gitleaks), que bloquea el commit si detecta una key o un secreto, junto con chequeos de formato, de workflows y de caracteres invisibles. Para correrlos a mano: `pre-commit run --all-files`.

### Tests y seguridad del recolector

```powershell
cd recolector
python -m pytest            # tests (nunca llaman a la API real)
ruff check . ; ruff format --check .
bandit -c pyproject.toml -r lolsapo
pip-audit --strict --require-hashes -r requirements-dev.txt
```

### Tests y seguridad del frontend

```powershell
cd frontend
npm run lint
npm test
npm run build
npm run verificar:build   # el build no debe contener keys, PUUID ni romper la CSP
npm audit
```

El CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) corre todo esto en cada pull request.

## Estructura del repositorio

```text
config/      Lista de amigos y mapa de modos de juego
recolector/  Script de Python que consulta a Riot (paquete lolsapo) y sus tests
frontend/    Web en React + Vite + Tailwind y sus tests
docs/        Documentación y requerimientos
.github/     Workflows (CI y publicación) y configuración de Dependabot
.claude/     Configuración y subagentes de Claude Code
```

## Aviso legal

LOLSapo no está respaldado por Riot Games y no refleja las opiniones de Riot Games ni de nadie oficialmente involucrado en la producción o gestión de las propiedades de Riot Games. Riot Games y todas las propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc.
