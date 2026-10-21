# LOLSapo

Web estilo op.gg para un grupo cerrado de amigos del servidor **LAS**. Muestra quién está jugando ahora (con los dos equipos), rango, victorias y derrotas en todos los modos de juego y las últimas partidas de cada uno, en **League of Legends** y **Teamfight Tactics** (pestañas LoL / TFT).

**Sitio:** https://jcarvajallab.github.io/LOLSapo/ (se actualiza solo cada ~5 minutos).

> Incluye: partida en vivo, destacados grupales (hoy, semana y mes), sinergia entre amigos, estadísticas completas de campeones y distribución de roles, y modal interactivo de detalle de partida con gráficos de ventaja de oro y daño. El detalle del proyecto está en [docs/REQUERIMIENTOS.md](docs/REQUERIMIENTOS.md).

## Cómo funciona

La API de Riot necesita una key secreta, así que la web **nunca** llama a Riot directamente:

1. Un script en Python (el **recolector**) consulta la API de Riot y genera `lol.json` y `tft.json`.
2. El frontend (React + Vite + Tailwind) solo lee ese JSON.
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

**Destacados del mes** (del día 1 a la 01:00 de Chile hasta fin de mes; se actualiza durante todo el mes): **Mejor jugador del mes**, **Balance del grupo del mes** y **Peor jugador del mes**, con las mismas reglas que los de hoy. Los días 1 a 3 se muestra el mes anterior, cerrado, para que no quede vacío. Se cuenta desde octubre de 2026.

**Top 5:** al hacer clic en una tarjeta (menos las rachas) se abre el ranking del grupo de esa categoría. En mejor y peor jugador hay dos pestañas: **Global** (las 5 mejores o peores partidas, aunque se repita un amigo) y **Por jugador** (la mejor o peor partida de cada uno).

**Cómo se elige el mejor y el peor jugador:** solo por KDA de la partida, gane o pierda: (asesinatos + asistencias) ÷ muertes (mínimo 1). Con empate, el mejor es el de más asesinatos + asistencias, luego menos muertes y luego **más daño**; el peor es el de más muertes y luego **menos daño**.

Se calculan en el recolector ([recolector/lolsapo/destacados.py](recolector/lolsapo/destacados.py)) a partir del registro completo de cada amigo, sin consultas extra a Riot.

## Con quién gana más

En el **Ranking** de la pestaña LoL, al hacer clic en el nombre de un amigo se abre una ventana con su sinergia con el resto del grupo: por cada compañero, cuántas partidas jugaron **en el mismo equipo** y el winrate juntos (solo Normal y Ranked). Tiene dos períodos: **últimos 30 días** (el que se abre primero) y **todo lo registrado**; los compañeros con los que no jugó en ese período aparecen al final con «No han jugado juntos». Al empezar, el recolector completó una sola vez las partidas de los últimos 30 días que faltaban en el registro. Se puede ordenar por partidas o por winrate, y el botón «Ver sus últimas partidas» lleva a su historial. Se calcula en [recolector/lolsapo/sinergia.py](recolector/lolsapo/sinergia.py), juntando las partidas de los registros de todos sin repetirlas.

## Estadísticas generales: Campeones y Roles (Estilo OP.GG)

Bajo la sección de destacados y antes del historial de partidas, se encuentra el bloque de **Estadísticas generales** con métricas agregadas por campeón y por carril:

### 1. Campeones más utilizados (Top 5 del grupo)
- Muestra el campeón principal de cada integrante del grupo (ordenados por mayor cantidad de partidas jugadas).
- Incluye barras proporcionales de **Partidas** jugadas, porcentaje de **Winrate** con barra coloreada según resultado, ratio y desglose de **KDA** (asesinatos en verde, muertes en rojo y asistencias en dorado/sapo), e insignia distintiva con el nombre del jugador.
- Al hacer clic en la tarjeta o en la etiqueta `Top 5 ›`, se abre el **Modal de estadísticas completas de campeones**.

### 2. Modal de estadísticas completas de campeones
- **Filtros por período:** selector entre **30 días**, **90 días** y **Total** registrado.
- **Pestaña Global vs. Pestañas individuales:**
  - **Global:** Compara el rendimiento grupal y lista individualmente las estadísticas de cada amigo que haya jugado un mismo campeón (para ver quién tiene mejor winrate, KDA o CS/min con ese personaje).
  - **Por amigo:** Pestañas directas para explorar el catálogo de campeones específico de cada jugador.
- **Filtro por carril:** Botones interactivos para filtrar campeones según su posición: **Superior (Top)**, **Jungla (Jg)**, **Central (Mid)**, **Inferior (ADC)**, **Soporte (Supp)** o **Todas las líneas**.
- **Ordenamiento:** Encabezados clicables para ordenar la tabla por **Partidas**, **KDA** o **Winrate** ascendente/descendente.

