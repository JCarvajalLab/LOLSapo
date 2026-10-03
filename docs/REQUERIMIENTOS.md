# LOLSapo — Documento base de requerimientos

> Versión 0.4 · Estado: requerimientos validados, listo para crear el repo
> Desarrollo: asistido con Claude (Claude Code en VS Code)
> Repositorio: `LOLSapo` (público) · Dueño: JCarvajalLab

---

## 1. Visión

LOLSapo es una web estilo op.gg pensada solo para un grupo cerrado de amigos (máximo 5 a 6 personas). Al entrar se ve de un vistazo quién está jugando ahora, cómo le ha ido a cada uno en **todos los modos de juego** (normales, ARAM, Flex, SoloQ, etc.) y sus últimas 10 partidas, tanto en League of Legends como en Teamfight Tactics.

No busca competir con op.gg: busca ser simple, gratis de mantener y entretenida para el grupo.

## 2. Definiciones confirmadas

| # | Definición | Estado |
|---|-----------|--------|
| D1 | Juego principal: **League of Legends** | Confirmado |
| D2 | Juego secundario: **Teamfight Tactics (TFT)**. Prioridad: LoL primero, TFT después | Confirmado |
| D3 | Servidor de todos los amigos: **LAS** (plataforma `la2`, región `americas`) | Confirmado |
| D4 | Tamaño del grupo: **máximo 5 a 6 personas** | Confirmado |
| D5 | Solo el dueño del repo agrega o quita amigos; no hay registro ni login | Confirmado |
| D6 | "Jugando ahora" puede tener retraso de algunos minutos | Confirmado |
| D7 | Primero se desarrolla y prueba en **localhost**; la publicación (GitHub Pages u otro hosting gratuito) queda para una fase posterior | Confirmado |
| D8 | Historial: **máximo 10 partidas** por amigo y por juego | Confirmado |
| D9 | Nombre del proyecto: **LOLSapo** | Confirmado |
| D10 | Se registran partidas de **todos los modos** (Normal, ARAM, ARAM Caos u otros modos rotativos, Flex, SoloQ, etc.), no solo rankeds, identificando el modo de cada una | Confirmado |
| D11 | El código incluye **pruebas de seguridad y tests automatizados** desde el inicio, aunque sea un proyecto personal | Confirmado |
| D12 | El repo se conecta a GitHub desde el día 1 para registrar avances, aunque la web aún no esté publicada | Confirmado |
| D13 | Se desarrolla en **VS Code con Claude Code** | Confirmado |

## 3. Alcance

### 3.1 MVP — versión 1 (solo LoL)

- Lista de amigos definida en un archivo de configuración del repo.
- Página principal con una tarjeta por amigo: ícono, Riot ID, nivel, rango Solo/Duo y Flex, y registro general de victorias, derrotas y winrate considerando todos los modos.
- Desglose de victorias y derrotas por modo de juego (Normal, ARAM, ARAM Caos, Flex, SoloQ, etc.).
- Etiqueta visible del modo en cada partida, diferenciando rankeds de no rankeds.
- Indicador "jugando ahora" por amigo, con campeón y tiempo aproximado de partida.
- Página de detalle por amigo con sus últimas 10 partidas (campeón, KDA, resultado, duración, modo, hace cuánto se jugó).
- Ranking interno del grupo.
- Marca visible de "última actualización".
- Diseño responsivo y modo oscuro.

### 3.2 Versión 2 (TFT)

- Rango TFT, victorias, derrotas y top 4 por amigo.
- Últimas 10 partidas de TFT (posición final, composición/rasgos principales, nivel).
- Indicador "jugando TFT ahora".
- Selector LoL / TFT en la interfaz.

### 3.3 Ideas para después

- Gráficos de evolución de LP.
- "Highlights" del grupo: rachas, MVP de la semana, peor partida, etc.
- Estadísticas de dúo: con quién gana más cada uno.
- Campeones más jugados y maestría.
- Estado en vivo en tiempo real mediante un proxy.

### 3.4 Explícitamente NO vamos a hacer

