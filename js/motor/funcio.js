/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: js/motor/funcio.js
 * ROL: Gràfiques y = f(x): un analitzador segur d'expressions (sense eval ni
 *      Function: només un arbre de nombres, x, operacions i funcions d'una
 *      llista) i el mostreig adaptatiu de la corba, tallada a la finestra i
 *      partida a les asímptotes.
 * ARQUITECTURA: Pur, sense DOM.
 *   Gramàtica: suma := prod (('+'|'−') prod)* · prod := unari (('*'|'·'|'/'|res) unari)*
 *   (el producte implícit: 2x, 3(x+1), 2sin(x)) · unari := ('−'|'+') unari | pot ·
 *   pot := prim ('^' unari)? · prim := nombre | x | pi | e | funció(suma) | (suma) | |suma|
 *   Decimals amb coma o punt. Funcions: sin (sen), cos, tan (tg), asin, acos,
 *   atan, sqrt (arrel), abs, ln, log (base 10), exp. Com a molt 200 caràcters.
 *   Mostreig: 240 punts i subdivisió on la corba es doblega o canvia molt
 *   (fins a 8 nivells); es parteix on f no existeix o hi ha un salt més gran que
 *   l'alçada de la finestra (asímptota), i es retalla a [ymin, ymax].
 * DEPENDÈNCIES: cap
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var api = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else arrel.Funcio = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var MAX_LLARG = 200;
    var FUNCIONS = {
        sin: Math.sin,
        sen: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        tg: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,
        sqrt: Math.sqrt,
        arrel: Math.sqrt,
        abs: Math.abs,
        ln: Math.log,
        log: function (v) {
            return Math.log(v) / Math.LN10;
        },
        exp: Math.exp,
    };
    var CONSTANTS = { pi: Math.PI, π: Math.PI, e: Math.E };

    function Error_(missatge, posicio) {
        var e = new Error(missatge);
        e.posicio = posicio;
        return e;
    }

    // ── Fitxes ─────────────────────────────────────────────────────────────
    function fitxes(s) {
        var out = [],
            i = 0;
        while (i < s.length) {
            var c = s[i];
            if (/\s/.test(c)) {
                i++;
                continue;
            }
            var m = /^(\d+(?:[.,]\d+)?|[.,]\d+)/.exec(s.slice(i));
            if (m) {
                out.push({ t: 'num', v: parseFloat(m[1].replace(',', '.')), p: i });
                i += m[1].length;
                continue;
            }
            m = /^([a-zA-Zπ]+)/.exec(s.slice(i));
            if (m) {
                out.push({ t: 'nom', v: m[1].toLowerCase(), p: i });
                i += m[1].length;
                continue;
            }
            var op = {
                '+': '+',
                '-': '-',
                '−': '-',
                '*': '*',
                '·': '*',
                '×': '*',
                '/': '/',
                ':': '/',
                '^': '^',
                '(': '(',
                ')': ')',
                '|': '|',
            }[c];
            if (!op) throw Error_('No entenc el caràcter «' + c + '».', i);
            out.push({ t: op, p: i });
            i++;
        }
        return out;
    }

    /** L'arbre d'una expressió. Llança un error en català (amb .posicio) si no és vàlida. */
    function analitza(text) {
        text = String(text || '').trim();
        if (!text) throw Error_('Escriu una expressió, per exemple x^2.', 0);
        if (text.length > MAX_LLARG) throw Error_('L’expressió és massa llarga.', MAX_LLARG);
        var fx = fitxes(text),
            i = 0,
            prof = 0;
        var mira = function () {
            return fx[i];
        };
        var espera = function (t) {
            var f = fx[i];
            if (!f || f.t !== t)
                throw Error_(
                    t === ')'
                        ? 'Falta tancar un parèntesi.'
                        : t === '|'
                          ? 'Falta tancar un valor absolut.'
                          : 'Esperava «' + t + '».',
                    f ? f.p : text.length
                );
            i++;
        };
        var comencaPrimari = function (f) {
            return f && (f.t === 'num' || f.t === 'nom' || f.t === '(');
        };
        function suma() {
            if (++prof > 60) throw Error_('L’expressió és massa niada.', 0);
            var n = prod();
            while (mira() && (mira().t === '+' || mira().t === '-')) {
                var op = fx[i++].t;
                n = { op: op, a: n, b: prod() };
            }
            prof--;
            return n;
        }
        function prod() {
            var n = unari();
            for (;;) {
                var f = mira();
                if (f && (f.t === '*' || f.t === '/')) {
                    i++;
                    n = { op: f.t, a: n, b: unari() };
                } else if (comencaPrimari(f)) n = { op: '*', a: n, b: pot() };
                else return n;
            }
        }
        function unari() {
            var f = mira();
            if (f && f.t === '-') {
                i++;
                return { op: 'neg', a: unari() };
            }
            if (f && f.t === '+') {
                i++;
                return unari();
            }
            return pot();
        }
        function pot() {
            var b = prim();
            if (mira() && mira().t === '^') {
                i++;
                return { op: '^', a: b, b: unari() };
            }
            return b;
        }
        function prim() {
            var f = mira();
            if (!f) throw Error_('L’expressió s’acaba massa aviat.', text.length);
            if (f.t === 'num') {
                i++;
                return { num: f.v };
            }
            if (f.t === '(') {
                i++;
                var n = suma();
                espera(')');
                return n;
            }
            if (f.t === '|') {
                i++;
                var a = suma();
                espera('|');
                return { fn: 'abs', a: a };
            }
            if (f.t === 'nom') {
                i++;
                if (f.v === 'x') return { x: true };
                if (Object.prototype.hasOwnProperty.call(CONSTANTS, f.v)) return { num: CONSTANTS[f.v] };
                if (Object.prototype.hasOwnProperty.call(FUNCIONS, f.v)) {
                    if (!mira() || mira().t !== '(')
                        throw Error_('Després de ' + f.v + ' hi va un parèntesi: ' + f.v + '(x).', f.p);
                    i++;
                    var arg = suma();
                    espera(')');
                    return { fn: f.v, a: arg };
                }
                throw Error_('No conec «' + f.v + '». Fes servir x, nombres i funcions com sin, cos, sqrt, ln.', f.p);
            }
            throw Error_('No esperava «' + f.t + '».', f.p);
        }
        var arbre = suma();
        if (i < fx.length)
            throw Error_(
                fx[i].t === ')' ? 'Sobra un parèntesi.' : 'No esperava «' + (fx[i].v || fx[i].t) + '».',
                fx[i].p
            );
        return arbre;
    }

    function avaluaArbre(n, x) {
        if (n.num !== undefined) return n.num;
        if (n.x) return x;
        if (n.fn) return FUNCIONS[n.fn](avaluaArbre(n.a, x));
        if (n.op === 'neg') return -avaluaArbre(n.a, x);
        var a = avaluaArbre(n.a, x),
            b = avaluaArbre(n.b, x);
        switch (n.op) {
            case '+':
                return a + b;
            case '-':
                return a - b;
            case '*':
                return a * b;
            case '/':
                return a / b;
            case '^':
                // potències de base negativa amb exponent fraccionari de denominador senar (x^(1/3))
                if (a < 0 && !Number.isInteger(b)) {
                    var inv = 1 / b;
                    if (
                        Number.isInteger(Math.round(inv)) &&
                        Math.abs(inv - Math.round(inv)) < 1e-12 &&
                        Math.round(inv) % 2
                    )
                        return -Math.pow(-a, b);
                }
                return Math.pow(a, b);
        }
        return NaN;
    }

    /** Una funció f(x) a partir del text (o llança l'error de l'analitzador). */
    function compila(text) {
        var arbre = analitza(text);
        return function (x) {
            var y = avaluaArbre(arbre, x);
            return typeof y === 'number' && isFinite(y) ? y : NaN;
        };
    }

    // ── Mostreig ───────────────────────────────────────────────────────────
    /**
     * Les polilínies de la gràfica dins de la finestra.
     * @returns {Array<Array<[number, number]>>}
     */
    function mostreja(f, xmin, xmax, ymin, ymax, o) {
        o = o || {};
        var N = o.n || 240,
            H = ymax - ymin,
            W = xmax - xmin,
            tol = (o.tol || 0.002) * Math.max(H, W),
            max = o.profunditat || 8;
        var punts = [];
        var p0 = [xmin, f(xmin)];
        punts.push(p0);
        var subdivideix = function (a, b, prof) {
            var xm = (a[0] + b[0]) / 2,
                m = [xm, f(xm)];
            var dolent = !isFinite(a[1]) || !isFinite(b[1]) || !isFinite(m[1]);
            var desv = dolent ? Infinity : Math.abs(m[1] - (a[1] + b[1]) / 2);
            var fora = !dolent && Math.min(a[1], b[1], m[1]) > ymax + H && Math.max(a[1], b[1], m[1]) > ymax + H;
            var fora2 = !dolent && Math.max(a[1], b[1], m[1]) < ymin - H;
            if (prof < max && !fora && !fora2 && (desv > tol || (dolent && (isFinite(a[1]) || isFinite(b[1]))))) {
                subdivideix(a, m, prof + 1);
                subdivideix(m, b, prof + 1);
            } else {
                punts.push(b);
            }
        };
        for (var k = 1; k <= N; k++) {
            var x = xmin + (W * k) / N;
            var p = [x, f(x)];
            subdivideix(punts[punts.length - 1], p, 0);
        }
        // 1. Parteix on f no existeix i als salts (asímptotes: un salt de més de 2 alçades que
        //    passa d'una banda a l'altra de la finestra)
        var mig = (ymin + ymax) / 2,
            trossos = [],
            actual = [];
        punts.forEach(function (q) {
            if (!isFinite(q[1])) {
                if (actual.length) trossos.push(actual);
                actual = [];
                return;
            }
            var ant = actual[actual.length - 1];
            if (ant && Math.abs(q[1] - ant[1]) > 2 * H && (q[1] - mig) * (ant[1] - mig) < 0) {
                trossos.push(actual);
                actual = [];
            }
            actual.push(q);
        });
        if (actual.length) trossos.push(actual);
        // 2. Retalla cada tram a [ymin, ymax]
        var out = [];
        trossos.forEach(function (t) {
            var cur = [];
            var tanca = function () {
                if (cur.length > 1) out.push(cur);
                cur = [];
            };
            if (t.length === 1) return;
            for (var j = 1; j < t.length; j++) {
                var A = t[j - 1],
                    B = t[j];
                var t0 = 0,
                    t1 = 1,
                    dy = B[1] - A[1];
                if (dy === 0) {
                    if (A[1] < ymin || A[1] > ymax) t0 = 2;
                } else {
                    var ta = (ymin - A[1]) / dy,
                        tb = (ymax - A[1]) / dy;
                    t0 = Math.max(0, Math.min(ta, tb));
                    t1 = Math.min(1, Math.max(ta, tb));
                }
                if (t0 > t1) {
                    tanca();
                    continue;
                }
                var P0 = t0 === 0 ? A : [A[0] + t0 * (B[0] - A[0]), A[1] + t0 * dy];
                var P1 = t1 === 1 ? B : [A[0] + t1 * (B[0] - A[0]), A[1] + t1 * dy];
                if (t0 > 0) tanca();
                if (!cur.length) cur.push(P0);
                cur.push(P1);
                if (t1 < 1) tanca();
            }
            tanca();
        });
        return out;
    }

    return { FUNCIONS: Object.keys(FUNCIONS), analitza: analitza, compila: compila, mostreja: mostreja };
});
