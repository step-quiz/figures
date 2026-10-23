/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: js/ui/propietats.js
 * ROL: El panell de la dreta. Amb un objecte triat: etiqueta, coordenades (punts
 *      lliures), valors (radi, costats, angle), estil (gruix, traç, color),
 *      opcions del tipus (arcs, ratlles, cota, ombrejat, eixos, funció),
 *      visible i esborrar. Sense res triat: la llista de la construcció i la pàgina.
 * ARQUITECTURA: Script clàssic. Tots els canvis passen per Editor.canvia (es
 *      poden desfer). Els camps de text i de nombre s'apliquen en sortir del camp
 *      o amb Retorn (event change), no a cada tecla.
 * DEPENDÈNCIES: GeoMotor, Funcio, FiguresTextos, Editor
 * ============================================================================
 */
(function () {
    'use strict';
    var G = window.GeoMotor,
        T = window.FiguresTextos,
        Ed = window.Editor;
    var $ = function (id) {
        return document.getElementById(id);
    };
    var num = function (s) {
        var x = parseFloat(String(s).replace(',', '.'));
        return isFinite(x) ? x : null;
    };

    var cont = $('propietats');
    function el(etiqueta, cls, text) {
        var e = document.createElement(etiqueta);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }
    /** Un camp amb etiqueta. tipus: 'text' | 'number' | 'checkbox' | 'select' (opcions: [[valor, text]]) */
    function camp(pare, etiqueta, tipus, valor, quan, opcions) {
        var l = el('label', 'camp' + (tipus === 'checkbox' ? ' camp-check' : ''));
        var i;
        if (tipus === 'select') {
            i = document.createElement('select');
            opcions.forEach(function (o) {
                var op = document.createElement('option');
                op.value = String(o[0]);
                op.textContent = o[1];
                i.appendChild(op);
            });
            i.value = String(valor);
        } else {
            i = document.createElement('input');
            i.type = tipus;
            if (tipus === 'checkbox') i.checked = !!valor;
            else i.value = valor === null || valor === undefined ? '' : valor;
            if (tipus === 'number') i.step = 'any';
        }
        i.setAttribute('data-k', etiqueta);
        i.addEventListener('change', function () {
            quan(tipus === 'checkbox' ? i.checked : i.value, i);
        });
        if (tipus === 'checkbox') {
            l.appendChild(i);
            l.appendChild(el('span', '', etiqueta));
        } else {
            l.appendChild(el('span', '', etiqueta));
            l.appendChild(i);
        }
        pare.appendChild(l);
        return i;
    }

    function pinta(ed) {
        // Després de refer el panell, el focus torna al mateix camp
        var actiu =
            document.activeElement && cont.contains(document.activeElement)
                ? document.activeElement.getAttribute('data-k')
                : null;
        cont.innerHTML = '';
        var o =
            ed.sel &&
            ed.fig.objectes.find(function (x) {
                return x.id === ed.sel;
            });
        if (o) pintaObjecte(ed, o);
        else pintaLlista(ed);
        if (actiu) {
            var el2 = cont.querySelector('[data-k="' + actiu.replace(/"/g, '') + '"]');
            if (el2) el2.focus();
        }
    }

    function pintaObjecte(ed, o) {
        var canvi = function (nom, f) {
            Ed.canvia(nom + ' ' + o.id, function (fig) {
                var x = fig.objectes.find(function (y) {
                    return y.id === o.id;
                });
                if (x) f(x);
            });
        };
        var cap = el('div', 'cap-propietats');
        var torna = el('button', 'btn btn-petit', '← ' + T.construccio);
        torna.type = 'button';
        torna.addEventListener('click', function () {
            Ed.selecciona(null);
        });
        cap.appendChild(torna);
        cont.appendChild(cap);
        cont.appendChild(el('h2', '', o.id + ' · ' + (T.tipus[o.tipus] || o.tipus)));
        if (ed.res.valors[o.id] === null) cont.appendChild(el('p', 'nota avis', T.indefinit));
        var cls = G.classe(o.tipus);

        // Etiqueta
        if (cls !== 'anotacio' && cls !== 'eixos')
            camp(cont, T.etiqueta, 'text', o.etiqueta ? o.etiqueta.text : '', function (v) {
                canvi(T.etiqueta, function (x) {
                    v = String(v).trim();
                    x.etiqueta = v
                        ? { text: v, desplacament: x.etiqueta ? x.etiqueta.desplacament : [0.15, 0.15] }
                        : null;
                });
            });
        // Coordenades i valors
        if (o.tipus === 'punt' || o.tipus === 'text') {
            ['x', 'y'].forEach(function (k, i) {
                camp(cont, T.args[k], 'number', o.args[i], function (v) {
                    var n = num(v);
                    if (n !== null)
                        canvi(k, function (x) {
                            x.args[i] = n;
                        });
                });
            });
        }
        var arg = { 'circumferencia-radi': [1, 'radi'], 'poligon-regular': [2, 'costats'], 'gir': [2, 'angle'] }[
            o.tipus
        ];
        if (arg)
            camp(cont, T.args[arg[1]], 'number', o.args[arg[0]], function (v) {
                var n = num(v);
                if (n !== null && (arg[1] !== 'radi' || n > 0) && (arg[1] !== 'costats' || (n >= 3 && n <= 24)))
                    canvi(arg[1], function (x) {
                        x.args[arg[0]] = arg[1] === 'costats' ? Math.round(n) : n;
                    });
            });
        if (o.tipus === 'trisectriu')
            camp(
                cont,
                'k',
                'select',
                o.args[3],
                function (v) {
                    canvi('k', function (x) {
                        x.args[3] = Number(v);
                    });
                },
                [
                    [1, '1/3'],
                    [2, '2/3'],
                ]
            );

        // Opcions del tipus
        var op = o.opcions || {};
        Object.keys(op).forEach(function (k) {
            var nom = T.opcions[k] || k;
            var posa = function (val) {
                canvi(nom, function (x) {
                    x.opcions[k] = val;
                });
            };
            if (k === 'recte')
                return camp(
                    cont,
                    nom,
                    'select',
                    String(op[k]),
                    function (v) {
                        posa(v === 'true' ? true : v === 'false' ? false : 'auto');
                    },
                    [
                        ['auto', T.opcions.rectes.auto],
                        ['true', T.opcions.rectes.true],
                        ['false', T.opcions.rectes.false],
                    ]
                );
            if (k === 'arcs' || k === 'ratlles')
                return camp(
                    cont,
                    nom,
                    'select',
                    op[k],
                    function (v) {
                        posa(Number(v));
                    },
                    [
                        [1, '1'],
                        [2, '2'],
                        [3, '3'],
                    ]
                );
            if (k === 'ombra')
                return camp(cont, nom, 'select', op[k], posa, [
                    ['gris', T.opcions.ombres.gris],
                    ['ratllat', T.opcions.ombres.ratllat],
                ]);
            if (typeof op[k] === 'boolean') return camp(cont, nom, 'checkbox', op[k], posa);
            if (k === 'expr') {
                var avis = el('p', 'nota avis', '');
                var i = camp(cont, nom, 'text', op[k], function (v) {
                    try {
                        window.Funcio.compila(v);
                    } catch (e) {
                        avis.textContent = e.message;
                        return;
                    }
                    avis.textContent = '';
                    posa(v);
                });
                i.spellcheck = false;
                cont.appendChild(avis);
                return;
            }
            if (typeof op[k] === 'number' || op[k] === null)
                return camp(cont, nom, 'number', op[k], function (v) {
                    var n = num(v);
                    if (n === null && o.tipus === 'grafica') return posa(null); // buit: el límit dels eixos
                    if (n !== null) posa(n);
                });
            var it = camp(
                cont,
                nom + (o.tipus === 'cota' && k === 'text' ? ' (' + T.cotaAuto + ')' : ''),
                'text',
                op[k],
                posa
            );
            it.spellcheck = false;
        });

        // Estil
        {
            var fs = el('fieldset', 'estil');
            fs.appendChild(el('legend', '', T.gruix + ' · ' + T.trac + ' · ' + T.color));
            if (cls !== 'punt' && o.tipus !== 'text') {
                camp(
                    fs,
                    T.gruix,
                    'select',
                    o.estil.gruix,
                    function (v) {
                        canvi(T.gruix, function (x) {
                            x.estil.gruix = v;
                        });
                    },
                    Object.keys(T.gruixos).map(function (k) {
                        return [k, T.gruixos[k]];
                    })
                );
                camp(
                    fs,
                    T.trac,
                    'select',
                    o.estil.trac,
                    function (v) {
                        canvi(T.trac, function (x) {
                            x.estil.trac = v;
                        });
                    },
                    Object.keys(T.tracos).map(function (k) {
                        return [k, T.tracos[k]];
                    })
                );
            }
            camp(
                fs,
                T.color,
                'select',
                o.estil.color,
                function (v) {
                    canvi(T.color, function (x) {
                        x.estil.color = v;
                    });
                },
                Object.keys(T.colors).map(function (k) {
                    return [k, T.colors[k]];
                })
            );
            cont.appendChild(fs);
        }
        camp(cont, T.visible, 'checkbox', o.visible, function (v) {
            canvi(T.visible, function (x) {
                x.visible = !!v;
            });
        });
        var n = G.dependents(ed.fig, o.id).length;
        var b = el('button', 'btn btn-perill', n ? T.esborraAmb(n) : T.esborra);
        b.type = 'button';
        b.addEventListener('click', function () {
            Ed.canvia(T.esborra + ' ' + o.id, function (fig) {
                G.elimina(fig, o.id);
            });
        });
        cont.appendChild(b);
    }

    function pintaLlista(ed) {
        cont.appendChild(el('h2', '', T.construccio));
        if (!ed.fig.objectes.length) cont.appendChild(el('p', 'nota', T.buida));
        else {
            var ol = el('ol', 'llista-objectes');
            ed.fig.objectes.forEach(function (o) {
                var li = document.createElement('li');
                var b = el(
                    'button',
                    'obj-llista' + (o.visible ? '' : ' amagat') + (ed.res.valors[o.id] === null ? ' indefinit' : ''),
                    ''
                );
                b.type = 'button';
                b.appendChild(el('b', '', o.id));
                b.appendChild(document.createTextNode(' ' + (T.tipus[o.tipus] || o.tipus)));
                b.addEventListener('click', function () {
                    Ed.selecciona(o.id);
                });
                li.appendChild(b);
                ol.appendChild(li);
            });
            cont.appendChild(ol);
        }
        var fs = el('fieldset', 'pagina-camps');
        fs.appendChild(el('legend', '', T.pagina));
        var v = ed.fig.vista;
        var vista = function (f) {
            Ed.canvia(T.pagina, function (fig) {
                f(fig.vista);
            });
        };
        camp(fs, 'x mín.', 'number', v.x0, function (s) {
            var n = num(s);
            if (n !== null)
                vista(function (w) {
                    var a = w.x1 - w.x0;
                    w.x0 = n;
                    w.x1 = n + a;
                });
        });
        camp(fs, 'y mín.', 'number', v.y0, function (s) {
            var n = num(s);
            if (n !== null)
                vista(function (w) {
                    var a = w.y1 - w.y0;
                    w.y0 = n;
                    w.y1 = n + a;
                });
        });
        camp(fs, T.amplada, 'number', Math.round((v.x1 - v.x0) * 1000) / 1000, function (s) {
            var n = num(s);
            if (n !== null && n >= 2 && n <= 40)
                vista(function (w) {
                    w.x1 = w.x0 + n;
                });
        });
        camp(fs, T.alcada, 'number', Math.round((v.y1 - v.y0) * 1000) / 1000, function (s) {
            var n = num(s);
            if (n !== null && n >= 2 && n <= 40)
                vista(function (w) {
                    w.y1 = w.y0 + n;
                });
        });
        camp(fs, T.graella, 'checkbox', ed.graella, function (b) {
            ed.graella = !!b;
            Ed.pinta();
        });
        camp(fs, T.ajustaGraella, 'checkbox', ed.ajusta, function (b) {
            ed.ajusta = !!b;
        });
        cont.appendChild(fs);
    }

    Ed.escolta(pinta);
    pinta(Ed.ed);
})();
