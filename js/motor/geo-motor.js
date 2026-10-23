/**
 * ============================================================================
 * PROJECTE: step-quiz-commons (Step Quiz, vanilla JS) · el fan servir figures i teoremes
 * FITXER: js/motor/geo-motor.js   (a step-quiz-commons: fitxers/geo-motor.js)
 *
 * FITXER COMÚ: ve de step-quiz/step-quiz-commons i se sobreescriu sol cada dia
 * (workflow «Fitxers comuns»). No l'editis aquí: canvia'l a step-quiz-commons
 * (fitxers/geo-motor.js) i passa'n els tests (tests/geo-motor.test.js).
 *
 * ROL: GeoMotor: el motor de geometria dinàmica. Una construcció és una llista
 *      ordenada d'objectes; cada objecte només fa servir objectes anteriors.
 *      Avalua la construcció (punts, rectes, circumferències, polígons,
 *      transformacions, anotacions), tria la branca de les interseccions,
 *      afegeix i esborra objectes i serialitza la construcció.
 * ARQUITECTURA: Pur, sense DOM (es prova amb Node). Unitats: cm de paper,
 *      y cap amunt. Script clàssic amb exportació dual (window.GeoMotor o
 *      module.exports), perquè funcioni amb doble clic.
 *   Objecte: { id, tipus, args: [ids | nombres | text], estil: { gruix, trac, color },
 *              opcions: {...}, etiqueta: { text, desplacament: [dx, dy] } | null, visible }
 *   Valors:  punt { x, y } · línia { tipus: 'recta'|'segment'|'semirecta', p, q }
 *            circumferència { c, r } (arc: { c, r, arc: true, a0, a1 }, de a0 a a1 en sentit antihorari)
 *            polígon { punts } · la resta, el que necessita el dibuix. Indefinit: null (es propaga).
 *   Interseccions (args: a, b, branca). Regla fixa per a la branca, perquè en
 *   obrir un fitxer surti la mateixa figura:
 *     recta–circumferència: per ordre al llarg del vector director de la recta (0, 1);
 *     circumferència–circumferència: 0 si és a l'esquerra de c1 → c2 (producte
 *     vectorial positiu), 1 si és a la dreta. Tangència: un sol punt.
 *   Mentre s'arrossega: la solució més propera a la posició anterior
 *   (continuïtat); en deixar-ho, fixaBranques() desa la branca nova.
 *   segona-interseccio (a, b, P): l'altre punt de tall, el que no és P (no depèn de cap branca).
 *   Toleràncies relatives a l'escala de l'escena (la diagonal de la vista).
 * DEPENDÈNCIES: cap
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var api = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else arrel.GeoMotor = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERSIO = 1;
    var EPS = 1e-9;

    // ── Vectors ────────────────────────────────────────────────────────────
    var V = {
        sub: function (a, b) {
            return { x: a.x - b.x, y: a.y - b.y };
        },
        add: function (a, b) {
            return { x: a.x + b.x, y: a.y + b.y };
        },
        mul: function (a, k) {
            return { x: a.x * k, y: a.y * k };
        },
        dot: function (a, b) {
            return a.x * b.x + a.y * b.y;
        },
        cross: function (a, b) {
            return a.x * b.y - a.y * b.x;
        },
        len: function (a) {
            return Math.hypot(a.x, a.y);
        },
        dist: function (a, b) {
            return Math.hypot(a.x - b.x, a.y - b.y);
        },
        perp: function (a) {
            return { x: -a.y, y: a.x };
        },
        unit: function (a) {
            var l = Math.hypot(a.x, a.y);
            return l > 0 ? { x: a.x / l, y: a.y / l } : null;
        },
        rot: function (a, t) {
            var c = Math.cos(t),
                s = Math.sin(t);
            return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
        },
        angle: function (a) {
            return Math.atan2(a.y, a.x);
        },
    };
    var punt = function (x, y) {
        return { x: x, y: y };
    };
    var DOS_PI = 2 * Math.PI;
    var norm = function (t) {
        var r = t % DOS_PI;
        return r < 0 ? r + DOS_PI : r;
    };

    // ── Tipus ──────────────────────────────────────────────────────────────
    // args: P punt, L línia, C circumferència o arc, O línia o circumferència, G polígon,
    //       E eixos, n nombre, s text, '*P' una llista de punts (3 o més)
    var TIPUS = {
        'punt': { args: ['n', 'n'], classe: 'punt' },
        'punt-sobre': { args: ['O', 'n'], classe: 'punt' },
        'interseccio': { args: ['O', 'O', 'n'], classe: 'punt' },
        'punt-mig': { args: ['P', 'P'], classe: 'punt' },
        'recta': { args: ['P', 'P'], classe: 'linia' },
        'segment': { args: ['P', 'P'], classe: 'linia' },
        'semirecta': { args: ['P', 'P'], classe: 'linia' },
        'perpendicular': { args: ['L', 'P'], classe: 'linia' },
        'parallela': { args: ['L', 'P'], classe: 'linia' },
        'mediatriu': { args: ['P', 'P'], classe: 'linia' },
        'bisectriu': { args: ['P', 'P', 'P'], classe: 'linia' },
        'circumferencia': { args: ['P', 'P'], classe: 'cercle' },
        'circumferencia-radi': { args: ['P', 'n'], classe: 'cercle' },
        'arc': { args: ['P', 'P', 'P'], classe: 'cercle' },
        'poligon': { args: ['*P'], classe: 'poligon' },
        'poligon-regular': { args: ['P', 'P', 'n'], classe: 'poligon' },
        'gir': { args: ['P', 'P', 'n'], classe: 'punt' },
        'simetria': { args: ['P', 'L'], classe: 'punt' },
        'translacio': { args: ['P', 'P', 'P'], classe: 'punt' },
        'trisectriu': { args: ['P', 'P', 'P', 'n'], classe: 'linia' },
        'centre-homotecia': { args: ['C', 'C', 's'], classe: 'punt' },
        'segona-interseccio': { args: ['O', 'O', 'P'], classe: 'punt' },
        'circumcercle': { args: ['P', 'P', 'P'], classe: 'cercle' },
        'baricentre': { args: ['P', 'P', 'P'], classe: 'punt' },
        'circumcentre': { args: ['P', 'P', 'P'], classe: 'punt' },
        'incentre': { args: ['P', 'P', 'P'], classe: 'punt' },
        'ortocentre': { args: ['P', 'P', 'P'], classe: 'punt' },
        'marca-angle': { args: ['P', 'P', 'P'], classe: 'anotacio' },
        'marca-segment': { args: ['P', 'P'], classe: 'anotacio' },
        'cota': { args: ['P', 'P'], classe: 'anotacio' },
        'ombrejat': { args: ['G'], classe: 'anotacio' },
        'text': { args: ['n', 'n'], classe: 'anotacio' },
        'eixos': { args: [], classe: 'eixos' },
        'grafica': { args: ['E'], classe: 'grafica' },
    };
    var classe = function (tipus) {
        return TIPUS[tipus] ? TIPUS[tipus].classe : null;
    };

    // Opcions per defecte de cada tipus
    var OPCIONS = {
        'marca-angle': { arcs: 1, recte: 'auto', radi: 0.5, text: '' },
        'marca-segment': { ratlles: 1 },
        'cota': { desplacament: 0.5, text: '' },
        'ombrejat': { ombra: 'gris' },
        'text': { text: 'text' },
        'eixos': {
            xmin: -1,
            xmax: 6,
            ymin: -1,
            ymax: 4,
            pas: 1,
            numeros: true,
            graella: false,
            etiquetaX: 'x',
            etiquetaY: 'y',
        },
        'grafica': { expr: 'x^2', xmin: null, xmax: null },
    };
    var ESTIL = { gruix: 'normal', trac: 'continu', color: 'negre' };

    // ── Escala i tolerància ────────────────────────────────────────────────
    function escala(fig) {
        var v = fig.vista || { x0: 0, y0: 0, x1: 16, y1: 10 };
        return Math.max(1, Math.hypot(v.x1 - v.x0, v.y1 - v.y0));
    }

    // ── Pertinença ─────────────────────────────────────────────────────────
    /** Paràmetre t del punt P sobre la línia L (P = p + t(q − p)). */
    function parametre(L, P) {
        var d = V.sub(L.q, L.p);
        return V.dot(V.sub(P, L.p), d) / V.dot(d, d);
    }
    function dinsLinia(L, t, tol) {
        if (L.tipus === 'segment') return t >= -tol && t <= 1 + tol;
        if (L.tipus === 'semirecta') return t >= -tol;
        return true;
    }
    function dinsArc(C, P, tol) {
        if (!C.arc) return true;
        var a = norm(V.angle(V.sub(P, C.c)) - C.a0),
            tot = norm(C.a1 - C.a0);
        if (tot === 0) tot = DOS_PI;
        return a <= tot + tol || a >= DOS_PI - tol;
    }

    // ── Interseccions: totes les solucions, en l'ordre de la branca ────────
    // Retorna una llista de 0, 1 o 2 punts (o null per a cada branca que no és a l'objecte).
    function solucions(a, b, esc) {
        var ca = a.c ? 'cercle' : 'linia',
            cb = b.c ? 'cercle' : 'linia';
        var tolT = 1e-9;
        if (ca === 'linia' && cb === 'linia') {
            var d1 = V.sub(a.q, a.p),
                d2 = V.sub(b.q, b.p);
            var den = V.cross(d1, d2);
            if (Math.abs(den) <= EPS * V.len(d1) * V.len(d2)) return [];
            var t = V.cross(V.sub(b.p, a.p), d2) / den,
                u = V.cross(V.sub(b.p, a.p), d1) / den;
            var P = V.add(a.p, V.mul(d1, t));
            return [dinsLinia(a, t, tolT) && dinsLinia(b, u, tolT) ? P : null];
        }
        if (ca === 'cercle' && cb === 'linia') return solucions(b, a, esc);
        if (ca === 'linia') {
            // recta–circumferència: |p + t·d − c|² = r²
            var d = V.sub(a.q, a.p),
                f = V.sub(a.p, b.c);
            var A = V.dot(d, d),
                B = 2 * V.dot(f, d),
                Cc = V.dot(f, f) - b.r * b.r;
            var disc = B * B - 4 * A * Cc;
            // tangència: la distància del centre a la recta és r (relativament)
            var dist = Math.abs(V.cross(d, f)) / Math.sqrt(A);
            if (Math.abs(dist - b.r) <= 1e-9 * esc) {
                var tt = -B / (2 * A);
                var T = V.add(a.p, V.mul(d, tt));
                var ok = dinsLinia(a, tt, tolT) && dinsArc(b, T, 1e-9);
                return [ok ? T : null];
            }
            if (disc < 0) return [];
            var s = Math.sqrt(disc);
            return [(-B - s) / (2 * A), (-B + s) / (2 * A)].map(function (t) {
                var P = V.add(a.p, V.mul(d, t));
                return dinsLinia(a, t, tolT) && dinsArc(b, P, 1e-9) ? P : null;
            });
        }
        // circumferència–circumferència
        var e = V.sub(b.c, a.c),
            D = V.len(e);
        if (D <= EPS * esc) return [];
        var x = (a.r * a.r - b.r * b.r + D * D) / (2 * D);
        var h2 = a.r * a.r - x * x;
        var u2 = V.mul(e, 1 / D),
            n = V.perp(u2);
        var M = V.add(a.c, V.mul(u2, x));
        // tangència (exterior o interior): D = r1 + r2 o D = |r1 − r2|
        if (Math.abs(D - (a.r + b.r)) <= 1e-9 * esc || Math.abs(D - Math.abs(a.r - b.r)) <= 1e-9 * esc) {
            return [dinsArc(a, M, 1e-9) && dinsArc(b, M, 1e-9) ? M : null];
        }
        if (h2 < 0) return [];
        var h = Math.sqrt(h2);
        // branca 0: a l'esquerra de c1 → c2 (n és la normal esquerra); branca 1: a la dreta
        return [V.add(M, V.mul(n, h)), V.sub(M, V.mul(n, h))].map(function (P) {
            return dinsArc(a, P, 1e-9) && dinsArc(b, P, 1e-9) ? P : null;
        });
    }

    // ── Avaluació d'un objecte ─────────────────────────────────────────────
    function linia(tipus, p, q, esc) {
        if (!p || !q || V.dist(p, q) <= EPS * esc) return null;
        return { tipus: tipus, p: p, q: q };
    }
    function direccio(L) {
        return V.unit(V.sub(L.q, L.p));
    }
    var CALCUL = {
        'punt': function (a) {
            return punt(a[0], a[1]);
        },
        'punt-sobre': function (a) {
            var o = a[0],
                t = a[1];
            if (o.c) {
                var ang = t;
                if (o.arc) {
                    // fora de l'arc: a l'extrem més proper
                    var tot = norm(o.a1 - o.a0) || DOS_PI,
                        rel = norm(t - o.a0);
                    if (rel > tot) rel = rel - tot < DOS_PI - rel ? tot : 0;
                    ang = o.a0 + rel;
                }
                return V.add(o.c, { x: o.r * Math.cos(ang), y: o.r * Math.sin(ang) });
            }
            if (o.tipus === 'segment') t = Math.max(0, Math.min(1, t));
            else if (o.tipus === 'semirecta') t = Math.max(0, t);
            return V.add(o.p, V.mul(V.sub(o.q, o.p), t));
        },
        'punt-mig': function (a) {
            return punt((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2);
        },
        'recta': function (a, o, esc) {
            return linia('recta', a[0], a[1], esc);
        },
        'segment': function (a, o, esc) {
            return linia('segment', a[0], a[1], esc);
        },
        'semirecta': function (a, o, esc) {
            return linia('semirecta', a[0], a[1], esc);
        },
        'perpendicular': function (a, o, esc) {
            var d = direccio(a[0]);
            return d ? linia('recta', a[1], V.add(a[1], V.perp(d)), esc) : null;
        },
        'parallela': function (a, o, esc) {
            var d = direccio(a[0]);
            return d ? linia('recta', a[1], V.add(a[1], d), esc) : null;
        },
        'mediatriu': function (a, o, esc) {
            if (V.dist(a[0], a[1]) <= EPS * esc) return null;
            var M = CALCUL['punt-mig'](a);
            return linia('recta', M, V.add(M, V.perp(V.unit(V.sub(a[1], a[0])))), esc);
        },
        'bisectriu': function (a, o, esc) {
            var B = a[1],
                u = V.unit(V.sub(a[0], B)),
                w = V.unit(V.sub(a[2], B));
            if (!u || !w) return null;
            var d = V.add(u, w);
            if (V.len(d) <= 1e-12) d = V.perp(u); // angle pla
            return linia('semirecta', B, V.add(B, V.unit(d)), esc);
        },
        'circumferencia': function (a, o, esc) {
            var r = V.dist(a[0], a[1]);
            return r > EPS * esc ? { c: a[0], r: r } : null;
        },
        'circumferencia-radi': function (a) {
            return a[1] > 0 ? { c: a[0], r: a[1] } : null;
        },
        'arc': function (a, o, esc) {
            var r = V.dist(a[0], a[1]);
            if (r <= EPS * esc || V.dist(a[0], a[2]) <= EPS * esc) return null;
            return {
                c: a[0],
                r: r,
                arc: true,
                a0: norm(V.angle(V.sub(a[1], a[0]))),
                a1: norm(V.angle(V.sub(a[2], a[0]))),
            };
        },
        'poligon': function (a) {
            return a.length >= 3 ? { punts: a } : null;
        },
        'poligon-regular': function (a, o, esc) {
            var A = a[0],
                B = a[1],
                n = Math.round(a[2]);
            if (!(n >= 3 && n <= 24) || V.dist(A, B) <= EPS * esc) return null;
            var s = V.dist(A, B);
            var M = CALCUL['punt-mig']([A, B]);
            var O = V.add(M, V.mul(V.perp(V.unit(V.sub(B, A))), s / 2 / Math.tan(Math.PI / n)));
            var out = [];
            for (var k = 0; k < n; k++) out.push(V.add(O, V.rot(V.sub(A, O), (DOS_PI * k) / n)));
            return { punts: out };
        },
        'gir': function (a) {
            return V.add(a[1], V.rot(V.sub(a[0], a[1]), (a[2] * Math.PI) / 180));
        },
        'simetria': function (a) {
            var L = a[1],
                d = direccio(L);
            if (!d) return null;
            var w = V.sub(a[0], L.p);
            var proj = V.add(L.p, V.mul(d, V.dot(w, d)));
            return V.sub(V.mul(proj, 2), a[0]);
        },
        'translacio': function (a) {
            return V.add(a[0], V.sub(a[2], a[1]));
        },
        'trisectriu': function (a, o, esc) {
            var B = a[1],
                u = V.unit(V.sub(a[0], B)),
                w = V.unit(V.sub(a[2], B));
            var k = Math.round(a[3]);
            if (!u || !w || (k !== 1 && k !== 2)) return null;
            var phi = Math.atan2(V.cross(u, w), V.dot(u, w));
            return linia('semirecta', B, V.add(B, V.rot(u, (k * phi) / 3)), esc);
        },
        'centre-homotecia': function (a, o, esc) {
            var c1 = a[0],
                c2 = a[1];
            if (a[2] === 'ext') {
                if (Math.abs(c2.r - c1.r) <= EPS * esc) return null;
                return V.mul(V.sub(V.mul(c1.c, c2.r), V.mul(c2.c, c1.r)), 1 / (c2.r - c1.r));
            }
            if (a[2] === 'int') return V.mul(V.add(V.mul(c1.c, c2.r), V.mul(c2.c, c1.r)), 1 / (c1.r + c2.r));
            return null;
        },
        'circumcercle': function (a, o, esc) {
            var O = CALCUL.circumcentre(a, o, esc);
            return O ? { c: O, r: V.dist(O, a[0]) } : null;
        },
        'baricentre': function (a) {
            return punt((a[0].x + a[1].x + a[2].x) / 3, (a[0].y + a[1].y + a[2].y) / 3);
        },
        'circumcentre': function (a, o, esc) {
            var A = a[0],
                B = a[1],
                C = a[2];
            var d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
            if (Math.abs(d) <= EPS * esc * esc) return null;
            var a2 = A.x * A.x + A.y * A.y,
                b2 = B.x * B.x + B.y * B.y,
                c2 = C.x * C.x + C.y * C.y;
            return punt(
                (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d,
                (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d
            );
        },
        'incentre': function (a, o, esc) {
            var A = a[0],
                B = a[1],
                C = a[2];
            var la = V.dist(B, C),
                lb = V.dist(C, A),
                lc = V.dist(A, B),
                s = la + lb + lc;
            if (Math.abs(V.cross(V.sub(B, A), V.sub(C, A))) <= EPS * esc * esc) return null;
            return punt((la * A.x + lb * B.x + lc * C.x) / s, (la * A.y + lb * B.y + lc * C.y) / s);
        },
        'ortocentre': function (a, o, esc) {
            var O = CALCUL.circumcentre(a, o, esc);
            if (!O) return null;
            // H = A + B + C − 2·O
            return punt(a[0].x + a[1].x + a[2].x - 2 * O.x, a[0].y + a[1].y + a[2].y - 2 * O.y);
        },
        'marca-angle': function (a) {
            return { A: a[0], B: a[1], C: a[2] };
        },
        'marca-segment': function (a) {
            return { P: a[0], Q: a[1] };
        },
        'cota': function (a) {
            return { P: a[0], Q: a[1] };
        },
        'ombrejat': function (a) {
            return { punts: a[0].punts };
        },
        'text': function (a) {
            return punt(a[0], a[1]);
        },
        'eixos': function (a, o) {
            var op = o.opcions;
            return op.xmax > op.xmin && op.ymax > op.ymin && op.pas > 0
                ? { xmin: op.xmin, xmax: op.xmax, ymin: op.ymin, ymax: op.ymax }
                : null;
        },
        'grafica': function (a) {
            return { eixos: a[0] };
        },
    };

    /**
     * Avalua la construcció en ordre.
     * @param {object} fig  { objectes, vista }
     * @param {object} [o]  { anterior: valors d'una avaluació anterior (per a la continuïtat de les interseccions) }
     * @returns {{ valors: Object<string, *>, branques: Object<string, number> }}
     */
    function avalua(fig, o) {
        o = o || {};
        var esc = escala(fig),
            valors = {},
            branques = {};
        fig.objectes.forEach(function (ob) {
            var def = TIPUS[ob.tipus];
            var v = null;
            if (def) {
                var args = [],
                    bo = true;
                ob.args.forEach(function (x, i) {
                    var tipusArg = def.args[0] === '*P' ? 'P' : def.args[i];
                    if (tipusArg === 'n' || tipusArg === 's') args.push(x);
                    else {
                        var val = valors[x];
                        if (val === null || val === undefined) bo = false;
                        args.push(val);
                    }
                });
                if (bo) {
                    if (ob.tipus === 'segona-interseccio') {
                        // l'altre punt de tall (el més lluny del punt conegut); si és tangent, el mateix
                        var lluny = null,
                            dmax = -1;
                        solucions(args[0], args[1], esc).forEach(function (S) {
                            if (S && V.dist(S, args[2]) > dmax) {
                                dmax = V.dist(S, args[2]);
                                lluny = S;
                            }
                        });
                        v = lluny;
                    } else if (ob.tipus === 'interseccio') {
                        var sol = solucions(args[0], args[1], esc);
                        var b = Math.round(args[2]) === 1 ? 1 : 0;
                        var ant = o.anterior && o.anterior[ob.id];
                        if (sol.length === 2 && ant && sol[0] && sol[1])
                            b = V.dist(sol[0], ant) <= V.dist(sol[1], ant) ? 0 : 1;
                        v = sol.length === 0 ? null : sol.length === 1 ? sol[0] : sol[b];
                        branques[ob.id] = sol.length === 2 ? b : Math.round(args[2]) || 0;
                    } else {
                        try {
                            v = CALCUL[ob.tipus](args, ob, esc);
                        } catch (e) {
                            v = null;
                        }
                    }
                    if (v && v.x !== undefined && !(isFinite(v.x) && isFinite(v.y))) v = null;
                }
            }
            valors[ob.id] = v;
        });
        return { valors: valors, branques: branques };
    }

    /** Desa a cada intersecció la branca que s'ha fet servir (quan l'usuari deixa d'arrossegar). */
    function fixaBranques(fig, resultat) {
        fig.objectes.forEach(function (ob) {
            if (ob.tipus === 'interseccio' && resultat.branques[ob.id] !== undefined)
                ob.args[2] = resultat.branques[ob.id];
        });
        return fig;
    }

    // ── Construcció ────────────────────────────────────────────────────────
    var PREFIX = { linia: 'r', cercle: 'c', poligon: 'p', anotacio: 'm', eixos: 'e', grafica: 'g' };
    var PREFIX_TIPUS = { segment: 's', cota: 'k', ombrejat: 'o', text: 't', arc: 'a' };
    var LLETRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    /** L'id següent per a un tipus: A, B, … Z, A1, B1… per als punts; s1, r1, c1… per a la resta. */
    function idNou(fig, tipus) {
        var usats = {};
        fig.objectes.forEach(function (o) {
            usats[o.id] = true;
        });
        if (classe(tipus) === 'punt') {
            for (var n = 0; ; n++)
                for (var i = 0; i < LLETRES.length; i++) {
                    var id = LLETRES[i] + (n ? n : '');
                    if (!usats[id]) return id;
                }
        }
        var p = PREFIX_TIPUS[tipus] || PREFIX[classe(tipus)] || 'x';
        for (var k = 1; ; k++) if (!usats[p + k]) return p + k;
    }

    function copiaOpcions(tipus) {
        return JSON.parse(JSON.stringify(OPCIONS[tipus] || {}));
    }

    /** Un objecte amb tots els camps, en un ordre fix (per serialitzar sempre igual). */
    function normalitza(o) {
        var est = o.estil || {};
        var op = copiaOpcions(o.tipus);
        Object.keys(o.opcions || {}).forEach(function (k) {
            if (Object.prototype.hasOwnProperty.call(op, k)) op[k] = o.opcions[k];
        });
        var et =
            o.etiqueta && typeof o.etiqueta.text === 'string'
                ? {
                      text: o.etiqueta.text,
                      desplacament: (o.etiqueta.desplacament || [0.15, 0.15]).slice(0, 2).map(Number),
                  }
                : null;
        return {
            id: String(o.id),
            tipus: o.tipus,
            args: (o.args || []).slice(),
            estil: { gruix: est.gruix || ESTIL.gruix, trac: est.trac || ESTIL.trac, color: est.color || ESTIL.color },
            opcions: op,
            etiqueta: et,
            visible: o.visible !== false,
        };
    }

    /** Comprova que els arguments són del tipus que toca i que fan referència a objectes anteriors. */
    function argsValids(fig, tipus, args, fins) {
        var def = TIPUS[tipus];
        if (!def) return false;
        var anteriors = {};
        fig.objectes.slice(0, fins === undefined ? fig.objectes.length : fins).forEach(function (o) {
            anteriors[o.id] = o;
        });
        var llista = def.args[0] === '*P';
        if (!llista && args.length !== def.args.length) return false;
        if (llista && args.length < 3) return false;
        return args.every(function (x, i) {
            var t = llista ? 'P' : def.args[i];
            if (t === 'n') return typeof x === 'number' && isFinite(x);
            if (t === 's') return typeof x === 'string';
            var o = anteriors[x];
            if (!o) return false;
            var c = classe(o.tipus);
            if (t === 'P') return c === 'punt';
            if (t === 'L') return c === 'linia';
            if (t === 'C') return c === 'cercle';
            if (t === 'O') return c === 'linia' || c === 'cercle';
            if (t === 'G') return c === 'poligon';
            if (t === 'E') return c === 'eixos';
            return false;
        });
    }

    /**
     * Afegeix un objecte al final. Els punts reben l'etiqueta del seu id.
     * @returns {object} l'objecte nou (normalitzat)
     */
    function afegeix(fig, tipus, args, extra) {
        if (!argsValids(fig, tipus, args))
            throw new Error('arguments no vàlids per a ' + tipus + ': ' + JSON.stringify(args));
        extra = extra || {};
        var id = extra.id || idNou(fig, tipus);
        if (
            fig.objectes.some(function (o) {
                return o.id === id;
            })
        )
            throw new Error('id repetit: ' + id);
        var et =
            extra.etiqueta !== undefined
                ? extra.etiqueta
                : classe(tipus) === 'punt'
                  ? { text: id, desplacament: [0.15, 0.15] }
                  : null;
        var o = normalitza({
            id: id,
            tipus: tipus,
            args: args,
            estil: extra.estil,
            opcions: extra.opcions,
            etiqueta: et,
            visible: extra.visible,
        });
        fig.objectes.push(o);
        return o;
    }

    /** Els ids dels objectes que depenen (directament o no) de l'objecte id, en ordre. */
    function dependents(fig, id) {
        var dep = {};
        dep[id] = true;
        var out = [];
        fig.objectes.forEach(function (o) {
            var def = TIPUS[o.tipus];
            var usa = o.args.some(function (x, i) {
                var t = def && (def.args[0] === '*P' ? 'P' : def.args[i]);
                return t !== 'n' && t !== 's' && dep[x];
            });
            if (usa && !dep[o.id]) {
                dep[o.id] = true;
                out.push(o.id);
            }
        });
        return out;
    }

    /** Esborra l'objecte i tots els que en depenen. Retorna els ids esborrats. */
    function elimina(fig, id) {
        var fora = [id].concat(dependents(fig, id));
        fig.objectes = fig.objectes.filter(function (o) {
            return fora.indexOf(o.id) < 0;
        });
        return fora;
    }

    // ── Serialització ──────────────────────────────────────────────────────
    function nova(vista) {
        return { versio: VERSIO, unitats: 'cm', objectes: [], vista: vista || { x0: 0, y0: 0, x1: 16, y1: 10 } };
    }
    /** El text JSON de la construcció, sempre igual per a la mateixa construcció. */
    function serialitza(fig) {
        var v = fig.vista;
        return JSON.stringify({
            versio: VERSIO,
            unitats: 'cm',
            objectes: fig.objectes.map(normalitza),
            vista: { x0: v.x0, y0: v.y0, x1: v.x1, y1: v.y1 },
        });
    }
    /**
     * Llegeix una construcció (text JSON o objecte). Comprova la versió, els tipus i que cada
     * objecte només faci servir objectes anteriors; descarta el que no ho compleix.
     * @returns {{ fig, descartats: string[] }}
     */
    function llegeix(entrada) {
        var d = typeof entrada === 'string' ? JSON.parse(entrada) : entrada;
        if (!d || d.versio !== VERSIO || !Array.isArray(d.objectes))
            throw new Error('no és una figura (versió ' + VERSIO + ')');
        var v = d.vista || {};
        var vista =
            [v.x0, v.y0, v.x1, v.y1].every(function (n) {
                return typeof n === 'number' && isFinite(n);
            }) &&
            v.x1 > v.x0 &&
            v.y1 > v.y0
                ? { x0: v.x0, y0: v.y0, x1: v.x1, y1: v.y1 }
                : { x0: 0, y0: 0, x1: 16, y1: 10 };
        var fig = nova(vista),
            descartats = [];
        d.objectes.forEach(function (o) {
            if (
                !o ||
                typeof o.id !== 'string' ||
                !/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(o.id) ||
                !TIPUS[o.tipus] ||
                !Array.isArray(o.args) ||
                !argsValids(fig, o.tipus, o.args) ||
                fig.objectes.some(function (x) {
                    return x.id === o.id;
                })
            ) {
                descartats.push(o && o.id);
                return;
            }
            fig.objectes.push(normalitza(o));
        });
        return { fig: fig, descartats: descartats };
    }

    return {
        VERSIO: VERSIO,
        EPS: EPS,
        TIPUS: TIPUS,
        OPCIONS: OPCIONS,
        ESTIL: ESTIL,
        V: V,
        classe: classe,
        escala: escala,
        solucions: solucions,
        parametre: parametre,
        avalua: avalua,
        fixaBranques: fixaBranques,
        idNou: idNou,
        normalitza: normalitza,
        argsValids: argsValids,
        afegeix: afegeix,
        dependents: dependents,
        elimina: elimina,
        nova: nova,
        serialitza: serialitza,
        llegeix: llegeix,
    };
});
