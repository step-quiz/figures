#!/bin/sh
# ============================================================================
# PROJECTE: figures (Step Quiz, vanilla JS)
# FITXER: tools/compila-golden.sh
# ROL: Compila amb pdflatex cada fitxer de referència (tests/golden/*.tex), per
#      saber que el TikZ que fa l'editor compila de veritat. El fa servir el
#      workflow compila.yml (docs/compila.yml) i es pot fer a mà.
# ÚS: sh tools/compila-golden.sh   (cal pdflatex amb TikZ)
# ============================================================================
set -e
cd "$(dirname "$0")/.."
SORTIDA=$(mktemp -d)
ERRORS=0
for f in tests/golden/*.tex; do
    if pdflatex -interaction=nonstopmode -halt-on-error -output-directory="$SORTIDA" "$f" > "$SORTIDA/registre.txt" 2>&1; then
        echo "✓ $f"
    else
        echo "✗ $f"
        grep -A4 '^!' "$SORTIDA/registre.txt" || tail -20 "$SORTIDA/registre.txt"
        ERRORS=$((ERRORS + 1))
    fi
done
rm -rf "$SORTIDA"
[ "$ERRORS" -eq 0 ] && echo "Tots compilen." || { echo "$ERRORS no compilen."; exit 1; }