- Búsqueda abierta de cualquier jugador.
- Cuentas de usuario, login o base de datos.
- Exponer la API key de Riot en el navegador o en el código.
- Gastar dinero en hosting o dominio en esta etapa.

## 4. Requerimientos funcionales

| ID | Requerimiento | Versión |
|----|---------------|---------|
| RF-01 | Leer la lista de amigos (Riot ID `nombre#tag`) desde un archivo de configuración. | 1 |
| RF-02 | Obtener y guardar el PUUID de cada amigo para no pedirlo de nuevo. | 1 |
| RF-03 | Mostrar perfil básico: ícono, nivel, Riot ID. | 1 |
| RF-04 | Mostrar rango y LP oficiales de Solo/Duo y Flex. | 1 |
| RF-05 | Mostrar las últimas 10 partidas de LoL por amigo, de cualquier modo, con la etiqueta del modo. | 1 |
| RF-15 | Registrar todas las partidas de todos los modos y calcular victorias, derrotas y winrate en total y por modo. | 1 |
| RF-16 | Traducir cada modo a un nombre legible en español a partir del identificador de cola (`queueId`) de Riot, con un nombre genérico para modos desconocidos o nuevos. | 1 |
| RF-17 | Permitir filtrar el historial y las estadísticas por modo (Todos / Rankeds / Normales / ARAM / Otros). | 1 |
| RF-06 | Indicar si un amigo está en partida, con campeón y tiempo aproximado. | 1 |
| RF-07 | Mostrar ranking interno del grupo. | 1 |
| RF-08 | Mostrar fecha y hora de la última actualización. | 1 |
| RF-09 | Usar imágenes oficiales (Data Dragon) para campeones, ítems e íconos. | 1 |
| RF-10 | Mostrar estado vacío o de error por amigo sin romper la página. | 1 |
| RF-11 | Mostrar rango y W/L de TFT por amigo. | 2 |
| RF-12 | Mostrar las últimas 10 partidas de TFT por amigo. | 2 |
| RF-13 | Indicar si un amigo está jugando TFT. | 2 |
| RF-14 | Permitir cambiar la vista entre LoL y TFT. | 2 |

## 5. Requerimientos no funcionales

| ID | Requerimiento |
|----|---------------|
| RNF-01 | Costo cero de hosting, ejecución y dominio. |
| RNF-02 | La API key vive solo como *secret* de GitHub y en un archivo local ignorado por git. |
| RNF-03 | No volver a descargar partidas que ya están guardadas (respetar límites de la API). |
| RNF-04 | La página principal carga en menos de 2 segundos. |
| RNF-05 | Interfaz en español, responsiva, modo oscuro, estética tipo op.gg. |
| RNF-06 | Aviso legal visible: proyecto no respaldado por Riot Games. |
| RNF-07 | Conventional Commits y commits atómicos. |
| RNF-08 | README con instrucciones para correr el proyecto y para agregar o quitar un amigo. |
| RNF-09 | El proyecto funciona completo en localhost antes de publicarse. |
| RNF-10 | Ningún cambio llega a `main` sin pasar los tests y los chequeos de seguridad (ver sección 7). |
| RNF-11 | Existe un archivo `CLAUDE.md` en la raíz con el contexto del proyecto, convenciones y reglas para Claude Code. |

## 6. Arquitectura

### 6.1 Restricción clave

GitHub Pages solo sirve archivos estáticos y no puede guardar secretos. La API de Riot exige una key secreta, así que la web no puede llamar a Riot directamente.

### 6.2 Modo local (primera etapa)

1. El script de Python se ejecuta a mano desde la terminal de VS Code, leyendo la API key desde un archivo `.env` local que nunca se sube a git.
2. Genera los JSON en una carpeta local.
3. El frontend corre con el servidor de desarrollo de Vite en `localhost` y lee esos JSON.
4. Los avances se suben a GitHub igual, pero sin publicar la web ni activar la automatización.

Este modo usa la *development key* de Riot sin problema, porque no hay nada público.

### 6.3 Arquitectura de publicación (etapa posterior)

