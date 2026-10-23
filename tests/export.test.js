/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: tests/export.test.js
 * ROL: Tests de l'exportació (especificació §12.6):
 *   1. TikZ de cada plantilla = el fitxer de referència tests/golden/<id>.tex
 *      (comparació exacta). Per tornar-los a fer: node tests/export.test.js --regenera
 *      (i mira el canvi amb git diff abans de pujar-lo). La compilació de veritat
 *      dels fitxers de referència la fa el workflow compila.yml.
 *   2. TikZ pla: cap biblioteca, coordenades amb 3 decimals; la primera línia
 *      porta el codi i el codi torna la mateixa construcció.
 *   3. Etiquetes en LaTeX i àncores.
 *   4. SVG ben format (sense atributs style) i mida de la PNG a 300 ppp.
 * ÚS: node tests/export.test.js [--regenera]
 * ============================================================================
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { suite, ok, eq, finish } = require('./harness');
const G = require('../js/motor/geo-motor.js');
const D = require('../js/motor/dibuix.js');
const T = require('../js/export/tikz.js');
const S = require('../js/export/svg.js');
const C = require('../js/export/codi.js');
const PLANTILLES = require('../data/plantilles.js');

const DIR = path.join(__dirname, 'golden');
const REGENERA = process.argv.includes('--regenera');

function benFormat(s) {
    const re = /<\/?([a-zA-Z][\w-]*)((?:\s+[\w:-]+="[^"<&]*(?:&(?:amp|lt|gt|quot);[^"<&]*)*")*)\s*(\/?)>|([^<]+)/g;
    const pila = [];
    let m,
        fi = 0;
    while ((m = re.exec(s))) {
        if (m.index !== fi) return `caràcter inesperat a la posició ${fi}`;
        fi = re.lastIndex;
        if (m[4] !== undefined) {
            if (/&(?!(amp|lt|gt|quot);)/.test(m[4])) return 'un & solt';
            continue;
        }
        if (m[0].startsWith('</')) {
            if (pila.pop() !== m[1]) return `</${m[1]}> no tanca res`;
        } else if (m[3] !== '/') pila.push(m[1]);
    }
    if (fi !== s.length) return `queda text a la posició ${fi}`;
    return pila.length ? `queden obertes: ${pila.join(', ')}` : null;
}
const texDe = fig => {
    const codi = C.codificaSync(G.serialitza(fig));
    return T.autonom(D.primitives(fig), codi);
};

suite('1. TikZ de les plantilles = fitxers de referència');
{
    ok('hi ha plantilles', PLANTILLES.length >= 6);
    if (REGENERA) fs.mkdirSync(DIR, { recursive: true });
    for (const p of PLANTILLES) {
        const r = G.llegeix(p.figura);
        eq(`${p.id}: la plantilla es llegeix sencera`, r.descartats.length, 0);
        const tex = texDe(r.fig);
        const fitxer = path.join(DIR, p.id + '.tex');
        if (REGENERA) fs.writeFileSync(fitxer, tex);
        ok(
            `${p.id}: igual que tests/golden/${p.id}.tex`,
            fs.existsSync(fitxer) && fs.readFileSync(fitxer, 'utf8') === tex,
            fs.existsSync(fitxer) ? 'diferent: node tests/export.test.js --regenera' : 'no existeix'
        );
    }
    const sobren = fs.existsSync(DIR)
        ? fs.readdirSync(DIR).filter(f => f.endsWith('.tex') && !PLANTILLES.some(p => p.id + '.tex' === f))
        : [];
    ok('cap fitxer de referència de més', !sobren.length, sobren.join(', '));
}

suite('2. TikZ pla i el codi de la primera línia');
for (const p of PLANTILLES) {
    const fig = G.llegeix(p.figura).fig;
    const tex = texDe(fig);
    ok(
        `${p.id}: cap biblioteca ni construcció de TikZ`,
        !/usetikzlibrary|\\coordinate|intersection|\\path\[name/.test(tex)
    );
    const nums =
        tex
            .split('\n')
            .filter(l => !l.startsWith('%'))
            .join('\n')
            .match(/\((-?\d+\.\d+),(-?\d+\.\d+)\)/g) || [];
    ok(
        `${p.id}: totes les coordenades amb 3 decimals (${nums.length})`,
        nums.length > 0 && nums.every(n => /^\(-?\d+\.\d{3},-?\d+\.\d{3}\)$/.test(n))
    );
    const codi = T.codiDelTex(tex);
    ok(`${p.id}: la primera línia del fragment porta el codi`, !!codi && tex.split('\n')[2] === '% figures:v1:' + codi);
    eq(`${p.id}: el codi torna la mateixa construcció (byte a byte)`, C.descodificaSync(codi), G.serialitza(fig));
}
{
    const fig = G.llegeix(PLANTILLES[0].figura).fig;
    const json = G.serialitza(fig);
    eq(
        'codi sense comprimir (navegadors sense CompressionStream): també es llegeix',
        C.descodificaSync(C.aBase64url(Buffer.from(json))),
        json
    );
    eq('el codi no té caràcters fora de base64url', /^[A-Za-z0-9_-]+$/.test(C.codificaSync(json)), true);
    eq('codiDelTex: un .tex sense codi → null', T.codiDelTex('\\begin{tikzpicture}\\end{tikzpicture}'), null);
}

suite('3. Etiquetes i àncores');
{
    const TAULA = [
        ['A', '$A$'],
        ["A'", "$A'$"],
        ['A1', '$A_{1}$'],
        ['α', '$\\alpha$'],
        ['2α', '2$\\alpha$'],
        ['$x^2$', '$x^2$'],
        ['50% & #1', '50\\% \\& \\#1'],
        ['−1', '$-$1'],
        ['3,5 cm', '3,5 cm'],
    ];
    for (const [t, esperat] of TAULA) eq(`«${t}» → ${esperat}`, T.textTex(t), esperat);
    eq(
        'àncores (el text queda a l’altra banda del desplaçament)',
        [
            [1, 0],
            [1, 1],
            [0, 1],
            [-1, 1],
            [-1, 0],
            [-1, -1],
            [0, -1],
            [1, -1],
        ]
            .map(d => D.ancora(d[0], d[1]))
            .join(' | '),
        'west | south west | south | south east | east | north east | north | north west'
    );
}

suite('4. SVG i PNG');
for (const p of PLANTILLES) {
    const fig = G.llegeix(p.figura).fig;
    const s = S.svg(D.primitives(fig));
    const e = benFormat(s.svg);
    ok(`${p.id}: SVG ben format`, !e, e);
    ok(`${p.id}: sense atributs style (atributs de presentació)`, !/\sstyle=/.test(s.svg));
    ok(`${p.id}: mida en mm i viewBox`, /width="[\d.]+mm" height="[\d.]+mm" viewBox="0 0 [\d.]+ [\d.]+"/.test(s.svg));
    const ed = S.svg(D.primitives(fig, null, { amagats: true }), { vista: fig.vista, editor: true, seleccionat: 'A' });
    ok(`${p.id}: SVG de l’editor ben format, amb data-id`, !benFormat(ed.svg) && /data-id="/.test(ed.svg));
}
{
    const m = S.midaPng(100, 50.8, 300);
    eq('PNG a 300 ppp: 100 × 50,8 mm → 1181 × 600 px', `${m.w}×${m.h}`, '1181×600');
}

finish('EXPORTACIÓ');
