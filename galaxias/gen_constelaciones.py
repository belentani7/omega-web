# -*- coding: utf-8 -*-
"""Genera las 5 páginas de constelación (nivel 1) desde GALAXIAS.json.

Cada constelación agrupa sus 10 galaxias, con contexto narrativo real
(firma, función, color) y navegación: Universo / Índice / siguiente constelación.
Uso: python gen_constelaciones.py
"""
import json
import os
import re

OUT = "constelaciones"


def titulo_galaxia(path):
    html = open(path, encoding="utf-8").read()
    m = re.search(r"<title>GALAXIA\s+(\d+)\s*·\s*([^—|]+)\s*—\s*([^|<]+)", html)
    if not m:
        return None
    return int(m.group(1)), m.group(2).strip(), m.group(3).strip()


PAGE = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo} · Universo Belentani</title>
<meta name="description" content="{titulo} — constelación del universo Belentani. Función: {funcion}. 10 galaxias narrativas.">
<meta name="generator" content="belentani-universe">
<style>
:root{{--bg:#0b0a09;--bg2:#131110;--ink:#f4efe7;--dim:#a89f92;--accent:{color};--line:rgba(244,239,231,.14);--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;--sans:ui-sans-serif,"Segoe UI",Inter,system-ui,sans-serif;--mono:ui-monospace,"Cascadia Mono",Consolas,monospace;--measure:62ch;--radius:14px}}
*{{box-sizing:border-box}}
html{{scroll-behavior:smooth}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.65;-webkit-font-smoothing:antialiased}}
.wrap{{max-width:1080px;margin:0 auto;padding:0 clamp(18px,4vw,40px)}}
a{{color:var(--accent)}}
a:focus-visible{{outline:3px solid var(--accent);outline-offset:3px;border-radius:6px}}
.skip{{position:absolute;left:-9999px;top:0;background:var(--accent);color:#12100e;padding:10px 16px;z-index:9}}
.skip:focus{{left:12px;top:12px}}
header.site{{border-bottom:1px solid var(--line);padding:22px 0;display:flex;gap:16px;align-items:baseline;justify-content:space-between;flex-wrap:wrap}}
.brand{{font-family:var(--serif);font-size:1.05rem}}
.brand span{{color:var(--dim)}}
nav.site{{display:flex;gap:16px;font-family:var(--mono);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase}}
nav.site a{{color:var(--dim);text-decoration:none}}
nav.site a:hover,nav.site a[aria-current=page]{{color:var(--ink)}}
main{{padding:clamp(48px,9vh,104px) 0}}
.eyebrow{{font-family:var(--mono);font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin:0 0 14px}}
h1{{font-family:var(--serif);font-size:clamp(2.4rem,7vw,5.2rem);line-height:.95;letter-spacing:-.03em;margin:0 0 20px;font-weight:600}}
.lead{{font-size:clamp(1.05rem,2vw,1.28rem);color:var(--dim);max-width:56ch;margin:0 0 2rem}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;margin:2rem 0}}
.cell{{background:var(--bg2);padding:1.4rem 1.2rem;text-decoration:none;color:var(--ink)}}
.cell h3{{font-size:1rem;margin:0 0 .5em}}
.cell p{{font-size:.86rem;color:var(--dim);margin:0}}
.cell:hover{{background:#1a1714}}
footer.site{{border-top:1px solid var(--line);padding:26px 0 46px;font-size:.85rem;color:var(--dim);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}}
footer.site a{{color:var(--accent)}}
@media(prefers-reduced-motion:reduce){{html{{scroll-behavior:auto;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}}}
</style>
</head>
<body>
<a class="skip" href="#contenido">Saltar al contenido</a>
<header class="site">
  <div class="wrap" style="display:flex;justify-content:space-between;align-items:baseline;width:100%;flex-wrap:wrap">
    <span class="brand">Pedro Belentani <span>· Universo</span></span>
    <nav class="site" aria-label="Navegación">
      <a href="../universo.html">Universo</a>
      <a href="index.html">Índice</a>
    </nav>
  </div>
</header>
<main id="contenido">
  <div class="wrap">
    <p class="eyebrow">Constelación · {funcion}</p>
    <h1>{titulo}</h1>
    <p class="lead">{intro}</p>
    <h2 style="font-family:var(--serif);font-weight:600;margin:2em 0 .6em">10 galaxias</h2>
    <div class="grid" aria-label="Galaxias de {titulo}">
{items}
    </div>
    <p style="margin-top:1.5rem"><a href="../universo.html">← Volver al universo</a> · <a href="index.html">Índice completo de galaxias</a> · <a href="{siguiente}">Siguiente constelación →</a></p>
  </div>
</main>
<footer class="site">
  <div class="wrap" style="display:flex;justify-content:space-between;width:100%;flex-wrap:wrap">
    <span>Pedro Marcos Santos Belentani · Barcelona</span>
    <a href="https://github.com/belentani7">GitHub</a>
  </div>
</footer>
</body>
</html>"""


def main():
    data = json.load(open("GALAXIAS.json", encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    firmas = data["firmas"]
    # índice por firma: galaxias 1..10 = firma 0, etc.
    gal = {}
    for n in range(1, 51):
        path = f"galaxia-{n:02d}.html"
        if os.path.exists(path):
            t = titulo_galaxia(path)
            if t:
                gal[n] = t
    for i, firma in enumerate(firmas):
        bases = list(range(i * 10 + 1, i * 10 + 11))
        items = []
        for n in bases:
            if n not in gal:
                continue
            num, est, fname = gal[n]
            items.append(
                f'      <a class="cell" href="../galaxia-{num:02d}.html"><h3>{est}</h3>'
                f"<p>Galaxia {num:02d} · {fname}</p></a>"
            )
        siguiente = firmas[(i + 1) % len(firmas)]["slug"]
        intro = (
            f"{firma['titulo']} es la firma de la {firma['funcion']}. "
            f"Sus diez estaciones recorren el arco narrativo de principio a fin."
        )
        html = PAGE.format(
            titulo=firma["titulo"],
            funcion=firma["funcion"],
            color=firma["color"],
            intro=intro,
            items="\n".join(items),
            siguiente=f"{siguiente}.html",
        )
        path = os.path.join(OUT, f"{firma['slug']}.html")
        open(path, "w", encoding="utf-8", newline="\n").write(html)
        print("OK", path, f"({len(items)} galaxias)")

    # índice de constelaciones
    idx_items = "\n".join(
        f'      <a class="cell" href="{f["slug"]}.html"><h3>{f["titulo"]}</h3>'
        f'<p>{f["funcion"]} · 10 galaxias</p></a>'
        for f in firmas
    )
    idx = PAGE.format(
        titulo="Constelaciones",
        funcion="índice",
        color="#d4af3c",
        intro="Cinco constelaciones, cincuenta galaxias: el universo Belentani como mapa navegable.",
        items=idx_items,
        siguiente=firmas[0]["slug"] + ".html",
    )
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8", newline="\n").write(idx)
    print("OK", os.path.join(OUT, "index.html"))


if __name__ == "__main__":
    main()