1. Un script en Python se ejecuta automáticamente con **GitHub Actions** cada 10 minutos aprox.
2. Consulta la API de Riot usando la key guardada como *secret*.
3. Genera archivos JSON con los datos de cada amigo.
4. Construye el frontend y publica todo en GitHub Pages usando el flujo oficial de despliegue (sin hacer commits automáticos al repo).
5. La web solo lee esos JSON.

Con 6 amigos, el volumen de llamadas por ejecución es bajo, sobre todo si solo se piden las partidas nuevas.

### 6.3.1 Registro acumulado de partidas

La API de Riot solo entrega victorias y derrotas totales para rankeds. Para normales, ARAM y otros modos no existe un contador oficial, así que **LOLSapo construye su propio registro**: cada vez que corre el script guarda un resumen de las partidas nuevas y recalcula las estadísticas.

- El registro cuenta desde que LOLSapo empieza a seguir a cada amigo (no es retroactivo a toda su historia; se puede hacer una carga inicial de las partidas recientes disponibles).
- El resumen guardado por partida es mínimo: id, fecha, modo, campeón, resultado, KDA y duración. Así el archivo se mantiene liviano.
- En modo local el registro es un archivo en tu equipo (ignorado por git). Al publicar, como el deploy no hace commits al código, el registro se guarda en una **rama separada de datos** (ej. `data`) que solo actualiza la automatización. Así `main` queda limpio y el historial no se pierde entre ejecuciones.
- La web muestra las 10 partidas más recientes, pero las estadísticas usan todo el registro.

**Sobre "jugando ahora":** con ejecuciones cada ~10 minutos, el indicador aparecerá dentro de los primeros minutos de partida. Como una partida de LoL dura en promedio 25 a 35 minutos, es suficiente para el MVP.

### 6.4 Evolución posible

Si más adelante se quiere tiempo real, se agrega un proxy serverless gratuito solo para el estado "jugando ahora", manteniendo el resto con GitHub Actions.

## 7. Seguridad y testing

Aunque sea un proyecto personal, el repo es público y maneja una API key. El objetivo es que nada sensible se filtre y que un cambio no rompa el sitio.

### 7.1 Amenazas que cubrimos

| Amenaza | Cómo se previene |
|---------|-----------------|
| Filtración de la API key en un commit | `.env` en `.gitignore` desde el primer commit, escáner de secretos antes de cada commit (gitleaks vía pre-commit) y *secret scanning* + *push protection* de GitHub activados. |
| Key visible en el navegador | La web nunca llama a Riot; solo lee JSON ya generados. Test que verifica que los JSON y el build no contienen la key. |
| Key impresa en logs de GitHub Actions | Usar solo GitHub Secrets, nunca imprimir variables de entorno, permisos mínimos en los workflows. |
| Inyección de contenido (XSS) a través de nombres o datos externos | React escapa el texto por defecto; prohibido usar HTML crudo (`dangerouslySetInnerHTML`); *Content Security Policy* en el HTML; validar los datos de Riot antes de guardarlos. |
| Dependencias vulnerables | `pip-audit` (Python), `npm audit` (frontend) y Dependabot activado en GitHub. |
| Código inseguro en Python | Análisis estático con Bandit. |
| Código inseguro en general | CodeQL de GitHub (gratis en repos públicos). |
| Workflows de Actions manipulables | Acciones de terceros fijadas a versión, permisos `read` por defecto, sin ejecutar código de forks con secretos. |
| Abuso o bloqueo de la key por exceso de llamadas | Respetar límites de la API, reintentos con espera, no volver a pedir partidas guardadas. |

### 7.2 Tests funcionales

- **Python (pytest):** traducción de `queueId` a modo, cálculo de victorias/derrotas/winrate por modo, detección de partidas nuevas vs. ya guardadas, manejo de errores de la API (404, 429, 5xx). Las respuestas de Riot se simulan con datos de ejemplo: los tests nunca llaman a la API real ni necesitan la key.
- **Frontend (Vitest + Testing Library):** las tarjetas y el historial se muestran bien con datos completos, vacíos o con error; los filtros por modo funcionan.

