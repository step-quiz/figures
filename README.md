# Figures d’examen

Un editor de figures de geometria per a exàmens: una figura neta i ben construïda en pocs minuts, i exportada en **TikZ** (per a Overleaf), **SVG** i **PNG a 300 ppp** (per a Google Docs).

Web: https://figures.step-quiz.net

La figura és **dinàmica**: si mous un punt, tot el que en depèn es mou amb ell (el punt mig continua sent el punt mig, la perpendicular continua sent perpendicular). El motor és el **GeoMotor** (`js/motor/geo-motor.js`), un **fitxer comú** de `step-quiz-commons` que també fa servir «Teoremes que no t’esperes»: aquí no s’edita, es canvia a commons i arriba sol cada dia (workflow «Fitxers comuns»).

## Com es fa servir

1. Tria una eina a l’esquerra (o prem la seva tecla) i toca el llenç. Si toques a prop d’un punt, fa servir aquell punt; a prop d’una línia o una circumferència, hi posa un punt a sobre; en un lloc buit, en fa un de nou (ajustat a la graella de 0,5 cm; amb **Maj**, sense ajustar).
2. Amb **Mou / tria** (V), arrossega els punts lliures i les etiquetes, i toca un objecte per veure’n les **propietats** a la dreta: etiqueta, gruix, traç, color, visible, i les opcions del tipus.
3. A baix, **Exporta**: copia el TikZ i enganxa’l a l’examen.

| Eina | Tecla |
|---|---|
| Mou / tria | V |
| Punt | P |
| Segment | S |
| Recta | R |
| Circumferència | C |
| Punt mig | M |
| Intersecció | I |
| Marca d’angle | A |

També: Esc (deixa l’eina o la selecció), Supr (esborra l’objecte triat i el que en depèn), Ctrl+Z / Ctrl+Y (desfer i refer, 200 passos), fletxes (mouen el punt triat 0,5 cm; amb Maj, 0,1 cm).

**Eines:** punt, segment, recta, semirecta, polígon, polígon regular, circumferència (per un punt o amb el radi), arc, punt mig, intersecció, perpendicular, paral·lela, mediatriu, bisectriu, gir, simetria, translació, baricentre, circumcentre, incentre, ortocentre, trisectriu, marca d’angle (1, 2 o 3 arcs, o el quadradet de l’angle recte), marca de segment (1, 2 o 3 ratlles), cota, ombrejat (gris o ratllat), text, eixos (amb marques, nombres amb coma decimal i graella) i **gràfica y = f(x)**.

**Gràfiques:** s’escriu la funció amb `x`, nombres (amb coma o punt), `+ − · /`, `^`, parèntesis i `|x|`, i les funcions `sin` (`sen`), `cos`, `tan` (`tg`), `asin`, `acos`, `atan`, `sqrt` (`arrel`), `abs`, `ln`, `log` i `exp`; `pi` i `e`. El producte es pot sobreentendre: `2x`, `3(x+1)`. Es parteix sola a les asímptotes. Una unitat dels eixos és 1 cm.

## Plantilles

| Id | Plantilla |
|---|---|
| `triangle-altures` | Triangle amb les altures |
| `tales` | Configuració de Tales |
| `pitagores` | Pitàgores amb els quadrats |
| `angle-inscrit` | Angle inscrit i angle central |
| `tangent` | Tangents des d’un punt exterior |
| `eixos-segment` | Eixos de coordenades amb un segment |
| `grafica` | Gràfica d’una funció |

## Exportació

- **TikZ** (Copia el TikZ): TikZ pla, **sense cap biblioteca** ni macro; totes les coordenades calculades (3 decimals), mai construccions de TikZ. Gruixos: fi, normal i gruixut → `thin`, `semithick` i `thick` (0,4, 0,6 i 0,8 pt); per defecte, `semithick`. Les etiquetes, a la mida del text de l’examen; una lletra (`A`, `A'`, `A1` → `$A_{1}$`) o una lletra grega va en mode matemàtic, i un text entre `$…$` passa tal qual.
- **.tex autònom**: `standalone` a 12 pt, per compilar la figura sola.
- **SVG**: mida en mm, lletra serif; les etiquetes entre `$…$` es mostren simplificades (sense interpretar el LaTeX).
- **PNG a 300 ppp**: per a Google Docs. «Copia la PNG» on el navegador ho permet.

