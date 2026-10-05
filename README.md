# LOLSapo

Web estilo op.gg para un grupo cerrado de amigos del servidor **LAS**. Muestra quién está jugando ahora (con los dos equipos), rango, victorias y derrotas en todos los modos de juego y las últimas partidas de cada uno, en **League of Legends** y **Teamfight Tactics** (pestañas LoL / TFT).

**Sitio:** https://jcarvajallab.github.io/LOLSapo/ (se actualiza solo cada ~5 minutos).

> Fase 7 (extras) en curso: ya están los destacados de hoy y de la semana. El detalle del proyecto está en [docs/REQUERIMIENTOS.md](docs/REQUERIMIENTOS.md).

## Cómo funciona

La API de Riot necesita una key secreta, así que la web **nunca** llama a Riot directamente:

1. Un script en Python (el **recolector**) consulta la API de Riot y genera `lol.json` y `tft.json`.
2. El frontend (React + Vite) solo lee ese JSON.
3. En producción, un Cloudflare Worker le pide a GitHub Actions cada 5 minutos que corra el recolector y publique la web en GitHub Pages. En local lo corres tú.

## Destacados

En la pestaña LoL, bajo "En partida", dos secciones resumen lo que hizo el grupo. Solo cuentan partidas **en grupo** (2 o más del grupo en el mismo equipo) de Normal y Ranked (Solo/Dúo y Flex), sin remakes.

**Destacados de hoy** (desde las 12:00 de Chile; se reinicia cada día a esa hora):

| Tarjeta | Cómo se calcula |
|---------|-----------------|
| Mejor / Peor jugador de la partida - Hoy | De las partidas en grupo de hoy, la actuación individual con el KDA más alto / más bajo (gane o pierda), con su daño a campeones |
| Balance del grupo hoy | Victorias y derrotas de las partidas en grupo de hoy (cada partida cuenta una vez), con los nombres de quienes jugaron; quien jugó menos partidas que el total lleva cuántas entre paréntesis |

**Destacados de la semana** (de lunes a domingo; se reinicia el lunes a la 01:00 de Chile):

| Tarjeta | Cómo se calcula |
|---------|-----------------|
| Más partidas | Partidas en grupo de la semana |
| Mejor winrate | Partidas en grupo de la semana, desde 2. Gana el % más alto; con el mismo %, quien jugó más. Con empate exacto (lo normal si jugaron juntos) aparecen todos |
| Mejor / Peor jugador de la semana | Igual que los de hoy, pero con las partidas en grupo de la semana |
| Racha de victorias / derrotas en equipo | Partidas en grupo en orden: la racha sigue mientras se repite el resultado y cada partida comparte al menos un amigo con la anterior. Muestra a todos los que participaron; quien jugó menos partidas que el total de la racha lleva cuántas entre paréntesis |

Las tarjetas sin datos dicen «No existen partidas registradas en equipo esta semana» (o «…hoy»).

Se calculan en el recolector ([recolector/lolsapo/destacados.py](recolector/lolsapo/destacados.py)) a partir del registro completo de cada amigo, sin consultas extra a Riot.

## Con quién gana más

En el **Ranking** de la pestaña LoL, al hacer clic en el nombre de un amigo se abre una ventana con su sinergia con el resto del grupo: por cada compañero, cuántas partidas jugaron **en el mismo equipo** y el winrate juntos (solo Normal y Ranked, con todo lo registrado). Se puede ordenar por partidas o por winrate, y el botón «Ver sus últimas partidas» lleva a su historial. Se calcula en [recolector/lolsapo/sinergia.py](recolector/lolsapo/sinergia.py), juntando las partidas de los registros de todos sin repetirlas.

## Usarlo con tus amigos

¿Quieres tu propio LOLSapo? Haz un fork (o clónalo) y cambia estas cosas:

