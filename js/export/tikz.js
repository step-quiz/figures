/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: js/export/tikz.js
 * ROL: Exportació TikZ: el fragment per enganxar a Overleaf (tikzpicture) i el
 *      fitxer .tex autònom (standalone) per compilar-lo sol.
 * ARQUITECTURA: Pur, sense DOM. Escriu les primitives de js/motor/dibuix.js:
 *   - TikZ pla, sense cap biblioteca; només coordenades numèriques (3 decimals),
 *     mai construccions de TikZ. Arcs amb arc[start angle, end angle, radius];
 *     marques de segment i angles rectes, segments calculats en JS.
 *   - Gruix: fi / normal / gruixut → thin / semithick / thick (0,4 / 0,6 / 0,8 pt).
 *     Traç discontinu → dashed, puntejat → dotted. Gris → gray.
 *   - Etiquetes: \node[anchor=…] at (x, y) {$A$}; una lletra (amb accents ' o un
 *     índex: A1 → $A_{1}$) va en mode matemàtic; les lletres gregues, també; la
 *     resta és text (amb els caràcters especials de LaTeX escapats). Un text
 *     entre $…$ passa tal qual.
 *   - Primera línia: % figures:v1:<codi> (la construcció, per tornar-la a obrir:
 *     js/export/codi.js).
 * DEPENDÈNCIES: js/motor/dibuix.js
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var node = typeof module === 'object' && module.exports;
    var D = node ? require('../motor/dibuix.js') : arrel.Dibuix;
    var api = fabrica(D);
    if (node) module.exports = api;
    else arrel.ExportaTikz = api;
})(typeof self !== 'undefined' ? self : this, function (D) {
    'use strict';

    var GRUIX = { fi: 'thin', normal: 'semithick', gruixut: 'thick' };
    var TRAC = { discontinu: 'dashed', puntejat: 'dotted' };
    var GREC = {
        α: '\\alpha',
        β: '\\beta',
        γ: '\\gamma',
        δ: '\\delta',
        ε: '\\varepsilon',
        θ: '\\theta',
        λ: '\\lambda',
        μ: '\\mu',
        π: '\\pi',
        σ: '\\sigma',
        φ: '\\varphi',
        ω: '\\omega',
    };

    var n3 = function (v) {
        var s = (Math.round(v * 1000) / 1000).toFixed(3);
        return s === '-0.000' ? '0.000' : s;
    };
    var n2 = function (v) {
        var s = (Math.round(v * 100) / 100).toFixed(2);
        return s === '-0.00' ? '0.00' : s;
    };
    var pt = function (p) {
        return '(' + n3(p[0]) + ',' + n3(p[1]) + ')';
    };

    function opcions(p, extra) {
        var o = [];
        if (p.gruix && GRUIX[p.gruix]) o.push(GRUIX[p.gruix]);
        if (p.trac && TRAC[p.trac]) o.push(TRAC[p.trac]);
        if (p.color === 'gris') o.push('gray');
        if (extra) o.push(extra);
        return o.length ? '[' + o.join(', ') + ']' : '';
    }

    var ESPECIALS = {
        '\\': '\\textbackslash{}',
        '{': '\\{',
        '}': '\\}',
        '#': '\\#',
        '%': '\\%',
        '&': '\\&',
        '_': '\\_',
        '~': '\\textasciitilde{}',
        '^': '\\textasciicircum{}',
    };
    /** Una etiqueta en LaTeX. */
    function textTex(t) {
        t = String(t);
        if (/^\$[^$]+\$$/.test(t)) return t;
        var m = /^([A-Za-zα-ω])('*)(\d*)$/.exec(t);
        if (m) return '$' + (GREC[m[1]] || m[1]) + m[2] + (m[3] ? '_{' + m[3] + '}' : '') + '$';
        return t
            .replace(/[\\{}#%&_~^$]/g, function (c) {
                return c === '$' ? '\\$' : ESPECIALS[c];
            })
            .replace(/[α-ω]/g, function (c) {
                return GREC[c] ? '$' + GREC[c] + '$' : c;
            })
            .replace(/−/g, '$-$');
    }

    /** Les ordres TikZ d'una primitiva. */
    function ordre(p) {
        switch (p.k) {
            case 'linia':
                return '\\draw' + opcions(p) + ' ' + p.punts.map(pt).join(' -- ') + (p.tancat ? ' -- cycle' : '') + ';';
            case 'cercle':
                return '\\draw' + opcions(p) + ' ' + pt(p.c) + ' circle[radius=' + n3(p.r) + '];';
            case 'arc':
                var a0 = (p.a0 * Math.PI) / 180;
                return (
                    '\\draw' +
                    opcions(p) +
                    ' ' +
                    pt([p.c[0] + p.r * Math.cos(a0), p.c[1] + p.r * Math.sin(a0)]) +
                    ' arc[start angle=' +
                    n2(p.a0) +
                    ', end angle=' +
                    n2(p.a1) +
                    ', radius=' +
                    n3(p.r) +
                    '];'
                );
            case 'farcit':
                return (
                    '\\fill[' +
                    (p.color === 'gris' ? 'black!10' : 'black!20') +
                    '] ' +
                    p.punts.map(pt).join(' -- ') +
                    ' -- cycle;'
                );
            case 'punt':
                return (
                    '\\fill' +
                    (p.color === 'gris' ? '[gray]' : '') +
                    ' ' +
                    pt(p.c) +
                    ' circle[radius=' +
                    n3(D.MIDES.punt) +
                    '];'
                );
            case 'fletxa':
                var a = (p.angle * Math.PI) / 180,
                    L = D.MIDES.fletxa,
                    obr = 0.38;
                var b1 = [p.punta[0] - L * Math.cos(a - obr), p.punta[1] - L * Math.sin(a - obr)];
                var b2 = [p.punta[0] - L * Math.cos(a + obr), p.punta[1] - L * Math.sin(a + obr)];
                return (
                    '\\fill' +
                    (p.color === 'gris' ? '[gray]' : '') +
                    ' ' +
                    pt(p.punta) +
                    ' -- ' +
                    pt(b1) +
                    ' -- ' +
                    pt(b2) +
                    ' -- cycle;'
                );
            case 'text':
                var o = ['anchor=' + p.ancora];
                if (p.mida === 'petit') o.push('font=\\small');
                if (p.color === 'gris') o.push('text=gray');
                return '\\node[' + o.join(', ') + '] at ' + pt(p.p) + ' {' + textTex(p.text) + '};';
        }
        return '';
    }

    /**
     * El fragment TikZ.
     * @param {Array} prims  primitives (sense els objectes amagats)
     * @param {string} codi  la construcció codificada (js/export/codi.js), per a la primera línia
     */
    function fragment(prims, codi) {
        var l = [];
        if (codi) l.push('% figures:v1:' + codi);
        l.push('\\begin{tikzpicture}[line cap=round, line join=round]');
        var ultim = null;
        prims.forEach(function (p) {
            if (p.id !== ultim) {
                l.push('  % ' + p.id);
                ultim = p.id;
            }
            l.push('  ' + ordre(p));
        });
        l.push('\\end{tikzpicture}');
        return l.join('\n') + '\n';
    }

    /** El fitxer .tex autònom (12 pt, com els exàmens; Computer Modern, que no demana cap paquet). */
    function autonom(prims, codi) {
        return (
            '\\documentclass[12pt,tikz,border=2mm]{standalone}\n' +
            '\\begin{document}\n' +
            fragment(prims, codi) +
            '\\end{document}\n'
        );
    }

    /** El codi de la primera línia d'un .tex (o null). */
    function codiDelTex(text) {
        var m = /^%\s*figures:v1:([A-Za-z0-9_-]+)\s*$/m.exec(String(text));
        return m ? m[1] : null;
    }

    return {
        GRUIX: GRUIX,
        textTex: textTex,
        ordre: ordre,
        fragment: fragment,
        autonom: autonom,
        codiDelTex: codiDelTex,
    };
});