**Tornar a obrir una figura des del .tex:** la primera línia del TikZ és `% figures:v1:<codi>`, amb tota la construcció. «Importa des del .tex» (o obrir el .tex) la torna a l’editor.

## Desar i compartir

- La figura es desa sola en aquest navegador (`figures:v1:actual`).
- **Desa** baixa un `.json`; **Obre…** obre un `.json` o un `.tex` (també deixant anar el fitxer a la pàgina).
- **Comparteix** copia un enllaç amb la figura dins: `index.html#f=<codi>`.

## Com provar-ho a l’ordinador

No cal instal·lar res: obre `index.html` amb doble clic. No fa cap petició a internet.

## Com està fet

HTML, CSS i JavaScript sense compilació, amb scripts clàssics perquè funcioni amb doble clic. El llenç és SVG.

```
index.html               l’editor
css/tokens.css           colors (clar i fosc); el llenç és sempre blanc
css/figures.css          estils
data/plantilles.js       les plantilles
js/motor/geo-motor.js    GeoMotor (fitxer comú de step-quiz-commons): objectes, avaluació, interseccions, serialització
js/motor/funcio.js       y = f(x): analitzador segur i mostreig adaptatiu
js/motor/dibuix.js       la construcció en primitives (línies, arcs, textos…)
js/export/tikz.js        TikZ i .tex autònom
js/export/svg.js         SVG (fitxer i llenç de l’editor) i mida de la PNG
js/export/codi.js        la construcció en un codi (deflate + base64url)
js/ui/textos.js          tots els textos
js/ui/eines.js           què demana i què crea cada eina
js/ui/historial.js       desfer i refer
js/ui/editor.js          el controlador: llenç, clics, arrossegar, tecles
js/ui/propietats.js      el panell de propietats
js/ui/fitxers.js         obre, desa, comparteix, importa, exporta
tools/compila-golden.sh  compila amb pdflatex els fitxers de referència
tools/versio.py          posa al dia els ?v= dels CSS i JS
```

## Tests

```
node tests/run-all.js
```

| Fitxer | Què comprova |
|---|---|
| `tests/geo-motor.test.js` | Que el GeoMotor és la còpia comuna (i, si hi ha `step-quiz-commons` al costat, que és al dia) i que hi són tots els tipus de les eines. Els seus tests de veritat (interseccions analítiques, tipus de conveniència = primitives, continuïtat de les branques, serialització byte a byte) són al repositori step-quiz-commons (el seu tests/geo-motor.test.js) |
| `tests/funcio.test.js` | L’analitzador contra `Math`, que rebutja el que no és una expressió, i el mostreig (asímptotes, retall) |
| `tests/export.test.js` | El TikZ de cada plantilla igual que `tests/golden/<id>.tex`, TikZ pla, el codi de la primera línia, etiquetes, SVG ben format i mida de la PNG |
| `tests/eines.test.js` | Les eines (on cau un clic) i que les plantilles es poden fer des de zero amb les eines; desfer i refer |
| `tests/repo.test.js` | Que tot fitxer citat existeix, l’ordre dels scripts, cap adreça externa, cap mòdul ES ni `fetch` (doble clic), cap `Math.random`, textos curts |
| `tools/versio.py --comprova` | Que cap `?v=` és vell |
| `tests/docs_vs_codi.py` | Que aquest README diu el mateix que el codi |

Si canvies l’exportació a propòsit, torna a fer els fitxers de referència amb `node tests/export.test.js --regenera` i mira el canvi abans de pujar-lo. El workflow opcional `compila.yml` (el text és a `docs/compila.yml`) compila els fitxers de referència amb pdflatex a cada canvi de l’exportació; a mà: `sh tools/compila-golden.sh`.

GitHub passa els tests a cada pujada a `main` (`.github/workflows/tests.yml`).

<!-- atribucio-centre:inici -->

---

Material desenvolupat per **David Arso Civil** per al Departament de Matemàtiques de l'INS Miquel Tarradell.
Contingut sota CC BY-NC-SA 4.0, codi sota llicència MIT. Vegeu [`LLICENCIA.md`](LLICENCIA.md).

<!-- atribucio-centre:final -->