### 7.3 Cuándo corren

- **Antes de cada commit (local):** pre-commit con gitleaks, formateo y linters.
- **En cada push / pull request (GitHub Actions):** tests de Python y frontend, Bandit, pip-audit, npm audit y CodeQL.
- **Regla:** si algo falla, no se hace merge a `main`.

### 7.4 Ajuste mientras el repo sea privado (decisión del 2026-10-01)

El repo se mantiene **privado** por ahora. En el plan gratuito eso significa:

- No hay *secret scanning* ni *push protection* de GitHub, ni CodeQL. La defensa contra filtraciones es gitleaks en pre-commit (local) más gitleaks sobre todo el historial en CI.
- No se puede exigir por configuración que el CI pase antes del merge a `main`. La regla RNF-10 se cumple a mano: revisar `gh pr checks` antes de cada merge.
- Sí están activados Dependabot (alertas, actualizaciones de seguridad y versiones).

Al hacer público el repo (a más tardar en la fase 5, por GitHub Pages) hay que activar secret scanning, push protection, CodeQL y la protección de rama de `main` con el CI como requisito.

**Actualización 2026-10-02 (fase 5):** el repo ya es **público**. Están activos secret scanning, push protection, CodeQL (configuración por defecto), aprobación obligatoria de workflows para contribuidores externos y dos rulesets: `main` (PR obligatorio con los 3 checks del CI, sin force push ni borrado) y `datos` (sin force push ni borrado). La publicación usa la *Personal API Key* como secret `RIOT_API_KEY_LOL` del environment `produccion`, limitado a `main`, y se enciende con la variable `PUBLICAR_ACTIVO`.

## 8. Entorno de desarrollo (qué instalar)

### 8.1 Programas base

| Herramienta | Para qué |
|-------------|----------|
| Git | Control de versiones y conexión con GitHub. |
| VS Code (1.98 o superior) | Editor principal. |
| Python 3.12 o superior | Script de datos y tests. |
| Node.js LTS (incluye npm) | Frontend con React + Vite. |
| GitHub CLI (`gh`) — opcional | Crear el repo, PRs y revisar Actions desde la terminal. |

### 8.2 Extensiones de VS Code

| Extensión | Para qué |
|-----------|----------|
| Claude Code (Anthropic) | Desarrollo asistido con Claude dentro del editor. |
| Python + Pylance | Soporte de Python. |
| ESLint | Errores y malas prácticas en JavaScript. |
| Prettier | Formato de código consistente. |
| Tailwind CSS IntelliSense | Autocompletado de clases de Tailwind. |
| GitLens — opcional | Ver historial y autores de cada línea. |

### 8.3 Herramientas que se instalan dentro del proyecto

Estas no se instalan a mano en el sistema; quedan declaradas en el proyecto y se instalan con un comando cuando lleguemos a cada fase:

- **Python (en un entorno virtual):** cliente HTTP o librería de Riot, pytest, Bandit, pip-audit, pre-commit, python-dotenv.
- **Frontend (npm):** React, Vite, Tailwind CSS, Vitest, Testing Library, ESLint.

### 8.4 Cuentas necesarias

- **GitHub** (ya existe: JCarvajalLab).
- **Riot Developer Portal** con tu cuenta de Riot, para obtener la dev key.
- **Claude** con un plan que incluya Claude Code (la extensión es gratis, pero su uso requiere un plan pago o créditos de API).

### 8.5 Archivo `CLAUDE.md`

En la raíz del repo va un `CLAUDE.md` que Claude Code lee al iniciar cada sesión. Contendrá: resumen del proyecto, stack, estructura de carpetas, Conventional Commits, reglas de seguridad (nunca tocar `.env`, nunca imprimir la key, no usar HTML crudo) y la instrucción de trabajar fase por fase validando antes de avanzar.

## 9. Hosting y dominio gratuitos (etapa de publicación)

