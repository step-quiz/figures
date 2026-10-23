/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: tests/geo-motor.test.js
 * ROL: Tests del GeoMotor (especificació §12.6):
 *   1. Interseccions contra les solucions analítiques (recta–recta,
 *      recta–circumferència, circumferència–circumferència, tangència, cap
 *      solució, segments i arcs).
 *   2. Perpendicular, paral·lela, punt mig, mediatriu, bisectriu, transformacions.
 *   3. Cada tipus de conveniència és igual que la seva construcció amb primitives.
 *   4. Continuïtat de branques: un punt lliure fa un camí i la intersecció que
 *      se segueix no salta mai més d'un límit per pas.
 *   5. Construcció i serialització: ids, dependències, esborrar, anada i tornada
 *      idèntica byte a byte, i la lectura descarta el que no és vàlid.
 * ÚS: node tests/geo-motor.test.js
 * ============================================================================
 */
'use strict';
const { suite, ok, eq, finish } = require('./harness');
const G = require('../js/motor/geo-motor.js');

const prop = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const pIgual = (P, x, y, e = 1e-9) => P && prop(P.x, x, e) && prop(P.y, y, e);
const fig = () => G.nova();
const val = (f, id) => G.avalua(f).valors[id];
/** Afegeix punts lliures: pts({ A: [0, 0], B: [1, 2] }) */
function pts(f, m) {
    for (const k of Object.keys(m)) G.afegeix(f, 'punt', m[k], { id: k });
}

