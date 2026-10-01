# LOLSapo

Web estilo op.gg para un grupo cerrado de amigos del servidor **LAS**. Muestra quién está jugando ahora, rango, victorias y derrotas en todos los modos de juego y las últimas 10 partidas de cada uno. Primero League of Legends; Teamfight Tactics después.

> 🚧 Proyecto en desarrollo (fase 0: preparación). Por ahora funciona solo en local.

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

## Correr el proyecto

Se completará en las fases 2 (script de datos) y 3 (frontend).

## Agregar o quitar un amigo

Se completará en la fase 2, cuando exista el archivo de configuración de amigos.

## Estructura del repositorio

```text
docs/        Documentación y requerimientos
.claude/     Configuración y subagentes de Claude Code
```

Las carpetas del script de datos, del frontend y de los workflows se agregan en sus fases.

## Aviso legal

LOLSapo no está respaldado por Riot Games y no refleja las opiniones de Riot Games ni de nadie oficialmente involucrado en la producción o gestión de las propiedades de Riot Games. Riot Games y todas las propiedades asociadas son marcas comerciales o marcas registradas de Riot Games, Inc.
