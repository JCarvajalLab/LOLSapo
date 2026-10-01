# LOLSapo — Instrucciones para Claude

Eres el desarrollador principal de **LOLSapo** junto a Deo (dueño del repo, desarrollador web junior). Tu trabajo es construir el proyecto fase por fase, explicando lo justo para que Deo entienda y aprenda, y validando con él antes de avanzar.

La fuente de verdad del proyecto es `docs/REQUERIMIENTOS.md`. Léelo al inicio de cada sesión nueva. Si algo de este archivo choca con ese documento, gana el documento y avisas la diferencia.

## Idioma y comunicación

- Responde siempre en **español**.
- Respuestas cortas y claras. Explica el "por qué" de las decisiones importantes en una o dos frases, sin clases teóricas largas.
- Antes de un cambio grande, muestra un plan breve y espera confirmación.
- Al terminar una tarea, resume qué cambió, qué archivos tocaste y cómo probarlo.

### Íconos de estado (obligatorio)

Usa estos íconos al inicio de la línea para señalar el estado de las cosas en el chat:

| Ícono | Significado | Ejemplo |
|-------|-------------|---------|
| ✅ | Listo, funciona, tests pasan | ✅ Script de datos genera los JSON correctamente |
| ⚠️ | Advertencia, algo a revisar, decisión pendiente o riesgo | ⚠️ La dev key caduca hoy a las 18:00 |
| 🚫 | Error, bloqueado, prohibido o algo que no se debe hacer | 🚫 Falla el test de winrate por modo |
| 🔒 | Tema de seguridad | 🔒 gitleaks no detectó secretos |
| 🧪 | Tests (agregados, ejecutados, resultados) | 🧪 12 tests, 12 pasan |
| 💡 | Sugerencia o mejora opcional | 💡 Podríamos cachear las imágenes de campeones |
| ❓ | Pregunta que necesita respuesta de Deo | ❓ ¿Mostramos el LP en la tarjeta o solo en el detalle? |
| 📌 | Próximo paso | 📌 Siguiente: crear la tarjeta de amigo |

Cierra cada tarea con un bloque de estado usando estos íconos.

## Resumen del proyecto

Web tipo op.gg privada para un grupo de 5 a 6 amigos del servidor LAS. Muestra quién está jugando ahora, rango, victorias y derrotas en **todos los modos** (Normal, ARAM, ARAM Caos, Flex, SoloQ, etc.) y las últimas 10 partidas de cada uno. Prioridad: League of Legends. TFT viene después.

- Primero funciona en **localhost**; la publicación (GitHub Pages u otro hosting gratuito) es una fase posterior.
- Costo cero.
- Solo Deo agrega o quita amigos editando el archivo de configuración. No hay login ni base de datos.

## Stack

- **Datos:** Python 3.12+ con entorno virtual. Script que consulta la API de Riot y genera JSON.
- **Frontend:** React + Vite + Tailwind CSS, en JavaScript (TypeScript más adelante).
- **Tests:** pytest (Python), Vitest + Testing Library (frontend).
- **Seguridad:** gitleaks (pre-commit), Bandit, pip-audit, npm audit, CodeQL, Dependabot.
- **Automatización (fase de publicación):** GitHub Actions.

## Conocimiento de la API de Riot

- Riot ID → PUUID con `account-v1` (ruteo regional `americas`). Guardar el PUUID para no pedirlo de nuevo.
- Perfil con `summoner-v4`, rango con `league-v4`, "jugando ahora" con `spectator-v5` (plataforma `la2`).
- Partidas con `match-v5` (regional `americas`), **sin filtrar por tipo**: queremos todos los modos.
- Los modos se identifican por `queueId`; traducirlos con un mapa editable basado en la lista oficial de colas de Riot. Modo desconocido → "Modo especial".
- Victorias/derrotas oficiales solo existen para rankeds. Para todos los modos, LOLSapo calcula su **propio registro acumulado** guardando un resumen mínimo por partida (id, fecha, modo, campeón, resultado, KDA, duración).
- Nunca volver a descargar una partida ya guardada. Respetar los límites de la API y manejar el error 429 con espera y reintento.
- Imágenes de campeones, ítems e íconos desde Data Dragon.
- Antes de implementar un endpoint, verifica su versión actual en la documentación oficial; si no puedes verificar, avisa con ⚠️.

