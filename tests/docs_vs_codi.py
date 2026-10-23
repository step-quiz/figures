#!/usr/bin/env python3
"""
PROJECTE: figures (Step Quiz, vanilla JS)
FITXER: tests/docs_vs_codi.py
ROL: Que el README diu el mateix que el codi:
  - les rutes entre `cometes` del README existeixen;
  - la taula de plantilles té cada plantilla (id i nom) i hi ha un fitxer de referència per a cadascuna;
  - la taula de tecles és la de js/ui/eines.js; els gruixos TikZ, els de js/export/tikz.js;
  - les funcions de les gràfiques, els passos de l'historial, la clau de localStorage i els ppp de la PNG.
ÚS: python3 tests/docs_vs_codi.py   (només biblioteca estàndard)
"""
import pathlib
import re
import sys

ARREL = pathlib.Path(__file__).resolve().parent.parent
llegeix = lambda rel: (ARREL / rel).read_text(encoding='utf-8')
errors = []


def comprova(cond, msg):
    if not cond:
        errors.append(msg)


readme = llegeix('README.md')

# 1. Rutes citades
for ruta in re.findall(r'`([^`\s#?*<]+\.(?:js|css|html|py|yml|md|sh))(?:[?#][^`]*)?`', readme):
    if ruta.startswith('.github/') or ruta == 'compila.yml':
        continue  # els workflows es creen des del web de GitHub
    comprova((ARREL / ruta).exists(), f'README.md cita `{ruta}`, que no existeix')

# 2. Plantilles i fitxers de referència
plant = llegeix('data/plantilles.js')
ids = re.findall(r"^        \{\n            id: '([^']+)',\n            nom: '([^']+)'", plant, re.M)
comprova(len(ids) >= 6, f'data/plantilles.js: només {len(ids)} plantilles')
for i, nom in ids:
    comprova(f'| `{i}` | {nom} |' in readme, f'README.md: falta la plantilla `{i}` ({nom})')
    comprova((ARREL / 'tests' / 'golden' / f'{i}.tex').exists(), f'tests/golden/{i}.tex no existeix')

# 3. Tecles
eines = llegeix('js/ui/eines.js')
textos = llegeix('js/ui/textos.js')
noms = dict(re.findall(r"^            '?([a-z-]+)'?: '([^']+)',", textos.split('eines: {')[1].split('},')[0], re.M))
for eina, tecla in re.findall(r"^        '?([a-z-]+)'?: \{ tecla: '([a-z])'", eines, re.M):
    comprova(f'| {noms.get(eina, eina)} | {tecla.upper()} |' in readme, f'README.md: falta la tecla {tecla.upper()} ({noms.get(eina, eina)})')

# 4. Gruixos, funcions, historial, clau, PNG
tikz = llegeix('js/export/tikz.js')
gr = dict(re.findall(r"(fi|normal|gruixut): '(\w+)'", tikz.split('var GRUIX = ')[1].split('};')[0]))
comprova(f"`{gr['fi']}`, `{gr['normal']}` i `{gr['gruixut']}`" in readme, 'README.md: els gruixos TikZ no són els de js/export/tikz.js')
funcio = llegeix('js/motor/funcio.js')
fns = re.findall(r'^        (\w+): ', funcio.split('var FUNCIONS = {')[1].split('};')[0], re.M)
for f in fns:
    comprova(f'`{f}`' in readme, f'README.md: falta la funció `{f}`')
edit = llegeix('js/ui/editor.js')
passos = re.search(r'Historial\.crea\((\d+)\)', edit).group(1)
comprova(f'{passos} passos' in readme, f'README.md: l’historial és de {passos} passos')
fitx = llegeix('js/ui/fitxers.js')
clau = re.search(r"var CLAU = '([^']+)'", fitx).group(1)
comprova(f'`{clau}`' in readme, f'README.md: falta la clau `{clau}`')
ppp = re.search(r'midaPng\(s\.ample, s\.alt, (\d+)\)', fitx).group(1)
comprova(f'PNG a {ppp} ppp' in readme, f'README.md: la PNG és a {ppp} ppp')

if errors:
    print(f'✗ figures: {len(errors)} discrepàncies entre la documentació i el codi:')
    for e in errors:
        print('  - ' + e)
    sys.exit(1)
print('✓ figures: la documentació quadra amb el codi.')
