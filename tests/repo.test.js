/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: tests/repo.test.js
 * ROL: Comprovacions de tot el repositori (sense navegador):
 *   1. Cada fitxer local que citen els HTML existeix; l'ordre dels scripts.
 *   2. Cap petició a internet: cap adreça externa a src/href, cap fetch,
 *      XMLHttpRequest, Worker ni import (també fa que funcioni amb doble clic).
 *      L'espai de noms SVG (http://www.w3.org/2000/svg) no és cap petició.
 *   3. Cap Math.random a js/ (tot el que ha de ser reproduïble va amb llavor).
 *   4. Cada JS té la capçalera estàndard amb el seu camí.
 *   5. Textos curts: cap text de js/ui/textos.js passa de 40 paraules.
 *   6. Llicència, atribució del README, _headers amb connect-src 'none'.
 * ÚS: node tests/repo.test.js
 * ============================================================================
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { suite, ok, eq, finish } = require('./harness');

const ARREL = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ARREL, f), 'utf8');
const exists = f => fs.existsSync(path.join(ARREL, f));
function llista(dir, ext) {
    const out = [];
    for (const e of fs.readdirSync(path.join(ARREL, dir), { withFileTypes: true })) {
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (!['.git', 'node_modules', '_uploads', 'src'].includes(e.name)) out.push(...llista(rel, ext));
        } else if (e.name.endsWith(ext)) out.push(rel);
    }
    return out;
}
const htmls = fs.readdirSync(ARREL).filter(f => f.endsWith('.html'));
const jss = [...llista('js', '.js'), ...llista('data', '.js')];
const sense = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1'); // sense comentaris

suite('1. Fitxers citats i ordre dels scripts');
{
    const falten = [];
    for (const h of htmls) {
        for (const m of read(h).matchAll(/\b(?:src|href)="([^"#]+)"/g)) {
            const rel = m[1].split('?')[0];
            if (/^(https?:|mailto:|\/\/)/.test(rel)) continue;
            if (!exists(rel)) falten.push(`${h} → ${rel}`);
        }
    }
    ok(`tots els fitxers que citen els ${htmls.length} HTML existeixen`, !falten.length, falten.join(', '));
    const scripts = h => [...read(h).matchAll(/<script src="([^"?]+)/g)].map(m => m[1]).join(' ');
    eq('una sola pàgina', htmls.join(' '), 'index.html');
    eq(
        'index.html: motor → exportació → dades → interfície',
        scripts('index.html'),
        'js/motor/geo-motor.js js/motor/funcio.js js/motor/dibuix.js js/export/tikz.js js/export/svg.js js/export/codi.js data/plantilles.js js/ui/textos.js js/ui/historial.js js/ui/eines.js js/ui/editor.js js/ui/propietats.js js/ui/fitxers.js'
    );
}

suite('2. Cap petició a internet (i funciona amb doble clic)');
{
    const externes = [];
    for (const h of htmls)
        for (const m of read(h).matchAll(
            /<(?:script|link|img|iframe|source)\b[^>]*\b(?:src|href)="((?:https?:)?\/\/[^"]+)"/g
        ))
            externes.push(`${h} → ${m[1]}`);
    ok('cap script, estil ni imatge de fora', !externes.length, externes.join(', '));
    const moduls = htmls.filter(h => /type="module"/.test(read(h)));
    ok('cap <script type="module"> (Chrome no els obre amb file://)', !moduls.length, moduls.join(', '));
    const prohibits = [];
    for (const f of jss) {
        const s = sense(read(f));
        for (const [nom, re] of [
            ['fetch(', /\bfetch\s*\(/],
            ['XMLHttpRequest', /XMLHttpRequest/],
            ['Worker', /new\s+Worker\b/],
            ['import', /^\s*import\s/m],
            ['adreça http', /['"`]https?:\/\/(?!www\.w3\.org\/2000\/svg['"`])/],
            ['eval', /\beval\s*\(|new\s+Function\s*\(/],
        ])
            if (re.test(s)) prohibits.push(`${f}: ${nom}`);
    }
    ok(
        'cap fetch, XMLHttpRequest, Worker, import, adreça http ni eval a js/ ni data/',
        !prohibits.length,
        prohibits.join(', ')
    );
    const inline = htmls.filter(
        h => /<script>(?!\s*<\/script>)|<script(?![^>]*\bsrc=)[^>]*>\s*\S/.test(read(h)) || /\sstyle="/.test(read(h))
    );
    ok('cap script ni estil dins dels HTML (la CSP de _headers no els deixaria)', !inline.length, inline.join(', '));
}

suite('3. Atzar amb llavor');
{
    const amb = jss.filter(f => /Math\.random/.test(sense(read(f))));
    ok('cap Math.random a js/ ni data/', !amb.length, amb.join(', '));
}

suite('4. Capçaleres dels fitxers');
{
    const mal = jss.filter(f => !read(f).includes(`FITXER: ${f.split(path.sep).join('/')}`));
    ok(`els ${jss.length} JS tenen la capçalera amb el seu camí`, !mal.length, mal.join(', '));
}

suite('5. Textos curts (≤ 40 paraules)');
{
    const T = require('../js/ui/textos.js');
    const llargs = [];
    const recorre = (o, camí) => {
        for (const [k, v] of Object.entries(o)) {
            const c = camí ? `${camí}.${k}` : k;
            let txt = v;
            if (typeof v === 'function') txt = v('X', 'X', 'X', 'X', 'X');
            if (Array.isArray(txt)) txt = txt.join(' ');
            if (typeof txt === 'string') {
                const n = txt.split(/\s+/).filter(Boolean).length;
                if (n > 40) llargs.push(`${c} (${n})`);
            } else if (txt && typeof txt === 'object') recorre(txt, c);
        }
    };
    recorre(T, '');
    ok('cap text de js/ui/textos.js passa de 40 paraules', !llargs.length, llargs.join(', '));
}

suite('6. Llicència, atribució i capçaleres de Cloudflare');
{
    ok('LICENSE i LLICENCIA.md', exists('LICENSE') && exists('LLICENCIA.md'));
    const bloc =
        "<!-- atribucio-centre:inici -->\n\n---\n\nMaterial desenvolupat per **David Arso Civil** per al Departament de Matemàtiques de l'INS Miquel Tarradell.\nContingut sota CC BY-NC-SA 4.0, codi sota llicència MIT. Vegeu [`LLICENCIA.md`](LLICENCIA.md).\n\n<!-- atribucio-centre:final -->";
    ok('el README acaba amb el bloc d’atribució', read('README.md').trimEnd().endsWith(bloc));
    ok("_headers: la CSP diu connect-src 'none'", /connect-src 'none'/.test(read('_headers')));
    ok(
        'CLAUDE.md porta el bloc de regles comunes',
        /<!-- regles-comunes:inici -->[\s\S]+<!-- regles-comunes:fi -->/.test(read('CLAUDE.md'))
    );
}

finish('REPOSITORI');