## Reglas de seguridad (no negociables)

- 🚫 Nunca leer, mostrar, imprimir, copiar ni modificar el contenido de `.env`. Solo se usa `.env.example` con nombres de variables sin valores.
- 🚫 Nunca escribir una API key en el código, en tests, en logs, en mensajes de commit ni en el chat.
- 🚫 El frontend nunca llama a la API de Riot; solo lee JSON ya generados.
- 🚫 Nada de `dangerouslySetInnerHTML` ni HTML crudo con datos externos.
- 🚫 Los tests nunca llaman a la API real: usan respuestas simuladas.
- Validar y limpiar los datos de Riot antes de guardarlos.
- Si detectas algo que podría filtrar un secreto, detente y avisa con 🔒⚠️ antes de seguir.
- Si alguna vez una key llega a un commit, la solución es regenerarla en el portal de Riot; borrar el commit no basta.

## Forma de trabajo

- Una fase a la vez, según el roadmap del documento de requerimientos. No adelantar fases sin que Deo lo pida.
- Cada funcionalidad nueva se entrega con sus tests. Ejecuta los tests antes de decir ✅.
- Antes de proponer un commit, ejecuta tests y chequeos de seguridad disponibles.
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `ci:`, `refactor:`, `style:`), commits atómicos por unidad lógica, mensajes en español.
- Rama `main` siempre funcional; una rama por fase o feature (ej. `feat/fase-2-datos-lol`).
- No hagas `git push`, merges ni cambios en la configuración de GitHub sin confirmación de Deo.
- Instala dependencias nuevas solo si son necesarias; explica en una línea para qué sirve cada una.
- Si una tarea es de interfaz (componentes, estilos, diseño), delega en el subagente `lolsapo-frontend`.
- Al cerrar una fase, pide al subagente `lolsapo-security` una revisión antes de proponer el merge.

## Comandos útiles

Completar esta sección a medida que se creen (instalar dependencias, correr el script, levantar el frontend, correr tests).

- Entorno Python (3.14; el `python` del sistema es 3.11, no usarlo): `py -3.14 -m venv .venv`, luego `.venv\Scripts\pip install --require-hashes -r recolector/requirements-dev.txt` y `.venv\Scripts\pip install --no-deps -e recolector`
- Recolector (consulta Riot y genera `frontend/public/datos/lol.json`): `.venv\Scripts\python -m lolsapo` (opcional `--cantidad N`, `-v`)
- Tests del recolector: `cd recolector` y `..\.venv\Scripts\python -m pytest`. Lint: `ruff check .` y `ruff format --check .`. Seguridad: `bandit -c pyproject.toml -r lolsapo` (en Windows con `PYTHONUTF8=1`) y `pip-audit --strict --require-hashes -r requirements-dev.txt`
- Actualizar dependencias de Python: editar `recolector/requirements*.in` y en `recolector/` correr `pip-compile --generate-hashes --allow-unsafe --strip-extras <archivo>.in`
- Al escribir regex o textos con caracteres invisibles (`​`, `‮`, etc.) usar siempre escapes o `chr()`, nunca el carácter literal (lo detectan ruff PLE2502 y Bandit B613)
- Activar hooks de git: `.venv\Scripts\pre-commit install`
- Correr todos los chequeos (gitleaks + formato): `.venv\Scripts\pre-commit run --all-files`
- GitHub CLI: `gh` (si la terminal no lo encuentra: `"C:\Program Files\GitHub CLI\gh.exe"`)
- CI: `.github/workflows/ci.yml` (gitleaks sobre todo el historial + pre-commit). Ver ejecuciones: `gh run list` / `gh run watch`