| Opción | URL resultante | Comentario |
|--------|---------------|-----------|
| **GitHub Pages** (elegida) | `jcarvajallab.github.io/LOLSapo` | Todo en un solo lugar con el repo y las Actions. Requiere repo público en el plan gratis. |
| Cloudflare Pages | `lolsapo.pages.dev` | Alternativa gratuita con URL más corta, y Cloudflare Workers (proxy en vivo) en la misma cuenta. Buena opción si más adelante se quiere el tiempo real. |
| Netlify / Vercel | `lolsapo.netlify.app` / `lolsapo.vercel.app` | También gratuitos; funcionan igual para un sitio estático. |

**Dominio:** por ahora se usa el subdominio gratuito del hosting. Un dominio propio (ej. `.cl` o `.com`) tiene costo anual y queda para cuando haya presupuesto; cualquiera de estos hostings permite conectarlo después sin rehacer nada.

## 10. Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite (JavaScript; TypeScript más adelante) |
| Estilos | Tailwind CSS |
| Recolección de datos | Python 3 |
| Cliente Riot | Librería comunitaria de Python o `requests` directo (evaluar en fase 1) |
| Tests | pytest (Python), Vitest + Testing Library (frontend) |
| Seguridad | gitleaks, Bandit, pip-audit, npm audit, CodeQL, Dependabot |
| Automatización y deploy | GitHub Actions |
| Recursos visuales | Data Dragon (LoL) y recursos estáticos de TFT |
| Hosting | localhost primero; luego GitHub Pages (o alternativa gratuita) |

## 11. Datos que necesitamos de Riot

### League of Legends

| Para qué | Endpoint (referencia) | Ruteo |
|----------|----------------------|-------|
| Riot ID → PUUID | `account-v1` · by-riot-id | `americas` |
| Nivel e ícono | `summoner-v4` · by-puuid | `la2` |
| Rango, LP, W/L | `league-v4` · entries by puuid | `la2` |
| Partidas de todos los modos | `match-v5` · ids (sin filtro de tipo) + detalle | `americas` |
| Nombres de modos | Lista oficial de colas (`queues.json` en los datos estáticos de Riot) | Estático |
| ¿Está jugando? | `spectator-v5` · active-games by puuid | `la2` |

### TFT (versión 2)

| Para qué | Endpoint (referencia) | Ruteo |
|----------|----------------------|-------|
| Rango y W/L | `tft-league-v1` | `la2` |
| Últimas 10 partidas | `tft-match-v1` · ids + detalle | `americas` |
| ¿Está jugando? | `spectator-tft-v5` · active-games by puuid | `la2` |

Verificar cada endpoint en el portal oficial antes de implementarlo.

**Implementación (fase 6, 2026-10-03):** rango con `tft-league-v1` · `/tft/league/v1/by-puuid/{puuid}`; ícono y nivel con `tft-summoner-v1` · by-puuid. La *development key* no tiene acceso a `spectator-tft-v5` (responde 403), así que "jugando TFT" usa como respaldo `spectator-v5` de LoL, que también devuelve las partidas de TFT (mapa 22). Si la key no tiene acceso a TFT, `tft.json` se genera con los últimos datos y un aviso, sin afectar a LoL. Secret opcional `RIOT_API_KEY_TFT` en el environment `produccion`; si no existe, TFT usa la key de LoL. Además de lo pedido: ícono y nivel, filtros por modo, orden de amigos por partidas jugadas y grilla de posición en las últimas 30 partidas.

## 12. API key de Riot

1. **Desarrollo local:** usar la *development key* del portal, guardada en `.env`. Caduca cada 24 horas (se renueva desde el portal) y no se puede usar en el sitio publicado.
2. **Publicación:** registrar LOLSapo en el portal y pedir una *Personal API Key*, describiendo que es un sitio para un grupo cerrado de 5–6 amigos e incluyendo **LoL y TFT** en el registro. La aprobación toma alrededor de dos semanas, por eso se pide en la fase 0.
3. **Validar:** las personal keys están orientadas a uso personal y no a productos públicos; dejar el propósito muy claro en la solicitud.

## 13. Roadmap