suite('1. Interseccions');
{
    // recta–recta: y = 0 i x = 2
    let f = fig();
    pts(f, { A: [0, 0], B: [5, 0], C: [2, -1], D: [2, 3] });
    G.afegeix(f, 'recta', ['A', 'B'], { id: 'r1' });
    G.afegeix(f, 'recta', ['C', 'D'], { id: 'r2' });
    G.afegeix(f, 'interseccio', ['r1', 'r2', 0], { id: 'P' });
    ok('recta–recta: (2, 0)', pIgual(val(f, 'P'), 2, 0));
    // paral·leles: cap solució
    G.afegeix(f, 'parallela', ['r1', 'C'], { id: 'r3' });
    G.afegeix(f, 'interseccio', ['r1', 'r3', 0], { id: 'Q' });
    eq('recta–recta paral·leles: null', val(f, 'Q'), null);
    // segment que no arriba
    G.afegeix(f, 'punt', [2, 1], { id: 'E' });
    G.afegeix(f, 'segment', ['D', 'E'], { id: 's1' });
    G.afegeix(f, 'interseccio', ['r1', 's1', 0], { id: 'R' });
    eq('recta–segment que no arriba: null', val(f, 'R'), null);

    // recta–circumferència: x² + y² = 25 i y = 3 → (−4, 3) i (4, 3), en l'ordre de la recta
    f = fig();
    pts(f, { O: [0, 0], A: [-10, 3], B: [10, 3] });
    G.afegeix(f, 'circumferencia-radi', ['O', 5], { id: 'c1' });
    G.afegeix(f, 'recta', ['A', 'B'], { id: 'r1' });
    G.afegeix(f, 'interseccio', ['r1', 'c1', 0], { id: 'P' });
    G.afegeix(f, 'interseccio', ['r1', 'c1', 1], { id: 'Q' });
    G.afegeix(f, 'interseccio', ['c1', 'r1', 0], { id: 'P2' });
    ok('recta–circumferència, branca 0: (−4, 3)', pIgual(val(f, 'P'), -4, 3));
    ok('recta–circumferència, branca 1: (4, 3)', pIgual(val(f, 'Q'), 4, 3));
    ok('l’ordre dels arguments no canvia la branca', pIgual(val(f, 'P2'), -4, 3));
    // la recta en sentit contrari: les branques s'intercanvien
    G.afegeix(f, 'recta', ['B', 'A'], { id: 'r2' });
    G.afegeix(f, 'interseccio', ['r2', 'c1', 0], { id: 'R' });
    ok('amb el vector director al revés, la branca 0 és (4, 3)', pIgual(val(f, 'R'), 4, 3));
    // tangent: y = 5
    pts(f, { C: [-3, 5], D: [3, 5], E: [-3, 6], F: [3, 6] });
    G.afegeix(f, 'recta', ['C', 'D'], { id: 'r3' });
    G.afegeix(f, 'interseccio', ['r3', 'c1', 0], { id: 'T0' });
    G.afegeix(f, 'interseccio', ['r3', 'c1', 1], { id: 'T1' });
    ok('tangència: les dues branques donen (0, 5)', pIgual(val(f, 'T0'), 0, 5) && pIgual(val(f, 'T1'), 0, 5));
    G.afegeix(f, 'recta', ['E', 'F'], { id: 'r4' });
    G.afegeix(f, 'interseccio', ['r4', 'c1', 0], { id: 'N' });
    eq('recta exterior: null', val(f, 'N'), null);

    // circumferència–circumferència: centres (0, 0) i (6, 0), radis 5 → (3, ±4)
    f = fig();
    pts(f, { O: [0, 0], O2: [6, 0], O3: [10, 0], O4: [3, 0], O5: [20, 0] });
    G.afegeix(f, 'circumferencia-radi', ['O', 5], { id: 'c1' });
    G.afegeix(f, 'circumferencia-radi', ['O2', 5], { id: 'c2' });
    G.afegeix(f, 'interseccio', ['c1', 'c2', 0], { id: 'P' });
    G.afegeix(f, 'interseccio', ['c1', 'c2', 1], { id: 'Q' });
    G.afegeix(f, 'interseccio', ['c2', 'c1', 0], { id: 'R' });
    ok('circumferència–circumferència, branca 0 (a l’esquerra de c1 → c2): (3, 4)', pIgual(val(f, 'P'), 3, 4));
    ok('branca 1: (3, −4)', pIgual(val(f, 'Q'), 3, -4));
    ok('amb c2 → c1, la branca 0 és l’altra: (3, −4)', pIgual(val(f, 'R'), 3, -4));
    G.afegeix(f, 'circumferencia-radi', ['O3', 5], { id: 'c3' });
    G.afegeix(f, 'interseccio', ['c1', 'c3', 1], { id: 'T' });
    ok('tangència exterior: (5, 0)', pIgual(val(f, 'T'), 5, 0));
    G.afegeix(f, 'circumferencia-radi', ['O4', 2], { id: 'c4' });
    G.afegeix(f, 'interseccio', ['c1', 'c4', 0], { id: 'Ti' });
    ok('tangència interior: (5, 0)', pIgual(val(f, 'Ti'), 5, 0));
    G.afegeix(f, 'circumferencia-radi', ['O5', 5], { id: 'c5' });
    G.afegeix(f, 'interseccio', ['c1', 'c5', 0], { id: 'N' });
    eq('circumferències separades: null', val(f, 'N'), null);
    // arc: el semicercle de dalt de c1 només talla c2 a (3, 4)
    pts(f, { A: [5, 0], B: [-5, 0] });
    G.afegeix(f, 'arc', ['O', 'A', 'B'], { id: 'a1' });
    G.afegeix(f, 'interseccio', ['a1', 'c2', 0], { id: 'U' });
    G.afegeix(f, 'interseccio', ['a1', 'c2', 1], { id: 'W' });
    ok('arc–circumferència: el punt de l’arc', pIgual(val(f, 'U'), 3, 4));
    eq('arc–circumferència: el punt de fora de l’arc és null', val(f, 'W'), null);
}

