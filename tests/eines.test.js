/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: tests/eines.test.js
 * ROL: Tests de les eines de l'editor (js/ui/eines.js) i de l'historial
 *      (js/ui/historial.js):
 *   1. Un clic: a prop d'un punt, el fa servir; a prop d'una línia, hi posa un
 *      punt a sobre; si no, un punt lliure ajustat a la graella.
 *   2. Les plantilles es poden fer des de zero amb les eines (els clics d'un
 *      professor, simulats): la figura que surt és la mateixa (mateixos punts).
 *   3. Intersecció: el punt de tall més proper al clic.
 *   4. Desfer i refer (límit de 200 passos).
 * ÚS: node tests/eines.test.js
 * ============================================================================
 */
'use strict';
const { suite, ok, eq, finish } = require('./harness');
const G = require('../js/motor/geo-motor.js');
const E = require('../js/ui/eines.js');
const H = require('../js/ui/historial.js');
const PLANTILLES = require('../data/plantilles.js');

/** Simula els clics d'una eina: entrades = [{x, y}] (posicions) o ids; retorna l'objecte creat. */
function eina(fig, nom, clics, o = {}) {
    const def = E.EINES[nom];
    const ids = [];
    for (const c of clics) {
        const valors = G.avalua(fig).valors;
        const esp = def.entrades[0] === 'P+' ? 'P' : def.entrades[ids.length];
        if (typeof c === 'string') ids.push(c);
        else if (esp === 'P') ids.push(E.resolPunt(fig, valors, c, { graella: o.graella !== false }).id);
        else if (esp === 'xy') ids.push(E.ajusta(c, true));
        else {
            const p = E.proper(fig, valors, c, esp);
            if (!p) throw new Error(`${nom}: no hi ha cap ${esp} a prop de ${JSON.stringify(c)}`);
            ids.push(p.id);
        }
    }
    if (nom === 'punt') return fig.objectes.find(x => x.id === ids[0]);
    return E.crea(fig, nom, ids, {
        valors: G.avalua(fig).valors,
        clic: clics[clics.length - 1],
        num: o.num,
        text: o.text,
        expr: o.expr,
    });
}
/** Els punts visibles d'una figura, ordenats (per comparar figures fetes de maneres diferents). */
function punts(fig) {
    const v = G.avalua(fig).valors;
    return fig.objectes
        .filter(o => G.classe(o.tipus) === 'punt' && o.visible && v[o.id])
        .map(o => `${v[o.id].x.toFixed(4)},${v[o.id].y.toFixed(4)}`)
        .sort()
        .join(' ');
}

suite('1. Un clic');
{
    const f = G.nova();
    const A = eina(f, 'punt', [{ x: 1.1, y: 0.9 }]);
    eq(
        'lliure, ajustat a la graella de 0,5: (1, 1)',
        G.avalua(f).valors[A.id].x + ',' + G.avalua(f).valors[A.id].y,
        '1,1'
    );
    const B = eina(f, 'punt', [{ x: 4.23, y: 1.04 }], { graella: false });
    ok('sense graella (Maj): la posició del clic', Math.abs(G.avalua(f).valors[B.id].x - 4.23) < 1e-9);
    const s = eina(f, 'segment', [
        { x: 1.05, y: 1.1 },
        { x: 4.2, y: 1 },
    ]);
    eq(
        'un segment entre dos punts existents: no en crea de nous',
        f.objectes.filter(o => G.classe(o.tipus) === 'punt').length,
        2
    );
    eq('…i fa servir A i B', s.args.join(' '), `${A.id} ${B.id}`);
    const C = eina(f, 'punt', [{ x: 2.5, y: 1.1 }]);
    eq('a prop del segment: un punt sobre el segment', C.tipus, 'punt-sobre');
    const vv = G.avalua(f).valors;
    ok('…que és sobre el segment', E.distLinia(vv[s.id], vv[C.id]).d < 1e-9);
    const p = E.proper(f, G.avalua(f).valors, { x: 2.5, y: 1.05 }, 'qualsevol');
    eq('proper(): el punt guanya al segment si tots dos són a prop', p.id, C.id);
    eq('lluny de tot: res', E.proper(f, G.avalua(f).valors, { x: 9, y: 9 }, 'qualsevol'), null);
}