| Fase | Objetivo | Entregable |
|------|----------|------------|
| 0 | Preparación | Herramientas instaladas, repo `LOLSapo` en GitHub, README, `CLAUDE.md`, `.gitignore`, este documento en `/docs`, cuenta en portal Riot. |
| 1 | Base de seguridad | pre-commit con gitleaks, secret scanning y push protection activados, Dependabot, workflow de CI vacío listo para recibir tests. |
| 2 | Datos LoL (local) | Script Python que genera JSON con dev key, registro acumulado, mapa de modos, tests con pytest. |
| 3 | Interfaz LoL (local) | Frontend React en localhost: tarjetas, detalle, historial de 10 partidas, filtros por modo, ranking, tests con Vitest. |
| 4 | Pulido local | Estados de error y carga, modo oscuro, responsive, aviso legal, CSP. |
| 5 | Publicación | Solicitud de Personal Key, GitHub Actions programado, rama `datos`, deploy a GitHub Pages o alternativa. ✅ Completa (2026-10-02). |
| 6 | TFT | Datos e interfaz de TFT, selector LoL/TFT, sus tests. ✅ Completa (2026-10-03). |
| 7 | Extras | Highlights, gráficos de LP, dúos, evaluar proxy para tiempo real. |

Los tests y chequeos de seguridad no son una fase aparte: cada fase desde la 2 entrega su código con sus tests. Cada fase se cierra validando que funciona antes de pasar a la siguiente.

**Nota:** la solicitud de la Personal Key tarda unas dos semanas; conviene enviarla cuando la fase 3 esté funcionando, para tener algo concreto que describir.

## 14. Organización del repositorio

- Repo **público** (necesario para GitHub Pages gratis y para CodeQL y secret scanning gratuitos). Público desde el 2026-10-02; ver sección 7.4.
- Rama `main` siempre funcional; una rama por fase (`feat/fase-1-datos-lol`).
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`).
- Carpetas separadas para script de datos, frontend, workflows y documentación.
- `.gitignore` desde el primer commit, incluyendo `.env`, entornos virtuales, `node_modules` y los datos locales.
- `.env.example` con los nombres de las variables, sin valores reales.

## 15. Referencias

- **Winny45/league_friends_dashboard** — Dashboard de amigos con script Python que genera JSON; referencia principal de estructura e ideas.
- **CommunityDragon/awesome-league** — Lista curada del ecosistema de APIs de League.
- **Riot Developer Portal** — Documentación oficial, políticas y keys.
- **Documentación comunitaria** (riot-api-libraries.readthedocs.io / hextechdocs.dev) — FAQ, librerías, ruteo.
- **Data Dragon** — Recursos estáticos oficiales.

## 16. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Riot no aprueba la personal key | LOLSapo sigue funcionando en local con dev key. |
| Subir la key por error a GitHub | gitleaks + push protection; si pasa, regenerar la key en el portal de inmediato (borrar el commit no basta). |
| Código generado con IA con errores o vulnerabilidades | Revisar cada cambio antes de aceptarlo, tests obligatorios y chequeos automáticos en CI. |
| GitHub desactiva los workflows programados en repos públicos sin actividad por 60 días | Mantener actividad en el repo o reactivar el workflow manualmente. |
| Retrasos en los cron de Actions | Aceptado para el MVP; proxy en fase 6 si molesta. |
| Datos de amigos en repo público | Los Riot ID son públicos, pero pedir permiso a cada amigo. |
| Cambios de versión en la API de Riot | Centralizar llamadas en un solo módulo del script. |
| Modos rotativos nuevos (ej. variantes de ARAM) con `queueId` que aún no conocemos | Mapa de modos en un archivo editable y nombre genérico "Modo especial" por defecto. |
| El registro acumulado crece con el tiempo | Guardar solo el resumen por partida; con 6 amigos el tamaño es manejable por años. |
| Si se pierde la rama de datos se pierde el registro | No borrarla nunca; respaldarla de vez en cuando. |

## 17. Preguntas abiertas

Ninguna bloqueante. Por definir durante el desarrollo: estética exacta (paleta, logo de LOLSapo) y qué "highlights" queremos.
