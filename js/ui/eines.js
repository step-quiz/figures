/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: js/ui/eines.js
 * ROL: Les eines de l'editor: quines entrades demana cada una (un punt, una
 *      línia, una circumferència, un polígon), què hi ha a prop d'un clic i
 *      quins objectes crea quan ja té totes les entrades.
 * ARQUITECTURA: Pur, sense DOM (es prova amb Node: tests/eines.test.js).
 *      Entrades: 'P' punt, 'L' línia, 'C' circumferència o arc, 'O' línia o
 *      circumferència, 'G' polígon, 'P+' punts fins que es torna a tocar el
 *      primer (polígon), 'xy' una posició (text).
 *      Un clic per a una entrada 'P':
 *        - a prop d'un punt (0,25 cm): aquell punt;
 *        - a prop d'una línia o circumferència: un punt sobre l'objecte;
 *        - si no: un punt lliure (ajustat a la graella de 0,5 cm si cal).
 *      Interseccions: es crea el punt de tall més proper al segon clic.
 * DEPENDÈNCIES: js/motor/geo-motor.js
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var node = typeof module === 'object' && module.exports;
    var G = node ? require('../motor/geo-motor.js') : arrel.GeoMotor;
    var api = fabrica(G);
    if (node) module.exports = api;
    else arrel.Eines = api;
})(typeof self !== 'undefined' ? self : this, function (G) {
    'use strict';
    var V = G.V;

    var TOL = 0.25; // cm
    var PAS_GRAELLA = 0.5;

    // tecla, entrades, el tipus que crea i, si cal, l'opció numèrica
    var EINES = {
        'mou': { tecla: 'v', entrades: [] },
        'punt': { tecla: 'p', entrades: ['P'] },
        'segment': { tecla: 's', entrades: ['P', 'P'], tipus: 'segment' },
        'recta': { tecla: 'r', entrades: ['P', 'P'], tipus: 'recta' },
        'semirecta': { entrades: ['P', 'P'], tipus: 'semirecta' },
        'poligon': { entrades: ['P+'], tipus: 'poligon' },
        'poligon-regular': { entrades: ['P', 'P'], tipus: 'poligon-regular', num: 'costats' },
        'circumferencia': { tecla: 'c', entrades: ['P', 'P'], tipus: 'circumferencia' },
        'circumferencia-radi': { entrades: ['P'], tipus: 'circumferencia-radi', num: 'radi' },
        'arc': { entrades: ['P', 'P', 'P'], tipus: 'arc' },
        'punt-mig': { tecla: 'm', entrades: ['P', 'P'], tipus: 'punt-mig' },
        'interseccio': { tecla: 'i', entrades: ['O', 'O'], tipus: 'interseccio' },
        'perpendicular': { entrades: ['L', 'P'], tipus: 'perpendicular' },
        'parallela': { entrades: ['L', 'P'], tipus: 'parallela' },
        'mediatriu': { entrades: ['P', 'P'], tipus: 'mediatriu' },
        'bisectriu': { entrades: ['P', 'P', 'P'], tipus: 'bisectriu' },
        'gir': { entrades: ['P', 'P'], tipus: 'gir', num: 'angle' },
        'simetria': { entrades: ['P', 'L'], tipus: 'simetria' },
        'translacio': { entrades: ['P', 'P', 'P'], tipus: 'translacio' },
        'baricentre': { entrades: ['P', 'P', 'P'], tipus: 'baricentre' },
        'circumcentre': { entrades: ['P', 'P', 'P'], tipus: 'circumcentre' },
        'incentre': { entrades: ['P', 'P', 'P'], tipus: 'incentre' },
        'ortocentre': { entrades: ['P', 'P', 'P'], tipus: 'ortocentre' },
        'trisectriu': { entrades: ['P', 'P', 'P'], tipus: 'trisectriu' },
        'marca-angle': { tecla: 'a', entrades: ['P', 'P', 'P'], tipus: 'marca-angle' },
        'marca-segment': { entrades: ['P', 'P'], tipus: 'marca-segment' },
        'cota': { entrades: ['P', 'P'], tipus: 'cota' },
        'ombrejat': { entrades: ['G'], tipus: 'ombrejat' },
        'text': { entrades: ['xy'], tipus: 'text' },
        'eixos': { entrades: [], tipus: 'eixos' },
        'grafica': { entrades: [], tipus: 'grafica' },
    };
    var NUMS = {
        costats: { min: 3, max: 24, pas: 1, defecte: 5 },
        radi: { min: 0.1, max: 50, pas: 0.1, defecte: 2 },
        angle: { min: -360, max: 360, pas: 1, defecte: 60 },
    };

    // ── Distàncies ─────────────────────────────────────────────────────────
    function distLinia(L, P) {
        var d = V.sub(L.q, L.p),
            t = V.dot(V.sub(P, L.p), d) / V.dot(d, d);
        if (L.tipus === 'segment') t = Math.max(0, Math.min(1, t));
        else if (L.tipus === 'semirecta') t = Math.max(0, t);
        return { d: V.dist(P, V.add(L.p, V.mul(d, t))), t: t };
    }
    function distCercle(C, P) {
        var ang = V.angle(V.sub(P, C.c));
        var d = Math.abs(V.dist(P, C.c) - C.r);
        if (C.arc) {
            var tot = (((C.a1 - C.a0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI;
            var rel = (((ang - C.a0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            if (rel > tot) {
                var A = V.add(C.c, { x: C.r * Math.cos(C.a0), y: C.r * Math.sin(C.a0) }),
                    B = V.add(C.c, { x: C.r * Math.cos(C.a1), y: C.r * Math.sin(C.a1) });
                d = Math.min(V.dist(P, A), V.dist(P, B));
            }
        }
        return { d: d, t: ang };
    }
    function distPoligon(G_, P) {
        var m = Infinity;
        for (var i = 0; i < G_.punts.length; i++) {
            var r = distLinia({ tipus: 'segment', p: G_.punts[i], q: G_.punts[(i + 1) % G_.punts.length] }, P);
            m = Math.min(m, r.d);
        }
        return m;
    }

    /**
     * L'objecte més proper al punt P (cm) d'una classe permesa.
     * @param {string} entrada  'P' | 'L' | 'C' | 'O' | 'G' | 'qualsevol'
     * @returns {{ id, d, t } | null}
     */
    function proper(fig, valors, P, entrada, tol) {
        tol = tol || TOL;
        var millor = null;
        var prova = function (id, d, t, prioritat) {
            if (d > tol) return;
            // els punts guanyen a les línies si són a prop
            var clau = d - (prioritat || 0);
            if (!millor || clau < millor.clau) millor = { id: id, d: d, t: t, clau: clau };
        };
        fig.objectes.forEach(function (o) {
            var v = valors[o.id];
            if (!v || !o.visible) return;
            var c = G.classe(o.tipus);
            var vol = function (k) {
                return entrada === 'qualsevol' || entrada === k || (entrada === 'O' && (k === 'L' || k === 'C'));
            };
            if (c === 'punt' && vol('P')) prova(o.id, V.dist(v, P), null, tol);
            else if (c === 'linia' && vol('L')) {
                var rl = distLinia(v, P);
                prova(o.id, rl.d, rl.t);
            } else if (c === 'cercle' && vol('C')) {
                var rc = distCercle(v, P);
                prova(o.id, rc.d, rc.t);
            } else if (c === 'poligon' && vol('G')) prova(o.id, distPoligon(v, P));
            else if (entrada === 'qualsevol' && c === 'anotacio') {
                if (o.tipus === 'text') prova(o.id, V.dist(v, P));
                else if (v.B) prova(o.id, V.dist(v.B, P));
                else if (v.P && v.Q) prova(o.id, distLinia({ tipus: 'segment', p: v.P, q: v.Q }, P).d);
                else if (v.punts) prova(o.id, distPoligon(v, P));
            }
        });
        return millor;
    }

    function ajusta(P, graella) {
        if (!graella) return { x: Math.round(P.x * 1000) / 1000, y: Math.round(P.y * 1000) / 1000 };
        return { x: Math.round(P.x / PAS_GRAELLA) * PAS_GRAELLA, y: Math.round(P.y / PAS_GRAELLA) * PAS_GRAELLA };
    }

    /**
     * Un punt per a una entrada 'P' a la posició P: l'existent, un punt sobre un objecte o un de lliure.
     * Pot afegir un objecte a fig. Retorna l'id del punt.
     */
    function resolPunt(fig, valors, P, o) {
        o = o || {};
        var p = proper(fig, valors, P, 'P', o.tol);
        if (p) return { id: p.id, nou: false };
        var sobre = proper(fig, valors, P, 'O', o.tol);
        if (sobre && !o.lliure) {
            var ob = fig.objectes.find(function (x) {
                return x.id === sobre.id;
            });
            var t = sobre.t;
            if (G.classe(ob.tipus) === 'linia') t = Math.round(t * 10000) / 10000;
            else t = Math.round(t * 100000) / 100000;
            return { id: G.afegeix(fig, 'punt-sobre', [sobre.id, t]).id, nou: true };
        }
        var q = ajusta(P, o.graella);
        return { id: G.afegeix(fig, 'punt', [q.x, q.y]).id, nou: true };
    }

    /**
     * Crea l'objecte de l'eina amb les entrades (ids) i les opcions.
     * @param {object} o { valors, clic (posició de l'últim clic, per a la intersecció), num, text, expr }
     * @returns {object} l'objecte creat
     */
    function crea(fig, eina, entrades, o) {
        o = o || {};
        var def = EINES[eina];
        var t = def.tipus;
        if (t === 'interseccio') {
            var va = o.valors[entrades[0]],
                vb = o.valors[entrades[1]];
            var sol = G.solucions(va, vb, G.escala(fig));
            var b = 0;
            if (sol.length === 2 && o.clic) {
                var d0 = sol[0] ? V.dist(sol[0], o.clic) : Infinity,
                    d1 = sol[1] ? V.dist(sol[1], o.clic) : Infinity;
                b = d1 < d0 ? 1 : 0;
            }
            return G.afegeix(fig, 'interseccio', [entrades[0], entrades[1], b]);
        }
        if (t === 'poligon-regular')
            return G.afegeix(fig, t, [entrades[0], entrades[1], Math.round(o.num || NUMS.costats.defecte)]);
        if (t === 'circumferencia-radi') return G.afegeix(fig, t, [entrades[0], o.num || NUMS.radi.defecte]);
        if (t === 'gir')
            return G.afegeix(fig, t, [entrades[0], entrades[1], o.num === undefined ? NUMS.angle.defecte : o.num]);
        if (t === 'trisectriu') return G.afegeix(fig, t, [entrades[0], entrades[1], entrades[2], 1]);
        if (t === 'text')
            return G.afegeix(fig, t, [entrades[0].x, entrades[0].y], { opcions: { text: o.text || 'text' } });
        if (t === 'eixos') {
            var v = fig.vista;
            // eixos que caben a la vista, amb l'origen dins
            var xmin = Math.min(0, Math.ceil(v.x0 + 0.5)),
                xmax = Math.max(1, Math.floor(v.x1 - 0.5)),
                ymin = Math.min(0, Math.ceil(v.y0 + 0.5)),
                ymax = Math.max(1, Math.floor(v.y1 - 0.5));
            return G.afegeix(fig, 'eixos', [], { opcions: { xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax } });
        }
        if (t === 'grafica') {
            var e = fig.objectes.find(function (x) {
                return x.tipus === 'eixos';
            });
            if (!e) e = crea(fig, 'eixos', [], o);
            return G.afegeix(fig, 'grafica', [e.id], {
                opcions: { expr: o.expr || 'x^2' },
                etiqueta: { text: 'f', desplacament: [0.15, 0] },
            });
        }
        if (t === 'poligon') return G.afegeix(fig, 'poligon', entrades.slice());
        return G.afegeix(fig, t, entrades.slice());
    }

    return {
        TOL: TOL,
        PAS_GRAELLA: PAS_GRAELLA,
        EINES: EINES,
        NUMS: NUMS,
        proper: proper,
        ajusta: ajusta,
        resolPunt: resolPunt,
        crea: crea,
        distLinia: distLinia,
        distCercle: distCercle,
    };
});
