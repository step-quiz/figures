/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: js/motor/dibuix.js
 * ROL: Converteix una construcció avaluada en primitives de dibuix (línies,
 *      cercles, arcs, farcits, punts, fletxes i textos) amb coordenades en cm.
 *      Les fan servir l'editor, l'exportació TikZ, la SVG i la PNG: així totes
 *      dibuixen exactament el mateix.
 * ARQUITECTURA: Pur, sense DOM. Coordenades matemàtiques (y cap amunt), en cm.
 *   Primitives (totes porten l'id de l'objecte i, si cal, gruix, trac i color):
 *     { k: 'linia', punts: [[x, y], …], tancat }   { k: 'cercle', c, r }
 *     { k: 'arc', c, r, a0, a1 } (graus, de a0 a a1 en sentit antihorari, a1 > a0)
 *     { k: 'farcit', punts, gris }  { k: 'punt', c }  { k: 'fletxa', punta, angle }
 *     { k: 'text', p, text, ancora, mida }
 *   Ordre: farcits i graelles, línies, punts i, al final, els textos.
 *   Rectes i semirectes es retallen a la vista. Tot el que no és una recta pot
 *   sortir de la vista. Les marques (angle, segment, cota) es calculen aquí:
 *   l'exportació TikZ només escriu coordenades, mai construccions.
 * DEPENDÈNCIES: js/motor/geo-motor.js, js/motor/funcio.js
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var node = typeof module === 'object' && module.exports;
    var G = node ? require('./geo-motor.js') : arrel.GeoMotor;
    var F = node ? require('./funcio.js') : arrel.Funcio;
    var api = fabrica(G, F);
    if (node) module.exports = api;
    else arrel.Dibuix = api;
})(typeof self !== 'undefined' ? self : this, function (G, F) {
    'use strict';
    var V = G.V;

    var MIDES = {
        punt: 0.05, // radi del punt (cm)
        ratlla: 0.12, // mitja llargada de les ratlles de segment
        separacioRatlles: 0.08,
        separacioArcs: 0.08,
        fletxa: 0.18, // llargada de la punta de fletxa
        marcaEix: 0.08,
        ratllat: 0.2, // separació de l'ombrejat ratllat
    };

    var arr = function (P) {
        return [P.x, P.y];
    };
    var graus = function (rad) {
        return (rad * 180) / Math.PI;
    };

    /** L'àncora del text segons la direcció del desplaçament (el text queda a l'altra banda). */
    function ancora(dx, dy) {
        if (Math.hypot(dx, dy) < 1e-9) return 'center';
        var a = Math.atan2(dy, dx);
        var sector = Math.round(a / (Math.PI / 4));
        return {
            '0': 'west',
            '1': 'south west',
            '2': 'south',
            '3': 'south east',
            '4': 'east',
            '-4': 'east',
            '-3': 'north east',
            '-2': 'north',
            '-1': 'north west',
        }[sector];
    }

    // ── Retall d'una recta a la vista (Liang–Barsky) ───────────────────────
    function retalla(P, d, tmin, tmax, vista) {
        var t0 = tmin,
            t1 = tmax;
        var proves = [
            [-d.x, P.x - vista.x0],
            [d.x, vista.x1 - P.x],
            [-d.y, P.y - vista.y0],
            [d.y, vista.y1 - P.y],
        ];
        for (var i = 0; i < 4; i++) {
            var p = proves[i][0],
                q = proves[i][1];
            if (Math.abs(p) < 1e-15) {
                if (q < 0) return null;
            } else {
                var r = q / p;
                if (p < 0) t0 = Math.max(t0, r);
                else t1 = Math.min(t1, r);
            }
        }
        return t0 <= t1 ? [V.add(P, V.mul(d, t0)), V.add(P, V.mul(d, t1))] : null;
    }

    // ── Ombrejat ratllat: rectes a 45° retallades al polígon (parell–senar) ─
    function ratllat(punts, sep) {
        var u = { x: Math.SQRT1_2, y: Math.SQRT1_2 },
            n = { x: -Math.SQRT1_2, y: Math.SQRT1_2 };
        var proj = punts.map(function (P) {
            return V.dot(P, n);
        });
        var lo = Math.min.apply(null, proj),
            hi = Math.max.apply(null, proj);
        var out = [];
        for (var c = Math.ceil(lo / sep) * sep; c <= hi; c += sep) {
            var ts = [];
            for (var i = 0; i < punts.length; i++) {
                var A = punts[i],
                    B = punts[(i + 1) % punts.length];
                var da = V.dot(A, n) - c,
                    db = V.dot(B, n) - c;
                if (da < 0 !== db < 0) {
                    var X = V.add(A, V.mul(V.sub(B, A), da / (da - db)));
                    ts.push(V.dot(X, u));
                }
            }
            ts.sort(function (a, b) {
                return a - b;
            });
            for (var j = 0; j + 1 < ts.length; j += 2) {
                var base = V.mul(n, c);
                out.push([V.add(base, V.mul(u, ts[j])), V.add(base, V.mul(u, ts[j + 1]))]);
            }
        }
        return out;
    }

    function format(v, dec) {
        var s = (Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec)).toFixed(dec);
        s = s.replace(/\.?0+$/, '');
        if (s === '-0') s = '0';
        return s.replace('.', ',').replace('-', '−');
    }

    /**
     * Les primitives de la construcció.
     * @param {object} fig       la construcció
     * @param {object} [res]     el resultat de GeoMotor.avalua (si no, s'avalua)
     * @param {object} [o]       { amagats: true (l'editor: també els amagats, marcats amb amagat: true) }
     */
    function primitives(fig, res, o) {
        o = o || {};
        res = res || G.avalua(fig);
        var v = res.valors,
            vista = fig.vista;
        var fons = [],
            linies = [],
            punts = [],
            textos = [];
        fig.objectes.forEach(function (ob) {
            var val = v[ob.id];
            if (val === null || val === undefined) return;
            if (!ob.visible && !o.amagats) return;
            var est = { id: ob.id, gruix: ob.estil.gruix, trac: ob.estil.trac, color: ob.estil.color };
            if (!ob.visible) est.amagat = true;
            // L'estil de l'objecte, si la primitiva no en porta un de propi (graella, marques…)
            var amb = function (p) {
                for (var k in est) if (p[k] === undefined) p[k] = est[k];
                return p;
            };
            var cls = G.classe(ob.tipus),
                op = ob.opcions;
            var etiqueta = function (P, dir) {
                if (!ob.etiqueta || !ob.etiqueta.text) return;
                var d = ob.etiqueta.desplacament || [0, 0];
                textos.push(
                    amb({
                        k: 'text',
                        p: [P.x + d[0], P.y + d[1]],
                        text: ob.etiqueta.text,
                        ancora: ancora(d[0], d[1]),
                        mida: 'normal',
                        etiqueta: true,
                    })
                );
            };
            if (cls === 'punt') {
                punts.push(amb({ k: 'punt', c: arr(val) }));
                etiqueta(val);
            } else if (cls === 'linia') {
                var d = V.sub(val.q, val.p),
                    seg;
                if (val.tipus === 'segment') seg = [val.p, val.q];
                else seg = retalla(val.p, d, val.tipus === 'semirecta' ? 0 : -Infinity, Infinity, vista);
                if (!seg) return;
                linies.push(amb({ k: 'linia', punts: [arr(seg[0]), arr(seg[1])], tancat: false }));
                var t = val.tipus === 'segment' ? 0.5 : 0.85;
                etiqueta(V.add(seg[0], V.mul(V.sub(seg[1], seg[0]), t)));
            } else if (cls === 'cercle') {
                if (val.arc) {
                    var a0 = graus(val.a0),
                        a1 = graus(val.a1);
                    while (a1 <= a0) a1 += 360;
                    linies.push(amb({ k: 'arc', c: arr(val.c), r: val.r, a0: a0, a1: a1 }));
                    var am = ((a0 + a1) / 2) * (Math.PI / 180);
                    etiqueta(V.add(val.c, { x: val.r * Math.cos(am), y: val.r * Math.sin(am) }));
                } else {
                    linies.push(amb({ k: 'cercle', c: arr(val.c), r: val.r }));
                    etiqueta(V.add(val.c, { x: val.r * Math.SQRT1_2, y: val.r * Math.SQRT1_2 }));
                }
            } else if (cls === 'poligon') {
                linies.push(amb({ k: 'linia', punts: val.punts.map(arr), tancat: true }));
                var cx = 0,
                    cy = 0;
                val.punts.forEach(function (P) {
                    cx += P.x / val.punts.length;
                    cy += P.y / val.punts.length;
                });
                etiqueta({ x: cx, y: cy });
            } else if (ob.tipus === 'marca-angle') {
                var B = val.B,
                    u = V.unit(V.sub(val.A, B)),
                    w = V.unit(V.sub(val.C, B));
                if (!u || !w) return;
                if (V.cross(u, w) < 0) {
                    var tmp = u;
                    u = w;
                    w = tmp;
                }
                var ang = Math.atan2(V.cross(u, w), V.dot(u, w)); // 0..π
                var recte = op.recte === true || (op.recte === 'auto' && Math.abs(ang - Math.PI / 2) < 1e-4);
                var radi = op.radi;
                if (recte) {
                    var s = radi * 0.7;
                    linies.push(
                        amb({
                            k: 'linia',
                            punts: [
                                arr(V.add(B, V.mul(u, s))),
                                arr(V.add(B, V.add(V.mul(u, s), V.mul(w, s)))),
                                arr(V.add(B, V.mul(w, s))),
                            ],
                            tancat: false,
                        })
                    );
                } else {
                    for (var k = 0; k < op.arcs; k++)
                        linies.push(
                            amb({
                                k: 'arc',
                                c: arr(B),
                                r: radi + k * MIDES.separacioArcs,
                                a0: graus(V.angle(u)),
                                a1: graus(V.angle(u)) + graus(ang),
                            })
                        );
                }
                if (op.text) {
                    var bis = V.unit(V.add(u, w)) || V.perp(u);
                    textos.push(
                        amb({
                            k: 'text',
                            p: arr(V.add(B, V.mul(bis, radi + 0.22 + (op.arcs - 1) * MIDES.separacioArcs))),
                            text: op.text,
                            ancora: 'center',
                            mida: 'normal',
                        })
                    );
                }
            } else if (ob.tipus === 'marca-segment') {
                var M = V.mul(V.add(val.P, val.Q), 0.5),
                    du = V.unit(V.sub(val.Q, val.P));
                if (!du) return;
                var nn = V.perp(du);
                for (var r = 0; r < op.ratlles; r++) {
                    var off = (r - (op.ratlles - 1) / 2) * MIDES.separacioRatlles;
                    var C0 = V.add(M, V.mul(du, off));
                    linies.push(
                        amb({
                            k: 'linia',
                            punts: [arr(V.sub(C0, V.mul(nn, MIDES.ratlla))), arr(V.add(C0, V.mul(nn, MIDES.ratlla)))],
                            tancat: false,
                        })
                    );
                }
            } else if (ob.tipus === 'cota') {
                var dd = V.sub(val.Q, val.P),
                    L = V.len(dd);
                if (L < 1e-9) return;
                var uu = V.mul(dd, 1 / L),
                    nv = V.perp(uu),
                    dsp = op.desplacament;
                var P1 = V.add(val.P, V.mul(nv, dsp)),
                    Q1 = V.add(val.Q, V.mul(nv, dsp)),
                    sgn = dsp >= 0 ? 1 : -1;
                // línies de referència: d'una mica més enllà del punt fins una mica més enllà de la cota
                [val.P, val.Q].forEach(function (X) {
                    linies.push(
                        amb({
                            k: 'linia',
                            punts: [arr(V.add(X, V.mul(nv, sgn * 0.08))), arr(V.add(X, V.mul(nv, dsp + sgn * 0.1)))],
                            tancat: false,
                            gruix: 'fi',
                        })
                    );
                });
                linies.push(amb({ k: 'linia', punts: [arr(P1), arr(Q1)], tancat: false, gruix: 'fi' }));
                punts.push(amb({ k: 'fletxa', punta: arr(P1), angle: graus(V.angle(V.mul(uu, -1))) }));
                punts.push(amb({ k: 'fletxa', punta: arr(Q1), angle: graus(V.angle(uu)) }));
                var txt = op.text || format(L, 2);
                var Tm = V.add(V.mul(V.add(P1, Q1), 0.5), V.mul(nv, sgn * 0.12));
                var nd = V.mul(nv, sgn);
                textos.push(amb({ k: 'text', p: arr(Tm), text: txt, ancora: ancora(nd.x, nd.y), mida: 'normal' }));
            } else if (ob.tipus === 'ombrejat') {
                if (op.ombra === 'ratllat')
                    ratllat(val.punts, MIDES.ratllat).forEach(function (sg) {
                        fons.push(amb({ k: 'linia', punts: [arr(sg[0]), arr(sg[1])], tancat: false, gruix: 'fi' }));
                    });
                else fons.push(amb({ k: 'farcit', punts: val.punts.map(arr), gris: true }));
            } else if (ob.tipus === 'text') {
                textos.push(amb({ k: 'text', p: arr(val), text: op.text, ancora: 'center', mida: 'normal' }));
            } else if (ob.tipus === 'eixos') {
                var pas = op.pas;
                if (op.graella) {
                    for (var gx = Math.ceil(op.xmin / pas) * pas; gx <= op.xmax + 1e-9; gx += pas)
                        fons.push(
                            amb({
                                k: 'linia',
                                punts: [
                                    [gx, op.ymin],
                                    [gx, op.ymax],
                                ],
                                tancat: false,
                                gruix: 'fi',
                                color: 'gris',
                                trac: 'continu',
                            })
                        );
                    for (var gy = Math.ceil(op.ymin / pas) * pas; gy <= op.ymax + 1e-9; gy += pas)
                        fons.push(
                            amb({
                                k: 'linia',
                                punts: [
                                    [op.xmin, gy],
                                    [op.xmax, gy],
                                ],
                                tancat: false,
                                gruix: 'fi',
                                color: 'gris',
                                trac: 'continu',
                            })
                        );
                }
                linies.push(
                    amb({
                        k: 'linia',
                        punts: [
                            [op.xmin, 0],
                            [op.xmax, 0],
                        ],
                        tancat: false,
                    })
                );
                linies.push(
                    amb({
                        k: 'linia',
                        punts: [
                            [0, op.ymin],
                            [0, op.ymax],
                        ],
                        tancat: false,
                    })
                );
                punts.push(amb({ k: 'fletxa', punta: [op.xmax, 0], angle: 0 }));
                punts.push(amb({ k: 'fletxa', punta: [0, op.ymax], angle: 90 }));
                var arrod = function (x) {
                    return Math.round(x / pas) * pas;
                };
                for (var tx = Math.ceil(op.xmin / pas) * pas; tx < op.xmax - pas / 2; tx += pas) {
                    var xx = arrod(tx);
                    if (Math.abs(xx) < 1e-9) continue;
                    linies.push(
                        amb({
                            k: 'linia',
                            punts: [
                                [xx, -MIDES.marcaEix],
                                [xx, MIDES.marcaEix],
                            ],
                            tancat: false,
                            gruix: 'fi',
                        })
                    );
                    if (op.numeros)
                        textos.push(
                            amb({
                                k: 'text',
                                p: [xx, -MIDES.marcaEix],
                                text: format(xx, 3),
                                ancora: 'north',
                                mida: 'petit',
                            })
                        );
                }
                for (var ty = Math.ceil(op.ymin / pas) * pas; ty < op.ymax - pas / 2; ty += pas) {
                    var yy = arrod(ty);
                    if (Math.abs(yy) < 1e-9) continue;
                    linies.push(
                        amb({
                            k: 'linia',
                            punts: [
                                [-MIDES.marcaEix, yy],
                                [MIDES.marcaEix, yy],
                            ],
                            tancat: false,
                            gruix: 'fi',
                        })
                    );
                    if (op.numeros)
                        textos.push(
                            amb({
                                k: 'text',
                                p: [-MIDES.marcaEix, yy],
                                text: format(yy, 3),
                                ancora: 'east',
                                mida: 'petit',
                            })
                        );
                }
                if (op.numeros)
                    textos.push(amb({ k: 'text', p: [-0.05, -0.05], text: '0', ancora: 'north east', mida: 'petit' }));
                if (op.etiquetaX)
                    textos.push(
                        amb({ k: 'text', p: [op.xmax, -0.12], text: op.etiquetaX, ancora: 'north', mida: 'normal' })
                    );
                if (op.etiquetaY)
                    textos.push(
                        amb({ k: 'text', p: [0.12, op.ymax], text: op.etiquetaY, ancora: 'west', mida: 'normal' })
                    );
            } else if (ob.tipus === 'grafica') {
                var e = val.eixos,
                    f;
                try {
                    f = F.compila(op.expr);
                } catch (err) {
                    return;
                }
                var x0 = op.xmin === null || op.xmin === undefined ? e.xmin : Math.max(e.xmin, op.xmin);
                var x1 = op.xmax === null || op.xmax === undefined ? e.xmax : Math.min(e.xmax, op.xmax);
                if (!(x1 > x0)) return;
                F.mostreja(f, x0, x1, e.ymin, e.ymax).forEach(function (l) {
                    linies.push(amb({ k: 'linia', punts: l, tancat: false }));
                });
                if (ob.etiqueta && ob.etiqueta.text) {
                    var xe = x0 + (x1 - x0) * 0.85,
                        ye = f(xe);
                    if (isFinite(ye) && ye >= e.ymin && ye <= e.ymax) etiqueta({ x: xe, y: ye });
                }
            }
        });
        return fons.concat(linies, punts, textos);
    }

    /** El rectangle que ocupen les primitives (cm), amb un marge; per als textos, una estimació. */
    function caixa(prims, marge) {
        var x0 = Infinity,
            y0 = Infinity,
            x1 = -Infinity,
            y1 = -Infinity;
        var afegeix = function (x, y) {
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
        };
        prims.forEach(function (p) {
            if (p.k === 'linia' || p.k === 'farcit')
                p.punts.forEach(function (q) {
                    afegeix(q[0], q[1]);
                });
            else if (p.k === 'cercle') {
                afegeix(p.c[0] - p.r, p.c[1] - p.r);
                afegeix(p.c[0] + p.r, p.c[1] + p.r);
            } else if (p.k === 'arc') {
                afegeix(
                    p.c[0] + p.r * Math.cos((p.a0 * Math.PI) / 180),
                    p.c[1] + p.r * Math.sin((p.a0 * Math.PI) / 180)
                );
                afegeix(
                    p.c[0] + p.r * Math.cos((p.a1 * Math.PI) / 180),
                    p.c[1] + p.r * Math.sin((p.a1 * Math.PI) / 180)
                );
                for (var a = Math.ceil(p.a0 / 90) * 90; a < p.a1; a += 90)
                    afegeix(p.c[0] + p.r * Math.cos((a * Math.PI) / 180), p.c[1] + p.r * Math.sin((a * Math.PI) / 180));
            } else if (p.k === 'punt') {
                afegeix(p.c[0] - MIDES.punt, p.c[1] - MIDES.punt);
                afegeix(p.c[0] + MIDES.punt, p.c[1] + MIDES.punt);
            } else if (p.k === 'fletxa') afegeix(p.punta[0], p.punta[1]);
            else if (p.k === 'text') {
                // ~0,25 cm per caràcter i 0,45 cm d'alçada (12 pt), segons l'àncora
                var w = 0.25 * String(p.text).replace(/\$/g, '').length + 0.1,
                    h = 0.45;
                var ax = /west/.test(p.ancora) ? 0 : /east/.test(p.ancora) ? -w : -w / 2;
                var ay = /south/.test(p.ancora) ? 0 : /north/.test(p.ancora) ? -h : -h / 2;
                afegeix(p.p[0] + ax, p.p[1] + ay);
                afegeix(p.p[0] + ax + w, p.p[1] + ay + h);
            }
        });
        if (!isFinite(x0)) return null;
        marge = marge || 0;
        return { x0: x0 - marge, y0: y0 - marge, x1: x1 + marge, y1: y1 + marge };
    }

    return {
        MIDES: MIDES,
        primitives: primitives,
        caixa: caixa,
        ancora: ancora,
        retalla: retalla,
        ratllat: ratllat,
        format: format,
    };
});
