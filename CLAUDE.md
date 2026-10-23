# CLAUDE.md — figures

<!-- regles-comunes:inici -->
## Regles comunes de Step Quiz

*Aquest bloc és igual a tots els repositoris de `step-quiz`. Les regles específiques d'aquest
repositori, si n'hi ha més avall, manen sobre aquestes quan diuen una altra cosa.*

- **Llengua.** Parla amb l'usuari en català. Tot el que veu l'alumnat, també en català.
- **L'usuari.** David, llicenciat en Matemàtiques i professor d'ESO i Batxillerat a Catalunya.
  Programa en C i dissenya algorismes; d'HTML, CSS, JS, Git, GitHub, Codespaces i LaTeX en sap
  el que cal per fer-los servir, no més. Quan hagi de fer alguna cosa (pull, push, commit, pujar
  un ZIP, compilar…), dona-li els passos numerats, amb les ordres o els textos per copiar i
  enganxar, i explica què fa cada pas.
- **ZIP.** Els ZIP que lliuris, l'usuari els puja a `_uploads/` (GitHub → `_uploads/` →
  *Add file* → *Upload files*), i el workflow `unzip-upload.yml` els descomprimeix a l'arrel i en
  fa commit. Per tant, les rutes de dins del ZIP comencen a l'arrel del repositori (`js/app.js`,
  no `projecte/js/app.js`): cap carpeta que ho contingui tot. El que hi hagi a `.github/` s'ignora;
  els workflows es canvien des del web de GitHub.
- **Publicació.** Els webs es publiquen amb Cloudflare Pages a cada commit de `main`. Cap missatge
  de commit pot portar `[skip ci]`, `[ci skip]` ni `[cf-pages-skip]`, tampoc els dels workflows
  que desen fitxers generats: Cloudflare no publicaria aquell commit.
- **Webs estàtiques.** HTML, CSS i JavaScript sense compilació ni servidor, si aquest repositori
  no diu el contrari. Cap dada personal de l'alumnat en un repositori públic.
- **Documentació.** Si canvies el comportament, posa al dia el README i els documents que el
  descriuen en el mateix commit. Si el codi i un document no coincideixen, el que s'ha
  d'arreglar és el document.
- **Proves.** Abans de lliurar res, passa les proves del repositori i digues-ne el resultat.
<!-- regles-comunes:fi -->

## Aquest repositori

**Figures d’examen** (`figures.step-quiz.net`): editor de figures de geometria que exporta TikZ, SVG i PNG.
Llegeix primer:

- [`README.md`](README.md)
- [`docs/SPEC.md`](docs/SPEC.md) (l'especificació, en anglès)
- [`docs/STATE.md`](docs/STATE.md) (l'estat i les decisions preses, en anglès; posa'l al dia a cada canvi)

Ha de funcionar **obrint `index.html` amb doble clic** (`file://`): scripts clàssics, cap mòdul ES, cap `fetch`,
cap petició a internet.

- **GeoMotor** (`js/motor/geo-motor.js`) és pur i es prova amb Node. Quan comenci el Projecte 21 es passarà a
  `step-quiz-commons` (cal preguntar-ho abans a l'usuari: especificació §5.3).
- **TikZ pla**: cap biblioteca ni construcció de TikZ, només coordenades. Si canvies l'exportació, regenera els
  fitxers de referència (`node tests/export.test.js --regenera`) i compila'ls (`sh tools/compila-golden.sh`).
- Les plantilles (`data/plantilles.js`) són construccions de GeoMotor; cada una té el seu `tests/golden/<id>.tex`.

Proves (des de l'arrel del repositori; només cal Node i Python 3):

```
node tests/run-all.js
```

Si canvies un CSS o un JS, abans de lliurar: `python3 tools/versio.py` (posa al dia els `?v=` dels HTML).