### 3. Estadísticas básicas y Roles más jugados
- **Rotación automática y selector manual:** Rota automáticamente cada pocos minutos entre los integrantes del grupo y permite seleccionar directamente a cualquiera de los amigos mediante pestañas.
- **Selector de período:** Fijado por defecto en **30 días**, con opción de cambiar a **90 días** o **Total**.
- **Métricas consolidadas:**
  - **KDA Promedio:** Ponderado por partida con colores diferenciados para asesinatos, muertes y asistencias.
  - **Jugadas:** Total de partidas registradas del invocador en ese período.
  - **Winrate:** Tasa de victorias real calculada sobre todas sus partidas (verde si es $\ge 50\%$, rojo si es $< 50\%$).
- **Gráfico circular Donut:** Representa visualmente la proporción de partidas en cada rol con el color identificatorio de cada línea, destacando al centro el **Rol Principal**.
- **Tabla de desglose de líneas:** Nombres completos sin abreviar (`Superior`, `Jungla`, `Central`, `Inferior`, `Soporte`), partidas y porcentaje de presencia en ese carril en formato compacto `Partidas (%)` (ej. `11 (37%)`), y tasa de victoria por rol.
- **Interactividad:** Al hacer clic en cualquier línea o segmento del Donut, se abre directamente el modal de campeones filtrado por ese amigo, período y rol.

## Detalle de partidas y gráficos interactivos

En el historial de cada amigo, al hacer clic sobre cualquier fila de partida se abre el **Modal de detalle de partida**:

- **Información del encuentro:** Modo de juego, mapa, duración, fecha y hora relativa, y resultado (Victoria/Derrota).
- **Tablas de ambos equipos (Azul y Rojo):**
  - Desglose de los 10 jugadores con sus campeones, hechizos de invocador, runas principales, objetos finales y centinelas de visión.
  - KDA con colores diferenciados: asesinatos (verde/cian), muertes (rojo/coral) y asistencias (amarillo/sapo).
  - Puntuación de visión y súbditos (CS y CS/min).
- **Objetivos neutrales:** Marcadores por equipo de Torres destruidas, Dragones, Barones y Heraldos/Larvas del Vacío.
- **Gráficos interactivos:**
  - **Ventaja de Oro temporal:** Curva visual minuto a minuto que muestra qué equipo dominó la economía de la partida.
  - **Selector de Daño:** Alternador de barras para comparar fácilmente el **Daño Infligido a Campeones** o el **Daño Recibido** de todos los participantes.

## Usarlo con tus amigos

¿Quieres tener tu propia versión de LOLSapo para tu grupo de amigos? Haz un **fork** del repositorio (o clónalo) y sigue esta guía para configurarlo con tus datos y tus claves de forma segura:

| Qué | Dónde | Obligatorio |
|-----|-------|-------------|
| Tu API key de Riot | `.env` (local) o secret en GitHub Actions (publicado) | Sí |
| La lista de amigos (máximo 10) | [config/amigos.json](config/amigos.json) | Sí |
| El servidor, si no juegan en LAS | `PLATAFORMA` y `REGION` en [recolector/lolsapo/riot_api.py](recolector/lolsapo/riot_api.py) | Solo si no es LAS |
| Nombres de modos de juego | [config/modos.json](config/modos.json) (LoL) y [config/modos_tft.json](config/modos_tft.json) (TFT) | No |
| Colores y estilos | [frontend/src/estilos/index.css](frontend/src/estilos/index.css) | No |

### 🔒 Seguridad de la API Key de Riot (¡Muy importante!)

