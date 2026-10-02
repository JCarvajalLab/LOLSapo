import { describe, expect, it } from "vitest";
import { CSP, DIRECTIVAS_CSP, insertarCsp, pluginCsp } from "../../scripts/csp.mjs";

describe("Content Security Policy", () => {
  it("no permite inline ni eval", () => {
    expect(CSP).not.toMatch(/unsafe-inline|unsafe-eval/);
  });

  it("solo permite lo que la web usa", () => {
    expect(CSP).toBe(
      "default-src 'none'; script-src 'self'; style-src 'self'; " +
        "img-src 'self' data: https://ddragon.leagueoflegends.com; font-src 'self'; connect-src 'self'; " +
        "base-uri 'none'; form-action 'none'; object-src 'none'",
    );
    expect(DIRECTIVAS_CSP["img-src"]).toContain("https://ddragon.leagueoflegends.com");
    expect(DIRECTIVAS_CSP["connect-src"]).toEqual(["'self'"]);
  });

  it("se aplica solo al construir", () => {
    const plugin = pluginCsp();
    expect(plugin.apply).toBe("build");
    expect(plugin.transformIndexHtml.handler).toBe(insertarCsp);
  });

  it("inserta la meta justo después del charset, antes de scripts", () => {
    const html = '<head>\n    <meta charset="UTF-8" />\n    <script type="module" src="./a.js"></script>\n</head>';
    const resultado = insertarCsp(html);
    const posCsp = resultado.indexOf('http-equiv="Content-Security-Policy"');
    expect(posCsp).toBeGreaterThan(resultado.indexOf("charset"));
    expect(posCsp).toBeLessThan(resultado.indexOf("<script"));
    expect(resultado).toContain(`content="${CSP}"`);
  });

  it("falla si el index.html cambió y no encuentra dónde insertarla", () => {
    expect(() => insertarCsp("<head></head>")).toThrow("charset");
  });
});