suite('2. Construccions bàsiques');
{
    const f = fig();
    pts(f, { A: [1, 1], B: [5, 3], C: [2, 6] });
    G.afegeix(f, 'recta', ['A', 'B'], { id: 'r1' });
    G.afegeix(f, 'perpendicular', ['r1', 'C'], { id: 'r2' });
    G.afegeix(f, 'parallela', ['r1', 'C'], { id: 'r3' });
    G.afegeix(f, 'punt-mig', ['A', 'B'], { id: 'M' });
    G.afegeix(f, 'mediatriu', ['A', 'B'], { id: 'r4' });
    G.afegeix(f, 'bisectriu', ['A', 'C', 'B'], { id: 'r5' });
    G.afegeix(f, 'gir', ['A', 'C', 90], { id: 'G1' });
    G.afegeix(f, 'simetria', ['C', 'r1'], { id: 'S1' });
    G.afegeix(f, 'translacio', ['C', 'A', 'B'], { id: 'T1' });
    G.afegeix(f, 'punt-sobre', ['r1', 0.25], { id: 'P1' });
    const v = G.avalua(f).valors;
    const d = L => ({ x: L.q.x - L.p.x, y: L.q.y - L.p.y });
    ok('perpendicular: producte escalar 0', prop(G.V.dot(d(v.r1), d(v.r2)), 0));
    ok('paral·lela: producte vectorial 0, passa per C', prop(G.V.cross(d(v.r1), d(v.r3)), 0) && pIgual(v.r3.p, 2, 6));
    ok('punt mig (3, 2)', pIgual(v.M, 3, 2));
    ok('mediatriu: passa pel punt mig, perpendicular', pIgual(v.r4.p, 3, 2) && prop(G.V.dot(d(v.r1), d(v.r4)), 0));
    const angle = (u, w) => Math.acos(G.V.dot(u, w) / G.V.len(u) / G.V.len(w));
    ok('bisectriu: angles iguals', prop(angle(d(v.r5), G.V.sub(v.A, v.C)), angle(d(v.r5), G.V.sub(v.B, v.C)), 1e-12));
    ok('gir de 90° de A al voltant de C: (7, 5)', pIgual(v.G1, 7, 5));
    ok(
        'simetria: el punt mig de C i S1 és a la recta i CS1 ⟂ AB',
        prop(G.V.cross(d(v.r1), G.V.sub({ x: (v.C.x + v.S1.x) / 2, y: (v.C.y + v.S1.y) / 2 }, v.A)), 0) &&
            prop(G.V.dot(d(v.r1), G.V.sub(v.S1, v.C)), 0)
    );
    ok('translació de C pel vector AB: (6, 8)', pIgual(v.T1, 6, 8));
    ok('punt sobre la recta (t = 0,25): (2, 1,5)', pIgual(v.P1, 2, 1.5));
    G.afegeix(f, 'poligon-regular', ['A', 'B', 6], { id: 'p1' });
    const p = G.avalua(f).valors.p1.punts;
    const costats = p.map((q, i) => G.V.dist(q, p[(i + 1) % p.length]));
    ok(
        'hexàgon regular: 6 costats iguals, comença per A i B',
        p.length === 6 &&
            costats.every(c => prop(c, costats[0], 1e-12)) &&
            pIgual(p[0], 1, 1) &&
            pIgual(p[1], 5, 3, 1e-12)
    );
    const area = p.reduce((s, q, i) => s + G.V.cross(q, p[(i + 1) % p.length]), 0) / 2;
    ok('el polígon regular és a l’esquerra d’AB (àrea positiva)', area > 0);
}

