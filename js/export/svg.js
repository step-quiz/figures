/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: js/export/svg.js
 * ROL: Exportació SVG (per a Google Docs i per fer-ne la PNG) i el mateix
 *      dibuix per al llenç de l'editor (amb ids, zones per tocar i classes).
 * ARQUITECTURA: Pur, sense DOM (retorna text). Escriu les primitives de
 *   js/motor/dibuix.js:
 *   - Fitxer: viewBox en mm (la caixa del dibuix amb 2 mm de marge), amb
 *     atributs de presentació (stroke, fill…), no style: així també és vàlid
 *     dins de la pàgina amb la CSP estricta.
 *   - Gruixos: 0,4 / 0,6 / 0,8 pt (0,141 / 0,212 / 0,282 mm), com el TikZ.
 *   - Etiquetes en lletra serif; les lletres soles (i les gregues), en cursiva;
 *     un índex (A1) com a subíndex. Limitació: un text entre $…$ es mostra sense
 *     els $ i sense interpretar el LaTeX (al TikZ sí que s'interpreta).
 *   - Editor (o.editor): viewBox = la vista, cada objecte en un <g data-id>, i
 *     zones transparents i gruixudes per tocar les línies i els punts.
 *   - midaPng(): la mida en píxels d'una PNG a 300 ppp.
 * DEPENDÈNCIES: js/motor/dibuix.js
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var node = typeof module === 'object' && module.exports;
    var D = node ? require('../motor/dibuix.js') : arrel.Dibuix;
    var api = fabrica(D);
    if (node) module.exports = api;
    else arrel.ExportaSvg = api;
})(typeof self !== 'undefined' ? self : this, function (D) {
    'use strict';

    var MM_PT = 25.4 / 72.27; // mm per punt TeX
    var GRUIX = { fi: 0.4 * MM_PT, normal: 0.6 * MM_PT, gruixut: 0.8 * MM_PT };
    var COLOR = { negre: '#000000', gris: '#808080' };
    var LLETRA = { normal: 12 * MM_PT, petit: 10.95 * MM_PT };
    var SEP = 0.333 * 12 * MM_PT; // inner sep del node de TikZ (0,333 em)
    var MARGE = 0.2; // cm

    var r2 = function (v) {
        var s = (Math.round(v * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
        return s === '-0' ? '0' : s;
    };
    var esc = function (s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    /** Text d'una etiqueta: { cursiva, base, index } */
    function etiqueta(t) {
        t = String(t);
        var dins = /^\$([^$]+)\$$/.exec(t);
        if (dins) {
            // Una mica de LaTeX → Unicode (la resta es mostra tal qual)
            t = dins[1]
                .replace(
                    /\\(alpha|beta|gamma|delta|varepsilon|theta|lambda|mu|pi|sigma|varphi|omega)/g,
                    function (m, g) {
                        return {
                            alpha: 'α',
                            beta: 'β',
                            gamma: 'γ',
                            delta: 'δ',
                            varepsilon: 'ε',
                            theta: 'θ',
                            lambda: 'λ',
                            mu: 'μ',
                            pi: 'π',
                            sigma: 'σ',
                            varphi: 'φ',
                            omega: 'ω',
                        }[g];
                    }
                )
                .replace(/\^\{?2\}?/g, '²')
                .replace(/\^\{?3\}?/g, '³')
                .replace(/\\cdot/g, '·')
                .replace(/[{}\\]/g, '');
            var mm = /^([A-Za-zα-ω])_?(\d+)$/.exec(t);
            if (mm) return { cursiva: true, base: mm[1], index: mm[2] };
            return { cursiva: /^[A-Za-zα-ω][²³′']*$/.test(t), base: t, index: '' };
        }
        var m = /^([A-Za-zα-ω])('*)(\d*)$/.exec(t);
        if (m) return { cursiva: true, base: m[1] + m[2].replace(/'/g, '′'), index: m[3] };
        return { cursiva: false, base: t, index: '' };
    }

    function tracat(p) {
        var w = GRUIX[p.gruix] || GRUIX.normal;
        var a =
            ' stroke="' +
            (COLOR[p.color] || COLOR.negre) +
            '" stroke-width="' +
            r2(w * 1000) / 1000 +
            '" stroke-linecap="round" stroke-linejoin="round"';
        if (p.trac === 'discontinu') a += ' stroke-dasharray="1.05 1.05"';
        else if (p.trac === 'puntejat') a += ' stroke-dasharray="0.01 0.7"';
        return a;
    }

    /**
     * El SVG de les primitives.
     * @param {Array} prims
     * @param {object} [o]  { vista (per a l'editor, en cm), editor: true, seleccionat: id }
     * @returns {{ svg: string, ample: number, alt: number }} (ample i alt en mm)
     */
    function svg(prims, o) {
        o = o || {};
        var c = o.vista || D.caixa(prims, MARGE) || { x0: 0, y0: 0, x1: 1, y1: 1 };
        var ample = (c.x1 - c.x0) * 10,
            alt = (c.y1 - c.y0) * 10;
        var X = function (x) {
                return r2((x - c.x0) * 10);
            },
            Y = function (y) {
                return r2((c.y1 - y) * 10);
            };
        var P = function (q) {
            return X(q[0]) + ',' + Y(q[1]);
        };
        var cos = [];
        var grup = null;
        var obre = function (p) {
            if (!o.editor) return;
            if (grup !== p.id) {
                if (grup !== null) cos.push('</g>');
                var cls =
                    'obj' +
                    (p.amagat ? ' amagat' : '') +
                    (o.seleccionat && o.seleccionat === p.id ? ' seleccionat' : '');
                cos.push('<g data-id="' + esc(p.id) + '" class="' + cls + '">');
                grup = p.id;
            }
        };
        prims.forEach(function (p) {
            obre(p);
            var zona = o.editor && !(p.k === 'text' && !p.etiqueta);
            switch (p.k) {
                case 'linia':
                    var pts = p.punts.map(P).join(' ');
                    var el = p.tancat ? 'polygon' : 'polyline';
                    cos.push('<' + el + ' points="' + pts + '" fill="none"' + tracat(p) + '/>');
                    if (zona)
                        cos.push(
                            '<' +
                                el +
                                ' points="' +
                                pts +
                                '" class="zona" fill="none" stroke="transparent" stroke-width="3"/>'
                        );
                    break;
                case 'cercle':
                    cos.push(
                        '<circle cx="' +
                            X(p.c[0]) +
                            '" cy="' +
                            Y(p.c[1]) +
                            '" r="' +
                            r2(p.r * 10) +
                            '" fill="none"' +
                            tracat(p) +
                            '/>'
                    );
                    if (zona)
                        cos.push(
                            '<circle cx="' +
                                X(p.c[0]) +
                                '" cy="' +
                                Y(p.c[1]) +
                                '" r="' +
                                r2(p.r * 10) +
                                '" class="zona" fill="none" stroke="transparent" stroke-width="3"/>'
                        );
                    break;
                case 'arc':
                    var a0 = (p.a0 * Math.PI) / 180,
                        a1 = (p.a1 * Math.PI) / 180;
                    var d =
                        'M' +
                        P([p.c[0] + p.r * Math.cos(a0), p.c[1] + p.r * Math.sin(a0)]) +
                        ' A' +
                        r2(p.r * 10) +
                        ',' +
                        r2(p.r * 10) +
                        ' 0 ' +
                        (p.a1 - p.a0 > 180 ? 1 : 0) +
                        ' 0 ' +
                        P([p.c[0] + p.r * Math.cos(a1), p.c[1] + p.r * Math.sin(a1)]);
                    cos.push('<path d="' + d + '" fill="none"' + tracat(p) + '/>');
                    if (zona)
                        cos.push(
                            '<path d="' + d + '" class="zona" fill="none" stroke="transparent" stroke-width="3"/>'
                        );
                    break;
                case 'farcit':
                    cos.push(
                        '<polygon points="' +
                            p.punts.map(P).join(' ') +
                            '" fill="' +
                            (p.color === 'gris' ? '#e6e6e6' : '#cccccc') +
                            '" stroke="none"/>'
                    );
                    break;
                case 'punt':
                    cos.push(
                        '<circle cx="' +
                            X(p.c[0]) +
                            '" cy="' +
                            Y(p.c[1]) +
                            '" r="' +
                            r2(D.MIDES.punt * 10) +
                            '" fill="' +
                            (COLOR[p.color] || COLOR.negre) +
                            '"/>'
                    );
                    if (zona)
                        cos.push(
                            '<circle cx="' +
                                X(p.c[0]) +
                                '" cy="' +
                                Y(p.c[1]) +
                                '" r="2.5" class="zona punt-zona" fill="transparent"/>'
                        );
                    break;
                case 'fletxa':
                    var a = (p.angle * Math.PI) / 180,
                        L = D.MIDES.fletxa,
                        obr = 0.38;
                    var b1 = [p.punta[0] - L * Math.cos(a - obr), p.punta[1] - L * Math.sin(a - obr)];
                    var b2 = [p.punta[0] - L * Math.cos(a + obr), p.punta[1] - L * Math.sin(a + obr)];
                    cos.push(
                        '<polygon points="' +
                            [p.punta, b1, b2].map(P).join(' ') +
                            '" fill="' +
                            (COLOR[p.color] || COLOR.negre) +
                            '"/>'
                    );
                    break;
                case 'text':
                    var mida = LLETRA[p.mida] || LLETRA.normal;
                    var an = p.ancora;
                    var tx = (p.p[0] - c.x0) * 10 + (/west/.test(an) ? SEP : /east/.test(an) ? -SEP : 0);
                    var ty =
                        (c.y1 - p.p[1]) * 10 +
                        (/north/.test(an) ? SEP + mida * 0.72 : /south/.test(an) ? -SEP : mida * 0.35);
                    var ta = /west/.test(an) ? 'start' : /east/.test(an) ? 'end' : 'middle';
                    var e = etiqueta(p.text);
                    var contingut =
                        esc(e.base) +
                        (e.index
                            ? '<tspan baseline-shift="sub" font-size="' +
                              r2(mida * 0.7) +
                              '">' +
                              esc(e.index) +
                              '</tspan>'
                            : '');
                    cos.push(
                        '<text x="' +
                            r2(tx) +
                            '" y="' +
                            r2(ty) +
                            '" text-anchor="' +
                            ta +
                            '" font-family="Latin Modern Roman, CMU Serif, Times New Roman, serif" font-size="' +
                            r2(mida) +
                            '"' +
                            (e.cursiva ? ' font-style="italic"' : '') +
                            ' fill="' +
                            (COLOR[p.color] || COLOR.negre) +
                            '"' +
                            (o.editor && p.etiqueta ? ' class="etiqueta"' : '') +
                            '>' +
                            contingut +
                            '</text>'
                    );
                    break;
            }
        });
        if (o.editor && grup !== null) cos.push('</g>');
        var cap = o.editor
            ? '<svg viewBox="0 0 ' + r2(ample) + ' ' + r2(alt) + '" class="llenc-svg">'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="' +
              r2(ample) +
              'mm" height="' +
              r2(alt) +
              'mm" viewBox="0 0 ' +
              r2(ample) +
              ' ' +
              r2(alt) +
              '">';
        return { svg: cap + cos.join('') + '</svg>', ample: ample, alt: alt, caixa: c };
    }

    /** Mida en píxels d'una imatge de ample × alt mm a ppp punts per polzada. */
    function midaPng(ample, alt, ppp) {
        ppp = ppp || 300;
        return { w: Math.round((ample / 25.4) * ppp), h: Math.round((alt / 25.4) * ppp) };
    }

    return { GRUIX: GRUIX, svg: svg, midaPng: midaPng, etiqueta: etiqueta };
});