suite('2. Les plantilles, fetes des de zero amb les eines');
{
    // Triangle amb les altures: polígon, tres rectes amagades, perpendiculars, interseccions, segments, ortocentre
    let f = G.nova({ x0: 0, y0: 0, x1: 9, y1: 6.5 });
    const p1 = eina(f, 'poligon', [
        { x: 1, y: 1 },
        { x: 8, y: 1 },
        { x: 3, y: 5.5 },
    ]);
    const [A, B, C] = p1.args;
    for (const [P, Q, R] of [
        [A, B, C],
        [B, C, A],
        [C, A, B],
    ]) {
        const r = eina(f, 'recta', [P, Q]);
        r.visible = false;
        const h = eina(f, 'perpendicular', [r.id, R]);
        h.visible = false;
        const D = eina(f, 'interseccio', [r.id, h.id]);
        const s = eina(f, 'segment', [R, D.id]);
        s.estil.trac = 'discontinu';
    }
    eina(f, 'ortocentre', [A, B, C]);
    const pl = G.llegeix(PLANTILLES.find(p => p.id === 'triangle-altures').figura).fig;
    eq('triangle amb les altures: els mateixos punts que la plantilla', punts(f), punts(pl));

    // Tangents des d'un punt exterior
    f = G.nova({ x0: 0, y0: 0, x1: 11, y1: 7 });
    const c1 = eina(f, 'circumferencia-radi', [{ x: 3, y: 3.5 }], { num: 2 });
    const P = eina(f, 'punt', [{ x: 9.5, y: 3.5 }]);
    const M = eina(f, 'punt-mig', [c1.args[0], P.id]);
    M.visible = false;
    const c2 = eina(f, 'circumferencia', [M.id, c1.args[0]]);
    c2.visible = false;
    const T1 = eina(f, 'interseccio', [c1.id, c2.id]);
    const v = G.avalua(f).valors;
    // el segon tall: un clic a prop de l'altre punt
    const altre = { x: v[T1.id].x, y: 2 * 3.5 - v[T1.id].y };
    const T3 = E.crea(f, 'interseccio', [c1.id, c2.id], { valors: G.avalua(f).valors, clic: altre });
    eina(f, 'segment', [P.id, T1.id]);
    eina(f, 'segment', [P.id, T3.id]);
    eina(f, 'segment', [c1.args[0], T1.id]);
    const plt = G.llegeix(PLANTILLES.find(p => p.id === 'tangent').figura).fig;
    eq('tangents: els mateixos punts que la plantilla', punts(f), punts(plt));

    // Gràfica: l'eina crea els eixos si no n'hi ha
    f = G.nova({ x0: -4.5, y0: -2.5, x1: 4.5, y1: 5.5 });
    const g = eina(f, 'grafica', [], { expr: 'x^2/2 - 1' });
    ok(
        'gràfica: crea uns eixos que caben a la vista i la gràfica a sobre',
        f.objectes[0].tipus === 'eixos' &&
            g.args[0] === f.objectes[0].id &&
            f.objectes[0].opcions.xmin === -4 &&
            f.objectes[0].opcions.ymax === 5
    );
}

suite('3. Intersecció: el tall més proper al clic');
{
    const f = G.nova();
    const c1 = eina(f, 'circumferencia-radi', [{ x: 5, y: 5 }], { num: 3 });
    const r = eina(f, 'recta', [
        { x: 0, y: 5 },
        { x: 10, y: 5 },
    ]);
    const v = G.avalua(f).valors;
    const X1 = E.crea(f, 'interseccio', [r.id, c1.id], { valors: v, clic: { x: 2.2, y: 5 } });
    const X2 = E.crea(f, 'interseccio', [r.id, c1.id], { valors: v, clic: { x: 7.9, y: 5 } });
    const w = G.avalua(f).valors;
    ok('clic a l’esquerra: (2, 5)', Math.abs(w[X1.id].x - 2) < 1e-9);
    ok('clic a la dreta: (8, 5)', Math.abs(w[X2.id].x - 8) < 1e-9);
}

suite('4. Desfer i refer');
{
    const h = H.crea(200);
    ok('sense canvis no es registra res', !h.fet('res', 'a', 'a'));
    h.fet('1', 'a', 'b');
    h.fet('2', 'b', 'c');
    eq('desfer: l’estat d’abans', h.desfes().estat, 'b');
    eq('desfer un altre cop', h.desfes().estat, 'a');
    eq('no hi ha res més a desfer', h.desfes(), null);
    eq('refer', h.refes().estat, 'b');
    h.fet('3', 'b', 'x');
    ok('una ordre nova esborra el que es podia refer', !h.potRefer());
    const h2 = H.crea(200);
    for (let i = 0; i < 250; i++) h2.fet(String(i), 's' + i, 's' + (i + 1));
    eq('com a molt 200 passos', h2.mida(), 200);
}

finish('EINES');
