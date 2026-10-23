#!/usr/bin/env python3
"""
PROJECTE: figures (Step Quiz, vanilla JS)
FITXER: tools/versio.py
ROL: Posa al dia els ?v=… dels CSS i JS que carreguen els HTML de l'arrel, amb
     els 8 primers caràcters del SHA-1 del contingut de cada fitxer. Així el
     navegador no es queda amb una versió vella després de publicar.

ÚS (des de l'arrel del repositori):
    python3 tools/versio.py             → reescriu els ?v= que hagin canviat
    python3 tools/versio.py --comprova  → no toca res; surt amb error si n'hi ha cap de vell
                                          (ho fa tests/run-all.js)
Només biblioteca estàndard.
"""
import hashlib
import pathlib
import re
import sys

ARREL = pathlib.Path(__file__).resolve().parent.parent
REF = re.compile(r'((?:src|href)=")((?:css|js|data)/[^"?]+\.(?:css|js))\?v=([0-9a-z]+)(")')


def empremta(rel):
    return hashlib.sha1((ARREL / rel).read_bytes()).hexdigest()[:8]


def main():
    comprova = '--comprova' in sys.argv
    vells = []
    for html in sorted(ARREL.glob('*.html')):
        text = html.read_text(encoding='utf-8')

        def canvia(m):
            rel, v = m.group(2), m.group(3)
            if not (ARREL / rel).exists():
                vells.append(f'{html.name}: {rel} no existeix')
                return m.group(0)
            nou = empremta(rel)
            if nou != v:
                vells.append(f'{html.name}: {rel} ?v={v} → {nou}')
            return f'{m.group(1)}{rel}?v={nou}{m.group(4)}'

        nou = REF.sub(canvia, text)
        if not comprova and nou != text:
            html.write_text(nou, encoding='utf-8')
    if comprova:
        if vells:
            print('✗ Hi ha ?v= vells (executa python3 tools/versio.py):')
            for v in vells:
                print('  - ' + v)
            sys.exit(1)
        print('✓ Tots els ?v= són al dia.')
    else:
        print(f'{len(vells)} canvis.' if vells else 'Res a canviar.')


if __name__ == '__main__':
    main()
