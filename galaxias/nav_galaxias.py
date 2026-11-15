# -*- coding: utf-8 -*-
"""Añade navegación (anterior / índice / siguiente) a las 50 galaxias de Belentani Omega.

Idempotente: si ya existe el bloque NAV-GALAXIAS, lo sustituye.
Uso: python nav_galaxias.py
"""
import glob
import json
import re

NAV_MARK = "<!-- NAV-GALAXIAS -->"


def titulo_de(html):
    m = re.search(r"<title>GALAXIA\s+(\d+)\s*·\s*([^—|]+)\s*—\s*([^|<]+)", html)
    if m:
        return m.group(1), m.group(2).strip(), m.group(3).strip()
    return None, None, None


def nav_html(num, prev, nxt):
    prev_link = ""
    if prev:
        pnum, ptit, pfirma = prev
        prev_link = f'<a rel="prev" href="galaxia-{int(pnum):02d}.html">← {ptit} · {pfirma}</a>'
    else:
        prev_link = '<span class="nav-off">Primera</span>'
    next_link = ""
    if nxt:
        nnum, ntit, nfirma = nxt
        next_link = f'<a rel="next" href="galaxia-{int(nnum):02d}.html">{ntit} · {nfirma} →</a>'
    else:
        next_link = '<span class="nav-off">Última</span>'
    return (
        f'\n{NAV_MARK}\n'
        '<nav class="galaxia-nav" aria-label="Navegación entre galaxias">\n'
        f'  {prev_link}\n'
        '  <a class="nav-index" href="index.html">Índice de galaxias</a>\n'
        f'  {next_link}\n'
        '</nav>\n'
        f'<style>{NAV_MARK}\n'
        '.galaxia-nav{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;'
        'border-top:1px solid var(--line);margin-top:3rem;padding:1rem 0;font-size:.85rem}\n'
        '.galaxia-nav a{color:var(--accent)}\n'
        '.galaxia-nav .nav-index{color:var(--dim)}\n'
        '.galaxia-nav .nav-off{color:var(--dim);opacity:.5}\n'
        '</style>\n'
    )


def main():
    files = sorted(glob.glob("galaxia-*.html"), key=lambda p: int(re.search(r"galaxia-(\d+)", p).group(1)))
    print("Galaxias:", len(files))
    info = {}
    for f in files:
        html = open(f, encoding="utf-8").read()
        num, tit, firma = titulo_de(html)
        if num:
            info[int(num)] = (num, tit, firma)
    changed = 0
    for f in files:
        html = open(f, encoding="utf-8").read()
        num, tit, firma = titulo_de(html)
        if not num:
            print("SIN-TITULO", f)
            continue
        n = int(num)
        prev = info.get(n - 1)
        nxt = info.get(n + 1)
        block = nav_html(n, prev, nxt)
        # idempotente: quitar bloque previo si existe
        html = re.sub(r"\n*" + re.escape(NAV_MARK) + r".*?</style>\n", "", html, flags=re.S)
        if "</body>" in html:
            new_html = html.replace("</body>", block + "</body>", 1)
        else:
            new_html = html + block
        if new_html != html:
            open(f, "w", encoding="utf-8", newline="\n").write(new_html)
            changed += 1
    print("MODIFICADAS:", changed)

    # índice: listar las 50 galaxias si no están listadas
    idx = "index.html"
    html_idx = open(idx, encoding="utf-8").read()
    if 'href="galaxia-01.html"' not in html_idx:
        items = []
        for n in sorted(info):
            num, tit, firma = info[n]
            items.append(f'<li><a href="galaxia-{num}.html">GALAXIA {num} · {tit} — {firma}</a></li>')
        list_html = "<h2>Catálogo de galaxias</h2>\n<ol>\n" + "\n".join(items) + "\n</ol>\n"
        if "</main>" in html_idx:
            html_idx = html_idx.replace("</main>", list_html + "</main>", 1)
        else:
            html_idx = html_idx.replace("</body>", list_html + "</body>", 1)
        open(idx, "w", encoding="utf-8", newline="\n").write(html_idx)
        print("ÍNDICE: actualizado con", len(items), "galaxias")
    else:
        print("ÍNDICE: ya tiene galaxias")


if __name__ == "__main__":
    main()