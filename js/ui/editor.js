/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: js/ui/editor.js
 * ROL: El controlador de l'editor (index.html): l'estat (la construcció, la
 *      selecció, l'eina i les entrades que porta), el llenç SVG (graella,
 *      figura, previsualització), els clics de les eines, arrossegar punts i
 *      etiquetes, les tecles i desfer/refer. Les propietats són a
 *      js/ui/propietats.js; fitxers i exportació, a js/ui/fitxers.js.
 * ARQUITECTURA: Script clàssic (window.Editor). Cada canvi passa per
 *      Editor.canvia(nom, f): guarda l'estat d'abans i el de després a
 *      l'historial (js/ui/historial.js), torna a avaluar, pinta i avisa els
 *      escoltadors (propietats, exportació, desat automàtic).
 *      El llenç és el SVG de js/export/svg.js en mode editor (viewBox = la
 *      vista en mm); un clic es passa a cm amb la caixa del SVG.
 *      Mentre s'arrossega, les interseccions segueixen la posició anterior
 *      (continuïtat); en deixar-ho, es fixen les branques (GeoMotor.fixaBranques).
 * DEPENDÈNCIES: GeoMotor, Dibuix, ExportaSvg, FiguresTextos, Historial, Eines
 * ============================================================================
 */
(function () {
    'use strict';
    var G = window.GeoMotor,
        D = window.Dibuix,
        S = window.ExportaSvg,
        T = window.FiguresTextos,
        E = window.Eines;
    var $ = function (id) {
        return document.getElementById(id);
    };

    var ed = {
        fig: G.nova(),
        res: null,
        sel: null,
        eina: 'mou',
        entrades: [],
        abansEina: null, // l'estat d'abans del primer clic d'una eina
        clic: null,
        cursor: null,
        num: { costats: E.NUMS.costats.defecte, radi: E.NUMS.radi.defecte, angle: E.NUMS.angle.defecte },
        text: 'text',
        expr: 'x^2',
        graella: true,
        ajusta: true,
        hist: window.Historial.crea(200),
    };
    ed.res = G.avalua(ed.fig);
    var escoltadors = [];

    // ── Canvis i historial ─────────────────────────────────────────────────
    function avisa(t) {
        $('estat').textContent = t || '';
    }
    function notifica() {
        escoltadors.forEach(function (f) {
            f(ed);
        });
    }
    function avalua(continuitat) {
        ed.res = G.avalua(ed.fig, continuitat ? { anterior: ed.res && ed.res.valors } : null);
    }
    function canvia(nom, f) {
        var abans = G.serialitza(ed.fig);
        f(ed.fig);
        avalua(false);
        ed.hist.fet(nom, abans, G.serialitza(ed.fig));
        if (
            ed.sel &&
            !ed.fig.objectes.some(function (o) {
                return o.id === ed.sel;
            })
        )
            ed.sel = null;
        pinta();
        notifica();
    }
    function posaEstat(text) {
        ed.fig = G.llegeix(text).fig;
        ed.entrades = [];
        avalua(false);
        if (
            ed.sel &&
            !ed.fig.objectes.some(function (o) {
                return o.id === ed.sel;
            })
        )
            ed.sel = null;
        pinta();
        notifica();
    }
    /** Posa una figura sencera (obrir, plantilla, nova): es pot desfer. */
    function posaFigura(fig, nom) {
        acabaEina();
        var abans = G.serialitza(ed.fig);
        ed.fig = fig;
        ed.sel = null;
        avalua(false);
        ed.hist.fet(nom || 'figura', abans, G.serialitza(ed.fig));
        pinta();
        notifica();
    }
    function desfes() {
        acabaEina();
        var r = ed.hist.desfes();
        if (r) posaEstat(r.estat);
    }
    function refes() {
        acabaEina();
        var r = ed.hist.refes();
        if (r) posaEstat(r.estat);
    }

    // ── Llenç ──────────────────────────────────────────────────────────────
    function svgEl() {
        return $('llenc').querySelector('svg');
    }
    /** Del clic (píxels de pantalla) a cm. */
    function aCm(ev) {
        var s = svgEl(),
            r = s.getBoundingClientRect(),
            v = ed.fig.vista;
        return {
            x: v.x0 + ((ev.clientX - r.left) / r.width) * (v.x1 - v.x0),
            y: v.y1 - ((ev.clientY - r.top) / r.height) * (v.y1 - v.y0),
        };
    }
    var mm = function (v, x, y) {
        return { x: Math.round((x - v.x0) * 1000) / 100, y: Math.round((v.y1 - y) * 1000) / 100 };
    };

    function pinta() {
        var v = ed.fig.vista;
        var prims = D.primitives(ed.fig, ed.res, { amagats: true });
        var s = S.svg(prims, { vista: v, editor: true, seleccionat: ed.sel }).svg;
        var W = (v.x1 - v.x0) * 10,
            H = (v.y1 - v.y0) * 10;
        // Fons: la pàgina i la graella
        var fons = ['<rect x="0" y="0" width="' + W + '" height="' + H + '" class="pagina"/>'];
        if (ed.graella) {
            for (var x = Math.ceil(v.x0 * 2) / 2; x <= v.x1; x += 0.5) {
                var X = mm(v, x, 0).x;
                fons.push(
                    '<line x1="' +
                        X +
                        '" y1="0" x2="' +
                        X +
                        '" y2="' +
                        H +
                        '" class="' +
                        (Math.abs(x - Math.round(x)) < 1e-9 ? 'graella' : 'graella-fina') +
                        '"/>'
                );
            }
            for (var y = Math.ceil(v.y0 * 2) / 2; y <= v.y1; y += 0.5) {
                var Y = mm(v, 0, y).y;
                fons.push(
                    '<line x1="0" y1="' +
                        Y +
                        '" x2="' +
                        W +
                        '" y2="' +
                        Y +
                        '" class="' +
                        (Math.abs(y - Math.round(y)) < 1e-9 ? 'graella' : 'graella-fina') +
                        '"/>'
                );
            }
        }
        // Damunt: les entrades triades i la previsualització de l'eina
        var damunt = [];
        var punt = function (id) {
            return ed.res.valors[id];
        };
        ed.entrades.forEach(function (e) {
            var P = typeof e === 'string' ? punt(e) : e;
            if (P && P.x !== undefined) {
                var q = mm(v, P.x, P.y);
                damunt.push('<circle cx="' + q.x + '" cy="' + q.y + '" r="2.2" class="triat"/>');
            }
        });
        if (ed.cursor && ed.eina !== 'mou') {
            var c = mm(v, ed.cursor.x, ed.cursor.y);
            var pts = ed.entrades
                .map(function (e) {
                    return typeof e === 'string' ? punt(e) : e;
                })
                .filter(function (P) {
                    return P && P.x !== undefined;
                });
            var ult = pts[pts.length - 1];
            var def = E.EINES[ed.eina];
            if (
                ult &&
                def &&
                /^(segment|recta|semirecta|poligon|poligon-regular|marca-segment|cota|punt-mig|mediatriu|translacio|bisectriu|marca-angle|arc|trisectriu|baricentre|circumcentre|incentre|ortocentre)$/.test(
                    ed.eina
                )
            ) {
                var a = mm(v, ult.x, ult.y);
                damunt.push(
                    '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + c.x + '" y2="' + c.y + '" class="previsual"/>'
                );
            }
            if (ult && /^(circumferencia)$/.test(ed.eina)) {
                var cc = mm(v, ult.x, ult.y);
                damunt.push(
                    '<circle cx="' +
                        cc.x +
                        '" cy="' +
                        cc.y +
                        '" r="' +
                        Math.hypot(c.x - cc.x, c.y - cc.y) +
                        '" class="previsual" fill="none"/>'
                );
            }
            if (ed.eina === 'circumferencia-radi')
                damunt.push(
                    '<circle cx="' +
                        c.x +
                        '" cy="' +
                        c.y +
                        '" r="' +
                        ed.num.radi * 10 +
                        '" class="previsual" fill="none"/>'
                );
            damunt.push('<circle cx="' + c.x + '" cy="' + c.y + '" r="1.2" class="cursor"/>');
        }
        var obre = s.indexOf('>') + 1;
        s = s.slice(0, obre) + fons.join('') + s.slice(obre, s.length - 6) + damunt.join('') + '</svg>';
        $('llenc').innerHTML = s;
        svgEl().setAttribute('aria-label', 'Figura amb ' + ed.fig.objectes.length + ' objectes');
        svgEl().classList.toggle('eina-mou', ed.eina === 'mou');
        $('btn-desfes').disabled = !ed.hist.potDesfer();
        $('btn-refes').disabled = !ed.hist.potRefer();
    }

    // ── Eines ──────────────────────────────────────────────────────────────
    function pintaEines() {
        var nav = $('eines');
        nav.innerHTML = '';
        T.grups.forEach(function (g) {
            var sec = document.createElement('div');
            sec.className = 'grup-eines';
            var h = document.createElement('p');
            h.className = 'nom-grup';
            h.textContent = g[0];
            sec.appendChild(h);
            g[1].forEach(function (k) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'eina';
                b.setAttribute('data-eina', k);
                b.setAttribute('aria-pressed', String(k === ed.eina));
                var tecla = E.EINES[k].tecla;
                b.textContent = T.eines[k];
                if (tecla) {
                    var kbd = document.createElement('kbd');
                    kbd.textContent = tecla.toUpperCase();
                    b.appendChild(kbd);
                    b.setAttribute('aria-keyshortcuts', tecla.toUpperCase());
                }
                b.addEventListener('click', function () {
                    triaEina(k);
                });
                sec.appendChild(b);
            });
            nav.appendChild(sec);
        });
    }
    function acabaEina() {
        // Si una eina ha creat punts i no s'ha acabat, aquests punts es queden (i es poden desfer)
        if (ed.abansEina !== null) {
            ed.hist.fet(T.eines[ed.eina], ed.abansEina, G.serialitza(ed.fig));
            ed.abansEina = null;
        }
        ed.entrades = [];
    }
    function triaEina(k) {
        acabaEina();
        ed.eina = k;
        document.querySelectorAll('.eina').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-eina') === k));
        });
        pintaOpcionsEina();
        pinta();
    }
    function textPas() {
        var def = E.EINES[ed.eina];
        if (!def.entrades.length) return T.ajudaEina[ed.eina] || '';
        var i = Math.min(ed.entrades.length, def.entrades.length - 1);
        var e = def.entrades[0] === 'P+' ? 'P+' : def.entrades[i];
        var base = T.eines[ed.eina] + ': ' + T.entrades[e];
        var ajuda = T.ajudaEina[ed.eina];
        return ajuda && ed.entrades.length === 0 ? base + ' ' + ajuda : base;
    }
    function pintaOpcionsEina() {
        $('pas-eina').textContent = ed.eina === 'mou' ? T.ajudaEina.mou : textPas();
        var cont = $('camps-eina');
        cont.innerHTML = '';
        var def = E.EINES[ed.eina];
        var camp = function (etiqueta, tipus, valor, quan) {
            var l = document.createElement('label');
            l.className = 'camp';
            var sp = document.createElement('span');
            sp.textContent = etiqueta;
            var i = document.createElement('input');
            i.type = tipus;
            i.value = valor;
            if (tipus === 'number') i.step = 'any';
            i.addEventListener('input', function () {
                quan(i.value);
            });
            l.appendChild(sp);
            l.appendChild(i);
            cont.appendChild(l);
            return i;
        };
        var boto = function (text, f) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn btn-petit';
            b.textContent = text;
            b.addEventListener('click', f);
            cont.appendChild(b);
        };
        if (def.num) {
            var n = E.NUMS[def.num];
            var inp = camp(T.nums[def.num], 'number', ed.num[def.num], function (vv) {
                var x = parseFloat(String(vv).replace(',', '.'));
                if (isFinite(x)) ed.num[def.num] = Math.max(n.min, Math.min(n.max, x));
            });
            inp.min = n.min;
            inp.max = n.max;
        }
        if (ed.eina === 'text')
            camp(T.textEina, 'text', ed.text, function (vv) {
                ed.text = vv;
            });
        if (ed.eina === 'grafica') {
            camp(T.exprEina, 'text', ed.expr, function (vv) {
                ed.expr = vv;
            });
            boto(T.afegeix, function () {
                try {
                    window.Funcio.compila(ed.expr);
                } catch (e) {
                    return avisa(e.message);
                }
                canvia(T.eines.grafica, function (f) {
                    ed.sel = E.crea(f, 'grafica', [], { expr: ed.expr }).id;
                });
            });
        }
        if (ed.eina === 'eixos')
            boto(T.afegeix, function () {
                canvia(T.eines.eixos, function (f) {
                    ed.sel = E.crea(f, 'eixos', []).id;
                });
            });
        if (ed.eina === 'punt') {
            var px = camp('x', 'number', 0, function () {}),
                py = camp('y', 'number', 0, function () {});
            px.setAttribute('aria-label', T.puntXY + ' x');
            py.setAttribute('aria-label', T.puntXY + ' y');
            boto(T.afegeix, function () {
                var x = parseFloat(String(px.value).replace(',', '.')),
                    y = parseFloat(String(py.value).replace(',', '.'));
                if (!isFinite(x) || !isFinite(y)) return;
                canvia(T.eines.punt, function (f) {
                    ed.sel = G.afegeix(f, 'punt', [x, y]).id;
                });
            });
        }
    }

    /** Un clic amb una eina de construcció. */
    function clicEina(P, ev) {
        var def = E.EINES[ed.eina];
        if (!def.entrades.length) return;
        var esperada = def.entrades[0] === 'P+' ? 'P+' : def.entrades[ed.entrades.length];
        if (ed.abansEina === null) ed.abansEina = G.serialitza(ed.fig);
        var graella = ed.ajusta && !ev.shiftKey;
        var valors = ed.res.valors;
        ed.clic = P;
        if (esperada === 'P' || esperada === 'P+') {
            if (esperada === 'P+' && ed.entrades.length >= 3) {
                var primer = valors[ed.entrades[0]];
                if (primer && G.V.dist(primer, P) <= E.TOL) return completa();
            }
            var r = E.resolPunt(ed.fig, valors, P, { graella: graella });
            if (r.nou) avalua(false);
            if (ed.entrades[ed.entrades.length - 1] !== r.id) ed.entrades.push(r.id);
        } else if (esperada === 'xy') {
            ed.entrades.push(E.ajusta(P, graella));
        } else {
            var o = E.proper(ed.fig, valors, P, esperada);
            if (!o) {
                avisa(T.entrades[esperada]);
                return;
            }
            ed.entrades.push(o.id);
        }
        if (esperada !== 'P+' && ed.entrades.length === def.entrades.length) return completa();
        $('pas-eina').textContent = textPas();
        pinta();
        notifica();
    }
    function completa() {
        var def = E.EINES[ed.eina];
        if (ed.eina === 'punt')
            ed.sel = ed.entrades[0]; // el punt ja s'ha fet en tocar
        else
            try {
                ed.sel = E.crea(ed.fig, ed.eina, ed.entrades, {
                    valors: ed.res.valors,
                    clic: ed.clic,
                    num: ed.num[def.num],
                    text: ed.text,
                }).id;
            } catch (e) {
                avisa(e.message);
            }
        avalua(false);
        if (ed.abansEina !== null) ed.hist.fet(T.eines[ed.eina], ed.abansEina, G.serialitza(ed.fig));
        ed.abansEina = null;
        ed.entrades = [];
        $('pas-eina').textContent = textPas();
        pinta();
        notifica();
    }

    // ── Ratolí i dit ───────────────────────────────────────────────────────
    var arr = null; // { id, tipus: 'punt'|'sobre'|'text'|'etiqueta', abans, mogut }
    function obj(id) {
        return ed.fig.objectes.find(function (o) {
            return o.id === id;
        });
    }
    $('llenc').addEventListener('pointerdown', function (ev) {
        if (ev.button > 0) return;
        var P = aCm(ev);
        if (ed.eina !== 'mou') {
            ev.preventDefault();
            return clicEina(P, ev);
        }
        var etiqueta = ev.target.closest && ev.target.closest('text.etiqueta');
        var g = ev.target.closest && ev.target.closest('[data-id]');
        var id = g ? g.getAttribute('data-id') : null;
        if (!id) {
            var pr = E.proper(ed.fig, ed.res.valors, P, 'qualsevol');
            id = pr ? pr.id : null;
        }
        ed.sel = id;
        if (id) {
            var o = obj(id);
            var tipus = etiqueta
                ? 'etiqueta'
                : o.tipus === 'punt'
                  ? 'punt'
                  : o.tipus === 'punt-sobre'
                    ? 'sobre'
                    : o.tipus === 'text'
                      ? 'text'
                      : null;
            if (tipus) {
                arr = { id: id, tipus: tipus, abans: G.serialitza(ed.fig), mogut: false };
                try {
                    $('llenc').setPointerCapture(ev.pointerId);
                } catch (e) {
                    /* res */
                }
                ev.preventDefault();
            }
        }
        pinta();
        notifica();
    });
    $('llenc').addEventListener('pointermove', function (ev) {
        var P = aCm(ev);
        ed.cursor = P;
        var graella = ed.ajusta && !ev.shiftKey;
        if (arr) {
            var o = obj(arr.id);
            arr.mogut = true;
            if (arr.tipus === 'punt' || arr.tipus === 'text') {
                var q = E.ajusta(P, graella);
                o.args[0] = q.x;
                o.args[1] = q.y;
            } else if (arr.tipus === 'sobre') {
                var pare = ed.res.valors[o.args[0]];
                if (pare) {
                    var r = pare.c ? E.distCercle(pare, P) : E.distLinia(pare, P);
                    o.args[1] = Math.round(r.t * 100000) / 100000;
                }
            } else if (arr.tipus === 'etiqueta') {
                var base = ed.res.valors[o.id];
                var ref = base && base.x !== undefined ? base : null;
                if (ref)
                    o.etiqueta.desplacament = [
                        Math.round((P.x - ref.x) * 100) / 100,
                        Math.round((P.y - ref.y) * 100) / 100,
                    ];
            }
            avalua(true);
            pinta();
            return;
        }
        var v = ed.fig.vista;
        avisa('x = ' + D.format(P.x, 2) + ' · y = ' + D.format(P.y, 2) + (P.x < v.x0 || P.x > v.x1 ? '' : ''));
        if (ed.eina !== 'mou') pinta();
    });
    function deixa() {
        if (!arr) return;
        var a = arr;
        arr = null;
        if (a.mogut) {
            G.fixaBranques(ed.fig, ed.res);
            avalua(false);
            ed.hist.fet('mou ' + a.id, a.abans, G.serialitza(ed.fig));
            pinta();
            notifica();
        }
    }
    $('llenc').addEventListener('pointerup', deixa);
    $('llenc').addEventListener('pointercancel', deixa);
    $('llenc').addEventListener('pointerleave', function () {
        if (!arr) {
            ed.cursor = null;
            if (ed.eina !== 'mou') pinta();
        }
    });

    // ── Tecles ─────────────────────────────────────────────────────────────
    var TECLES = {};
    Object.keys(E.EINES).forEach(function (k) {
        if (E.EINES[k].tecla) TECLES[E.EINES[k].tecla] = k;
    });
    document.addEventListener('keydown', function (ev) {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) || ev.target.isContentEditable) return;
        if (document.querySelector('dialog[open]')) return;
        var k = ev.key.toLowerCase();
        if ((ev.ctrlKey || ev.metaKey) && k === 'z' && !ev.shiftKey) {
            ev.preventDefault();
            return desfes();
        }
        if ((ev.ctrlKey || ev.metaKey) && (k === 'y' || (k === 'z' && ev.shiftKey))) {
            ev.preventDefault();
            return refes();
        }
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        if (ev.key === 'Escape') {
            if (ed.entrades.length) {
                acabaEina();
                pintaOpcionsEina();
            } else if (ed.eina !== 'mou') triaEina('mou');
            else ed.sel = null;
            pinta();
            notifica();
            return;
        }
        if ((ev.key === 'Delete' || ev.key === 'Backspace') && ed.sel) {
            ev.preventDefault();
            var id = ed.sel;
            return canvia(T.esborra + ' ' + id, function (f) {
                G.elimina(f, id);
            });
        }
        var fl = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[ev.key];
        if (fl && ed.sel) {
            var o = obj(ed.sel);
            if (o && (o.tipus === 'punt' || o.tipus === 'text')) {
                ev.preventDefault();
                var pas = ev.shiftKey ? 0.1 : E.PAS_GRAELLA;
                return canvia('mou ' + o.id, function () {
                    o.args[0] = Math.round((o.args[0] + fl[0] * pas) * 1000) / 1000;
                    o.args[1] = Math.round((o.args[1] + fl[1] * pas) * 1000) / 1000;
                });
            }
        }
        if (TECLES[k]) {
            ev.preventDefault();
            triaEina(TECLES[k]);
        }
    });
    $('btn-desfes').addEventListener('click', desfes);
    $('btn-refes').addEventListener('click', refes);

    // ── Inici ──────────────────────────────────────────────────────────────
    $('btn-desfes').textContent = T.desfes;
    $('btn-refes').textContent = T.refes;
    $('tecles').textContent = T.tecles;
    pintaEines();
    pintaOpcionsEina();
    pinta();

    window.Editor = {
        ed: ed,
        canvia: canvia,
        posaFigura: posaFigura,
        selecciona: function (id) {
            ed.sel = id;
            pinta();
            notifica();
        },
        pinta: pinta,
        avisa: avisa,
        escolta: function (f) {
            escoltadors.push(f);
        },
        triaEina: triaEina,
        desfes: desfes,
        refes: refes,
    };
})();