suite('3. Tipus de conveniència = construcció amb primitives');
{
    // Triangles amb llavor
    let s = 12345;
    const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) * 10 - 5;
    let malament = [];
    for (let k = 0; k < 40; k++) {
        const f = fig();
        pts(f, { A: [rnd(), rnd()], B: [rnd(), rnd()], C: [rnd(), rnd()] });
        G.afegeix(f, 'baricentre', ['A', 'B', 'C'], { id: 'Gc' });
        G.afegeix(f, 'circumcentre', ['A', 'B', 'C'], { id: 'Oc' });
        G.afegeix(f, 'incentre', ['A', 'B', 'C'], { id: 'Ic' });
        G.afegeix(f, 'ortocentre', ['A', 'B', 'C'], { id: 'Hc' });
        // primitives
        G.afegeix(f, 'punt-mig', ['B', 'C'], { id: 'Ma' });
        G.afegeix(f, 'punt-mig', ['A', 'C'], { id: 'Mb' });
        G.afegeix(f, 'recta', ['A', 'Ma'], { id: 'm1' });
        G.afegeix(f, 'recta', ['B', 'Mb'], { id: 'm2' });
        G.afegeix(f, 'interseccio', ['m1', 'm2', 0], { id: 'Gp' });
        G.afegeix(f, 'mediatriu', ['A', 'B'], { id: 'z1' });
        G.afegeix(f, 'mediatriu', ['B', 'C'], { id: 'z2' });
        G.afegeix(f, 'interseccio', ['z1', 'z2', 0], { id: 'Op' });
        G.afegeix(f, 'bisectriu', ['B', 'A', 'C'], { id: 'b1' });
        G.afegeix(f, 'bisectriu', ['A', 'B', 'C'], { id: 'b2' });
        G.afegeix(f, 'interseccio', ['b1', 'b2', 0], { id: 'Ip' });
        G.afegeix(f, 'recta', ['B', 'C'], { id: 'l1' });
        G.afegeix(f, 'recta', ['A', 'C'], { id: 'l2' });
        G.afegeix(f, 'perpendicular', ['l1', 'A'], { id: 'h1' });
        G.afegeix(f, 'perpendicular', ['l2', 'B'], { id: 'h2' });
        G.afegeix(f, 'interseccio', ['h1', 'h2', 0], { id: 'Hp' });
        const v = G.avalua(f).valors;
        const igual = (a, b) => a && b && G.V.dist(a, b) < 1e-7 * Math.max(1, G.V.len(a));
        for (const [c, p] of [
            ['Gc', 'Gp'],
            ['Oc', 'Op'],
            ['Ic', 'Ip'],
            ['Hc', 'Hp'],
        ])
            if (!igual(v[c], v[p])) malament.push(`${k}:${c}`);
    }
    ok(
        '40 triangles: baricentre, circumcentre, incentre i ortocentre = primitives',
        !malament.length,
        malament.join(', ')
    );

    // trisectriu = gir de BA d'un terç de l'angle, amb el gir (primitiva)
    malament = [];
    for (let k = 0; k < 20; k++) {
        const f = fig();
        pts(f, { A: [rnd(), rnd()], B: [rnd(), rnd()], C: [rnd(), rnd()] });
        const v0 = G.avalua(f).valors;
        const u = G.V.sub(v0.A, v0.B),
            w = G.V.sub(v0.C, v0.B);
        const phi = (Math.atan2(G.V.cross(u, w), G.V.dot(u, w)) * 180) / Math.PI;
        for (const kk of [1, 2]) {
            G.afegeix(f, 'trisectriu', ['A', 'B', 'C', kk], { id: 't' + kk });
            G.afegeix(f, 'gir', ['A', 'B', (kk * phi) / 3], { id: 'R' + kk });
            G.afegeix(f, 'semirecta', ['B', 'R' + kk], { id: 'q' + kk });
        }
        const v = G.avalua(f).valors;
        for (const kk of [1, 2]) {
            const a = G.V.unit(G.V.sub(v['t' + kk].q, v['t' + kk].p)),
                b = G.V.unit(G.V.sub(v['q' + kk].q, v['q' + kk].p));
            if (!(G.V.dist(a, b) < 1e-9)) malament.push(`${k}:${kk}`);
        }
    }
    ok('20 angles: trisectrius = gir d’un terç (i de dos terços) de l’angle', !malament.length, malament.join(', '));

    // centre d'homotècia = intersecció de la recta dels centres amb la dels extrems de radis paral·lels
    malament = [];
    for (let k = 0; k < 20; k++) {
        const f = fig();
        pts(f, { O1: [rnd(), rnd()], O2: [rnd() + 12, rnd()] });
        const r1 = 1 + Math.abs(rnd()) / 2,
            r2 = r1 + 0.5 + Math.abs(rnd()) / 3;
        G.afegeix(f, 'circumferencia-radi', ['O1', r1], { id: 'c1' });
        G.afegeix(f, 'circumferencia-radi', ['O2', r2], { id: 'c2' });
        G.afegeix(f, 'centre-homotecia', ['c1', 'c2', 'ext'], { id: 'He' });
        G.afegeix(f, 'centre-homotecia', ['c1', 'c2', 'int'], { id: 'Hi' });
        G.afegeix(f, 'punt-sobre', ['c1', Math.PI / 2], { id: 'P1' });
        G.afegeix(f, 'punt-sobre', ['c2', Math.PI / 2], { id: 'P2' });
        G.afegeix(f, 'punt-sobre', ['c2', -Math.PI / 2], { id: 'P3' });
        G.afegeix(f, 'recta', ['O1', 'O2'], { id: 'r0' });
        G.afegeix(f, 'recta', ['P1', 'P2'], { id: 'r1' });
        G.afegeix(f, 'recta', ['P1', 'P3'], { id: 'r2' });
        G.afegeix(f, 'interseccio', ['r0', 'r1', 0], { id: 'Xe' });
        G.afegeix(f, 'interseccio', ['r0', 'r2', 0], { id: 'Xi' });
        const v = G.avalua(f).valors;
        if (!(v.He && v.Xe && G.V.dist(v.He, v.Xe) < 1e-7 * Math.max(1, G.V.len(v.He)))) malament.push(k + ':ext');
        if (!(v.Hi && v.Xi && G.V.dist(v.Hi, v.Xi) < 1e-9 * 20)) malament.push(k + ':int');
    }
    ok(
        '20 parelles de circumferències: centres d’homotècia exterior i interior = primitives',
        !malament.length,
        malament.join(', ')
    );
}

