/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: tests/funcio.test.js
 * ROL: Tests de les gràfiques y = f(x) (js/motor/funcio.js):
 *   1. L'analitzador dona el mateix que Math per a una taula d'expressions
 *      (decimals amb coma, producte implícit, prioritats, valor absolut…).
 *   2. Rebutja el que no és una expressió (cap codi s'executa) amb un missatge.
 *   3. Mostreig: la polilínia és a prop de la corba de veritat, dins de la
 *      finestra, i es parteix a les asímptotes i on f no existeix.
 * ÚS: node tests/funcio.test.js
 * ============================================================================
 */
'use strict';
const { suite, ok, eq, finish } = require('./harness');
const F = require('../js/motor/funcio.js');

suite('1. L’analitzador');
{
    const TAULA = [
        ['x^2', x => x * x],
        ['2x+1', x => 2 * x + 1],
        ['3(x+1)', x => 3 * (x + 1)],
        ['x(x-1)', x => x * (x - 1)],
        ['-x^2', x => -(x * x)],
        ['2^-x', x => Math.pow(2, -x)],
        ['2^3^2', () => 512],
        ['1/2x', x => (1 / 2) * x],
        ['2,5x − 1', x => 2.5 * x - 1],
        ['0.5·x', x => 0.5 * x],
        ['sin(x)+cos(x)', x => Math.sin(x) + Math.cos(x)],
        ['sen(x)·tg(x)', x => Math.sin(x) * Math.tan(x)],
        ['2sin(pi x)', x => 2 * Math.sin(Math.PI * x)],
        ['|x-3|', x => Math.abs(x - 3)],
        ['abs(x)+sqrt(4)', x => Math.abs(x) + 2],
        ['arrel(x^2+1)', x => Math.sqrt(x * x + 1)],
        ['ln(e)+log(100)', () => 3],
        ['exp(x)/e', x => Math.exp(x) / Math.E],
        ['x^(1/3)', x => Math.cbrt(x)],
        ['(x+1)(x-1)', x => (x + 1) * (x - 1)],
        ['x/2/2', x => x / 4],
        ['atan(x)+asin(0)+acos(1)', x => Math.atan(x)],
    ];
    for (const [e, ref] of TAULA) {
        const f = F.compila(e);
        const mal = [-3.5, -1, 0.25, 2, 7].filter(x => {
            const a = f(x),
                b = ref(x);
            return !(Number.isNaN(a) && Number.isNaN(b)) && !(Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b)));
        });
        ok(`«${e}»`, !mal.length, mal.join(', '));
    }
    ok(
        'fora del domini: NaN (sqrt(−1), ln(0))',
        Number.isNaN(F.compila('sqrt(x)')(-1)) && Number.isNaN(F.compila('ln(x)')(0))
    );
}

suite('2. El que no és una expressió');
{
    const MAL = [
        '',
        'alert(1)',
        'x;y',
        'constructor',
        '__proto__',
        'this',
        'x=1',
        'sin x',
        '(x+1',
        'x)',
        '2**3',
        'x[0]',
        '"x"',
        'Math.PI',
        'f(x)',
        'x'.repeat(201),
    ];
    for (const e of MAL) {
        let missatge = null;
        try {
            F.compila(e);
        } catch (err) {
            missatge = err.message;
        }
        ok(`rebutja «${e.slice(0, 20)}»${missatge ? ': ' + missatge : ''}`, missatge !== null);
    }
}

suite('3. El mostreig');
{
    const dins = (L, y0, y1) => L.every(l => l.every(p => p[1] >= y0 - 1e-9 && p[1] <= y1 + 1e-9));
    // x² a [−3, 3] × [−1, 9]: un sol tros, a prop de la corba
    let L = F.mostreja(F.compila('x^2'), -3, 3, -1, 9);
    eq('x²: un tros', L.length, 1);
    let err = 0;
    for (const l of L)
        for (let i = 1; i < l.length; i++) {
            const xm = (l[i - 1][0] + l[i][0]) / 2,
                ym = (l[i - 1][1] + l[i][1]) / 2;
            err = Math.max(err, Math.abs(ym - xm * xm));
        }
    ok(`x²: la corda es desvia menys de 0,05 (${err.toFixed(4)})`, err < 0.05);
    ok(
        'x²: comença i acaba a la vora de la finestra',
        Math.abs(L[0][0][0] + 3) < 1e-9 && Math.abs(L[0][L[0].length - 1][0] - 3) < 1e-9
    );
    // x² a [−4, 4] × [−1, 9]: retallada a y = 9 (x = ±3)
    L = F.mostreja(F.compila('x^2'), -4, 4, -1, 9);
    ok('x² retallada: tot dins de la finestra', dins(L, -1, 9));
    ok('x² retallada: comença a (−3, 9)', Math.abs(L[0][0][0] + 3) < 1e-6 && Math.abs(L[0][0][1] - 9) < 1e-9);
    // 1/x: dos trossos, cap travessa l'asímptota
    L = F.mostreja(F.compila('1/x'), -2, 2, -3, 3);
    eq('1/x: dos trossos', L.length, 2);
    ok(
        '1/x: el primer, a l’esquerra de 0; el segon, a la dreta',
        L[0].every(p => p[0] < 0) && L[1].every(p => p[0] > 0)
    );
    ok('1/x: dins de la finestra', dins(L, -3, 3));
    // tan(x) a [−4, 4]: tres trossos
    L = F.mostreja(F.compila('tan(x)'), -4, 4, -3, 3);
    eq('tan x a [−4, 4]: tres trossos (asímptotes a ±π/2)', L.length, 3);
    // sqrt(x) a [−1, 4]: comença a x = 0
    L = F.mostreja(F.compila('sqrt(x)'), -1, 4, -1, 3);
    ok('√x: un tros que comença a x ≈ 0', L.length === 1 && Math.abs(L[0][0][0]) < 0.01);
    // una funció que no existeix enlloc
    eq('ln(−x²−1): cap tros', F.mostreja(F.compila('ln(-x^2-1)'), -2, 2, -2, 2).length, 0);
    // fora de la finestra del tot
    eq('x + 100: cap tros dins de [−5, 5]', F.mostreja(F.compila('x+100'), -5, 5, -5, 5).length, 0);
}

finish('FUNCIONS');