| Qué | Dónde | Obligatorio |
|-----|-------|-------------|
| Tu API key de Riot | `.env` (local) o un secret de GitHub (publicado) | Sí |
| La lista de amigos (máximo 10) | [config/amigos.json](config/amigos.json) | Sí |
| El servidor, si no juegan en LAS | `PLATAFORMA` y `REGION` en [recolector/lolsapo/riot_api.py](recolector/lolsapo/riot_api.py) | Solo si no es LAS |
| Nombres de modos de juego | [config/modos.json](config/modos.json) (LoL) y [config/modos_tft.json](config/modos_tft.json) (TFT) | No |
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
RIOT_API_KEY_TFT=
```

`RIOT_API_KEY_TFT` es opcional: si la dejas vacía, TFT usa la misma key. La *development key* sirve para los dos juegos.

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

Genera `frontend/public/datos/lol.json` y `tft.json`. La primera vez tarda unos minutos (descarga las últimas 20 partidas de LoL y 30 de TFT de cada amigo respetando los límites de la key); las siguientes, segundos, porque nunca vuelve a descargar una partida ya guardada.

- `--juego lol` o `--juego tft`: generar solo uno de los dos (por defecto, ambos).
- `--cantidad N`: cuántas partidas recientes revisar por amigo (1 a 100, por defecto 20; TFT revisa siempre al menos 30 para la grilla de posiciones).
- `--cada MIN`: repetir cada MIN minutos hasta presionar `Ctrl + C`. Útil para ver "En partida" en local: `python -m lolsapo --cada 3`.
- `-v`: más detalle en la consola.

Códigos de salida: `0` bien · `1` configuración inválida o falta la key · `2` Riot rechazó la key (probablemente caducó) · `3` la key o un PUUID apareció en la salida (no se escribe nada).

El registro acumulado de partidas queda en `datos/registro/` (LoL) y `datos/registro_tft/` (TFT). Las victorias y derrotas por modo se calculan desde ese registro, así que cuentan desde que LOLSapo empezó a seguir a cada amigo.

### 5. Levantar la web

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173. La página vuelve a leer los datos cada 2 minutos mientras la pestaña está visible. Si los datos tienen más de 15 minutos lo avisa, y con más de 60 oculta las partidas en vivo.

## Publicarlo en GitHub Pages

El workflow [`.github/workflows/publicar.yml`](.github/workflows/publicar.yml) corre cada 5 minutos (lo lanza el [disparador](#disparador-cloudflare-worker)), al mergear en `main` o a mano (**Actions → Publicar → Run workflow**):

1. **Consultar Riot:** trae el registro desde la rama `datos`, corre el recolector y, si el registro cambió, lo guarda de vuelta en `datos`. `main` nunca recibe commits automáticos.
2. **Publicar:** construye la web, corre `verificar:build` (sin keys, sin PUUID y con CSP) y la publica en GitHub Pages.

⚠️ **Necesitas una *Personal API Key*.** Las políticas de Riot no permiten usar la *development key* en un sitio público (además caduca cada 24 horas). Se pide en el portal de Riot con **Register Product → Personal API Key**, explicando que es un sitio para tu grupo de amigos; la aprobación puede tardar.

Para activarlo en tu fork, en **Settings** del repo:

1. **General:** el repo tiene que ser **público** (GitHub Pages y los minutos ilimitados de Actions son gratis solo en repos públicos).
2. **Actions:** en la pestaña **Actions** de tu fork, habilita los workflows (GitHub los desactiva en los forks).
3. **Pages → Source:** elige **GitHub Actions**.
4. **Environments → New environment:** nómbralo `produccion`. En **Deployment branches and tags** limítalo a `main` y agrega el **environment secret** `RIOT_API_KEY_LOL` con tu Personal Key. Tiene que ser secret del environment, no del repo. Si tienes una key aparte para TFT, agrégala en el mismo environment como `RIOT_API_KEY_TFT` (si no existe, TFT usa la de LoL).
5. **Secrets and variables → Actions → pestaña Variables:** crea `PUBLICAR_ACTIVO` con valor `true`. Es el interruptor: sin ella el workflow no hace nada. Para pausar la publicación, cámbiala a `false`.

Tu sitio queda en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

La rama `datos` solo la escribe el workflow: no la borres, ahí vive el registro acumulado de partidas. Los registros no guardan PUUID.

### Disparador (Cloudflare Worker)

El cron propio de GitHub Actions es "lo mejor posible": cuando GitHub tiene mucha carga atrasa o salta ejecuciones (a veces pasan horas). Por eso el que manda es un [Cloudflare Worker](https://developers.cloudflare.com/workers/) gratuito en [disparador/](disparador/): cada 5 minutos le pide a la API de GitHub que ejecute `publicar.yml`, igual que apretar **Run workflow**. El cron de GitHub queda de respaldo cada 30 minutos.

- No tiene URL pública: solo corre en su horario.
- Usa un *fine-grained token* de GitHub limitado al repo y al permiso **Actions: Read and write**, guardado como secret `GH_TOKEN` en Cloudflare. No da acceso al código ni a los secrets del repo.
- **Cambiar el intervalo:** edita `"crons"` en [disparador/wrangler.jsonc](disparador/wrangler.jsonc) y vuelve a publicar. Menos de 5 minutos no conviene (cada publicación tarda ~3 min y la key de Riot tiene un límite).
- **Ver si funciona:** panel de Cloudflare → Workers → `lolsapo-disparador` → Logs, o en GitHub, **Actions → Publicar** (las ejecuciones aparecen como `workflow_dispatch`).

Publicarlo (desde `disparador/`, una sola vez y cada vez que cambie):

```powershell
npm install
npx wrangler login              # abre el navegador para autorizar tu cuenta de Cloudflare
npx wrangler secret put GH_TOKEN   # pega el token cuando lo pida (no queda en ningún archivo)
npx wrangler deploy
```

**Renovar el token** (vence según lo que elegiste al crearlo): crea uno nuevo en GitHub con los mismos permisos, corre `npx wrangler secret put GH_TOKEN` y pega el nuevo. Mientras esté vencido, la web solo se actualiza con el cron de respaldo.

Tests y chequeos: `npm run lint`, `npm test` y `npm audit` dentro de `disparador/`.

### Renovar la API key

La key vive en **Settings → Environments → produccion → `RIOT_API_KEY_LOL`** (y la de TFT, si existe, en `RIOT_API_KEY_TFT`). Para cambiarla, edita ese secret y pega la nueva (nadie puede ver la anterior, solo reemplazarla). Si el workflow empieza a fallar y la web avisa que los datos están viejos, lo primero es revisar la key.

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
disparador/  Cloudflare Worker que lanza la publicación cada 5 minutos
.github/     Workflows (CI y publicación) y configuración de Dependabot
.claude/     Configuración y subagentes de Claude Code
```

## Aviso legal

LOLSapo no está respaldado por Riot Games y no refleja las opiniones de Riot Games ni de nadie oficialmente involucrado en la producción o gestión de las propiedades de Riot Games. Riot Games y todas las propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc.