suite('4. Continuïtat de les branques');
{
    // c1: centre O (0, 0), radi 3, fix. c2: centre M (x, 1), radi 3; M va de x = −4 a x = 4.
    const f = fig();
    pts(f, { O: [0, 0], M: [-4, 1] });
    G.afegeix(f, 'circumferencia-radi', ['O', 3], { id: 'c1' });
    G.afegeix(f, 'circumferencia-radi', ['M', 3], { id: 'c2' });
    G.afegeix(f, 'interseccio', ['c1', 'c2', 0], { id: 'P' });
    let r = G.avalua(f),
        prev = r.valors.P,
        maxSalt = 0;
    for (let x = -4; x <= 4.0001; x += 0.02) {
        f.objectes.find(o => o.id === 'M').args[0] = x;
        r = G.avalua(f, { anterior: r.valors });
        if (prev && r.valors.P) maxSalt = Math.max(maxSalt, G.V.dist(prev, r.valors.P));
        prev = r.valors.P;
    }
    ok(`circumferència que es mou: cap salt de més de 0,1 per pas (màxim ${maxSalt.toFixed(3)})`, maxSalt < 0.1);
    // El parany clàssic: la recta AB i una circumferència; B passa a l'altra banda de A, el vector
    // director es gira i, amb la branca fixa, el punt salta a l'altra intersecció.
    const g = fig();
    pts(g, { O: [0, 0], A: [0, 1], B: [3.05, 1] });
    G.afegeix(g, 'circumferencia-radi', ['O', 3], { id: 'c' });
    G.afegeix(g, 'recta', ['A', 'B'], { id: 'r' });
    G.afegeix(g, 'interseccio', ['r', 'c', 0], { id: 'X' });
    let rg = G.avalua(g),
        prevC = rg.valors.X,
        prevF = rg.valors.X,
        saltC = 0,
        saltF = 0;
    for (let x = 3.05; x >= -3; x -= 0.1) {
        g.objectes.find(o => o.id === 'B').args[0] = x;
        rg = G.avalua(g, { anterior: rg.valors });
        const fixa = G.avalua(g).valors.X;
        saltC = Math.max(saltC, G.V.dist(prevC, rg.valors.X));
        saltF = Math.max(saltF, G.V.dist(prevF, fixa));
        prevC = rg.valors.X;
        prevF = fixa;
    }
    ok(
        `B passa a l’altra banda de A: seguint la posició anterior, el punt no es mou (salt màxim ${saltC.toFixed(3)})`,
        saltC < 1e-9
    );
    ok(`amb la branca fixa, salta a l’altra intersecció (salt ${saltF.toFixed(2)})`, saltF > 5);
    // En deixar-ho, es fixa la branca i, en tornar-la a calcular, surt el mateix punt
    G.fixaBranques(f, r);
    const despres = G.avalua(f).valors.P;
    ok('fixaBranques: sense la posició anterior surt el mateix punt', G.V.dist(despres, r.valors.P) < 1e-12);
    // Travessant una tangència real: el punt desapareix (null) i torna
    pts(f, { N: [5.5, 0] });
    G.afegeix(f, 'circumferencia-radi', ['N', 2], { id: 'c3' });
    G.afegeix(f, 'interseccio', ['c1', 'c3', 0], { id: 'Q' });
    const seq = [];
    for (const x of [4.5, 5.0, 5.5, 6.0]) {
        f.objectes.find(o => o.id === 'N').args[0] = x;
        seq.push(G.avalua(f).valors.Q ? 'p' : '-');
    }
    eq('tangència real (a x = 5): hi és, hi és, no hi és, no hi és', seq.join(''), 'pp--');
}