La API Key de Riot es una credencial privada que **nunca debe subirse al repositorio ni compartirse en público**:
- En GitHub existen bots rastreando commits en tiempo real. Si subes accidentalmente tu key a un repositorio público, será detectada en segundos y Riot la revocará automáticamente por seguridad (pudiendo suspender el acceso a tu cuenta de desarrollador).
- **En local:** La key se guarda **únicamente** en el archivo `.env`. El archivo `.env` ya viene incluido en `.gitignore` para que Git jamás lo suba. Además, el proyecto incluye **gitleaks** configurado en los hooks de `pre-commit`, lo que bloqueará cualquier commit si por error detecta una key.
- **En producción (GitHub Pages):** La key se almacena exclusivamente como un **Environment Secret** (`RIOT_API_KEY_LOL`) dentro de la configuración de GitHub Actions. Los secretos de GitHub viajan cifrados, no se imprimen en los logs y nunca forman parte del código compilado de la web (el chequeo `verificar:build` valida que la web empaquetada no contenga ninguna key ni dato sensible).
- **Tipos de API Keys de Riot:**
  - **Development Key:** Gratuita e instantánea al iniciar sesión en el [Riot Developer Portal](https://developer.riotgames.com/). Caduca cada 24 horas (se renueva con un botón en el portal). Es perfecta para correr el proyecto en tu computador localmente.
  - **Personal API Key:** Gratuita y permanente (no caduca a diario). Se solicita en el portal con **Register Product → Personal API Key** explicando que es una web estilo op.gg para tu grupo cerrado de amigos. Es la key necesaria para dejar la web funcionando 24/7 en GitHub Pages sin tener que renovarla todos los días.

**Servidor:** Si tus amigos juegan en otro servidor diferente a LAS:
- `PLATAFORMA` es el código del servidor (`la1` LAN, `la2` LAS, `br1` Brasil, `na1` Norteamérica, `euw1` Europa Oeste, etc.).
- `REGION` es el grupo continental al que pertenece (`americas` para LAN, LAS, BR y NA; `europe` para EUW, EUNE y TR; `asia` para KR y JP). La lista completa está en la [documentación oficial de Riot](https://developer.riotgames.com/docs/lol#routing-values).

**Amigos:** Edita `config/amigos.json` y escribe cada Riot ID completo con su tag (nombre#tag):

```json
{
  "amigos": [
    "TuNombre#LAS",
    "Amigo Uno#LAS",
    "Amigo Dos#1234"
  ]
}
```

En la siguiente ejecución del recolector aparecerán los amigos configurados y se descargarán sus últimas partidas como carga inicial. Si en el futuro quitas a alguien de la lista, su registro histórico se conserva intacto en la base de datos por si vuelve a jugar con ustedes.

## Correrlo en tu computador

### 1. Requisitos previos

- Git
- Python 3.12 o superior (recomendado 3.14)
- Node.js LTS (versión 20 o 22+, incluye npm)
- Una cuenta en el [Riot Developer Portal](https://developer.riotgames.com/) para obtener tu *Development API Key*.

### 2. Clonar el repositorio y configurar el archivo .env

```bash
git clone https://github.com/JCarvajalLab/LOLSapo.git
cd LOLSapo
cp .env.example .env
```

Abre el archivo `.env` en tu editor y pega tu key obtenida del portal de Riot después del signo `=`:

```text
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
RIOT_API_KEY_TFT=
```

*(Nota: `RIOT_API_KEY_TFT` es opcional; si la dejas vacía, el sistema usa automáticamente la misma key para League of Legends y Teamfight Tactics).*

Recuerda editar [config/amigos.json](config/amigos.json) con los Riot IDs de tu grupo.

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

El cron propio de GitHub Actions es "lo mejor posible": cuando GitHub tiene mucha carga atrasa o salta ejecuciones (a veces pasan horas sin ejecutarse). Por eso el que manda es un [Cloudflare Worker](https://developers.cloudflare.com/workers/) gratuito en [disparador/](disparador/): cada 5 minutos le pide a la API de GitHub que ejecute `publicar.yml`, igual que presionar manualmente **Run workflow**. El cron de GitHub queda solo como respaldo cada 30 minutos.

- **Sin exposición pública:** No tiene URL pública, solo se ejecuta en su horario programado (*Cron Trigger*).
- **Desbloqueo automático:** Antes de lanzar cada publicación, cancela las ejecuciones que GitHub haya dejado trabadas en "esperando" por más de 15 minutos (evita que una ejecución colgada bloquee a las siguientes).
- **Seguridad del Token (`GH_TOKEN`):**
  - Se utiliza un **Fine-grained personal access token** de GitHub con el mínimo privilegio posible:
    1. Ve a **GitHub → Settings → Developer Settings → Personal access tokens → Fine-grained tokens → Generate new token**.
    2. En **Repository access**, elige **Only select repositories** y selecciona únicamente tu repositorio de LOLSapo.
    3. En **Repository permissions**, asigna solo **Actions: Read and write**.
    4. Copia el token generado. No lo pegues en ningún archivo ni commit.
  - Guarda el token de forma cifrada en Cloudflare ejecutando:
    ```powershell
    cd disparador
    npx wrangler secret put GH_TOKEN
    ```
- **Cambiar el intervalo:** Edita `"crons"` en [disparador/wrangler.jsonc](disparador/wrangler.jsonc) y vuelve a publicar (5 minutos es el intervalo óptimo para no exceder los límites de la API de Riot).
- **Monitoreo:** Puedes verificar su funcionamiento en el panel de Cloudflare (**Workers → `lolsapo-disparador` → Logs**) o en la pestaña **Actions → Publicar** de tu repositorio (aparecen como eventos disparados por `workflow_dispatch`).

Publicarlo (desde `disparador/`, una sola vez y cada vez que cambie):

```powershell
npm install
npx wrangler login                 # abre el navegador para autorizar tu cuenta gratuita de Cloudflare
npx wrangler secret put GH_TOKEN   # pega el token cuando lo pida en consola (queda cifrado)
npx wrangler deploy
```

**Renovar el token:** Cuando el token de GitHub venza (según la fecha de expiración que hayas configurado), genera uno nuevo en GitHub con los mismos permisos y actualízalo en Cloudflare con `npx wrangler secret put GH_TOKEN`. Mientras esté vencido, la web no se rompe; simplemente se actualiza con el cron de respaldo de GitHub.

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
