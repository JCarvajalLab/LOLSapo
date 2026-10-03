// Disparador de LOLSapo: un Cloudflare Worker que, cada 5 minutos, le pide a GitHub que
// ejecute el workflow "Publicar" (igual que apretar "Run workflow" a mano).
//
// Existe porque el cron de GitHub Actions es "lo mejor posible": se atrasa o se salta
// ejecuciones. El de Cloudflare es puntual.
//
// - No tiene handler `fetch` ni URL pública: solo corre en el horario de wrangler.jsonc.
// - El token de GitHub vive como secret de Cloudflare (GH_TOKEN) y nunca se imprime.

const API_GITHUB = "https://api.github.com";
const PATRON_REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const PATRON_WORKFLOW = /^[A-Za-z0-9_.-]{1,100}\.ya?ml$/;
const PATRON_RAMA = /^[A-Za-z0-9_./-]{1,100}$/;

export class ErrorDisparador extends Error {}

/** Valida la configuración (variables de wrangler.jsonc y el secret). */
export function configuracion(env) {
  const { REPO, WORKFLOW, RAMA, GH_TOKEN } = env ?? {};
  if (typeof REPO !== "string" || !PATRON_REPO.test(REPO)) {
    throw new ErrorDisparador("REPO inválido (formato esperado: usuario/repo)");
  }
  if (typeof WORKFLOW !== "string" || !PATRON_WORKFLOW.test(WORKFLOW)) {
    throw new ErrorDisparador("WORKFLOW inválido (formato esperado: archivo.yml)");
  }
  if (typeof RAMA !== "string" || !PATRON_RAMA.test(RAMA) || RAMA.includes("..")) {
    throw new ErrorDisparador("RAMA inválida");
  }
  if (typeof GH_TOKEN !== "string" || GH_TOKEN.trim() === "") {
    throw new ErrorDisparador("Falta el secret GH_TOKEN (wrangler secret put GH_TOKEN)");
  }
  return { repo: REPO, workflow: WORKFLOW, rama: RAMA, token: GH_TOKEN.trim() };
}

/** Pide a GitHub que ejecute el workflow. Lanza ErrorDisparador si GitHub no lo acepta. */
export async function disparar(env, fetchFn = fetch) {
  const { repo, workflow, rama, token } = configuracion(env);
  const url = `${API_GITHUB}/repos/${repo}/actions/workflows/${workflow}/dispatches`;
  let respuesta;
  try {
    respuesta = await fetchFn(url, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "LOLSapo-disparador",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: rama }),
      // Sin seguir redirecciones: no reenviar el token a otro sitio.
      redirect: "manual",
    });
  } catch (error) {
    // Solo el tipo de error: el mensaje podría incluir detalles de la petición.
    throw new ErrorDisparador(`No se pudo contactar a GitHub (${error?.name ?? "Error"})`);
  }
  if (respuesta.status >= 200 && respuesta.status < 300) {
    console.log(`Publicar lanzado en ${repo} (rama ${rama})`);
    return respuesta.status;
  }
  // 401: token vencido o revocado. 403/404: el token no tiene permiso de Actions sobre el repo.
  throw new ErrorDisparador(`GitHub respondió ${respuesta.status} al lanzar ${workflow}`);
}

export default {
  // Cloudflare llama a esta función según "triggers.crons" de wrangler.jsonc. Si lanza un
  // error, la ejecución queda marcada como fallida en el panel de Cloudflare.
  async scheduled(_controlador, env) {
    await disparar(env);
  },
};