suite('5. Construcció i serialització');
{
    const f = fig();
    pts(f, { A: [0, 0], B: [4, 0], C: [1, 3] });
    eq('idNou: el punt següent és D', G.idNou(f, 'punt'), 'D');
    const s = G.afegeix(f, 'segment', ['A', 'B']);
    eq('idNou: el primer segment és s1', s.id, 's1');
    eq('idNou: la primera circumferència és c1', G.afegeix(f, 'circumferencia', ['A', 'C']).id, 'c1');
    const M = G.afegeix(f, 'punt-mig', ['A', 'B']);
    eq('un punt nou porta l’etiqueta del seu id', M.etiqueta.text, M.id);
    G.afegeix(
        f,
        'segment',
        ['M', 'C'].map(x => (x === 'M' ? M.id : x))
    );
    G.afegeix(f, 'marca-angle', ['B', 'A', 'C'], { opcions: { arcs: 2 } });
    let llançat = false;
    try {
        G.afegeix(f, 'segment', ['A', 'Z']);
    } catch (e) {
        llançat = true;
    }
    ok('afegeix: un argument que no existeix és un error', llançat);
    llançat = false;
    try {
        G.afegeix(f, 'segment', ['A', 's1']);
    } catch (e) {
        llançat = true;
    }
    ok('afegeix: un argument d’un tipus equivocat és un error', llançat);
    eq('dependents de A', G.dependents(f, 'A').join(' '), 's1 c1 D s2 m1');
    const text = G.serialitza(f);
    const r = G.llegeix(text);
    eq('anada i tornada: idèntica byte a byte', G.serialitza(r.fig), text);
    eq('anada i tornada: res descartat', r.descartats.length, 0);
    ok(
        'les opcions per defecte hi són (marca d’angle: radi)',
        JSON.parse(text).objectes.find(o => o.id === 'm1').opcions.radi === 0.5
    );
    const g = JSON.parse(text);
    g.objectes.push({ id: 'X', tipus: 'segment', args: ['A', 'C'] }); // vàlid
    g.objectes.unshift({ id: 'Y', tipus: 'segment', args: ['A', 'B'] }); // fa referència a objectes posteriors
    g.objectes.push({ id: 'Z', tipus: 'qualsevol', args: [] });
    g.objectes.push({ id: '<b>', tipus: 'punt', args: [1, 1] });
    const r2 = G.llegeix(g);
    eq(
        'llegeix: descarta les referències cap endavant, els tipus i els ids estranys',
        r2.descartats.join(' '),
        'Y Z <b>'
    );
    llançat = false;
    try {
        G.llegeix('{"versio":2,"objectes":[]}');
    } catch (e) {
        llançat = true;
    }
    ok('llegeix: una altra versió és un error', llançat);
    const esborrats = G.elimina(f, 'B');
    eq('elimina B: també el que en depèn', esborrats.join(' '), 'B s1 D s2 m1');
    eq('queden', f.objectes.map(o => o.id).join(' '), 'A C c1');
}

finish('GEOMOTOR');
