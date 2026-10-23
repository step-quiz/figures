/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: js/ui/fitxers.js
 * ROL: Fitxers i exportació de l'editor: nova, plantilles, obre (.json o .tex,
 *      amb el selector o deixant-hi anar el fitxer), desa (.json), comparteix
 *      (enllaç #f=<codi>), importa des del .tex, desat automàtic, i el TikZ
 *      (copia, .tex autònom), la SVG i la PNG a 300 ppp (descarrega o copia).
 * ARQUITECTURA: Script clàssic. Desat automàtic a localStorage
 *      («figures:v1:actual», dins de try/catch). En obrir la pàgina: primer
 *      l'enllaç (#f=…), després el desat automàtic, si no, una figura buida.
 *      PNG: el SVG en una imatge (URL de Blob) dibuixada en un canvas.
 * DEPENDÈNCIES: GeoMotor, Dibuix, ExportaTikz, ExportaSvg, Codi, FIGURES_PLANTILLES,
 *      FiguresTextos, Editor
 * ============================================================================
 */
(function () {
    'use strict';
    var G = window.GeoMotor,
        D = window.Dibuix,
        TK = window.ExportaTikz,
        S = window.ExportaSvg,
        C = window.Codi,
        T = window.FiguresTextos,
        Ed = window.Editor,
        PLANTILLES = window.FIGURES_PLANTILLES || [];
    var $ = function (id) {
        return document.getElementById(id);
    };
    var CLAU = 'figures:v1:actual';
    var ed = Ed.ed;

    // ── Textos dels botons ─────────────────────────────────────────────────
    [
        ['btn-nova', T.nova],
        ['btn-obre', T.obre],
        ['btn-desa', T.desa],
        ['btn-comparteix', T.comparteix],
        ['btn-importa', T.importaTex],
        ['t-exporta', T.exporta],
        ['btn-copia-tikz', T.copiaTikz],
        ['btn-tex', T.descarregaTex],
        ['btn-svg', T.descarregaSvg],
        ['btn-png', T.descarregaPng],
        ['btn-copia-png', T.copiaPng],
        ['nota-exporta', T.exportaNota],
        ['t-importa', T.enganxaTex],
        ['btn-fes-importa', T.importa],
        ['btn-cancella', T.cancella],
        ['t-plantilles', T.plantilles],
    ].forEach(function (p) {
        $(p[0]).textContent = p[1];
    });

    function baixa(nom, contingut, tipus) {
        var blob = contingut instanceof Blob ? contingut : new Blob([contingut], { type: tipus });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nom;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 1000);
    }
    function copia(text) {
        try {
            return navigator.clipboard.writeText(text);
        } catch (e) {
            return Promise.reject(e);
        }
    }
    var avisaExporta = function (t) {
        $('estat-exporta').textContent = t;
        setTimeout(function () {
            if ($('estat-exporta').textContent === t) $('estat-exporta').textContent = '';
        }, 4000);
    };
    var visibles = function () {
        return D.primitives(ed.fig, ed.res);
    };

    // ── Obrir ──────────────────────────────────────────────────────────────
    function obreText(text, nom) {
        text = String(text);
        var codi = TK.codiDelTex(text);
        var p = codi ? C.descodifica(codi) : Promise.resolve(text);
        return p.then(function (json) {
            var r = G.llegeix(json);
            Ed.posaFigura(r.fig, nom || T.obre);
            Ed.avisa(r.descartats.length ? T.descartats(r.descartats.length) : '');
            return r;
        });
    }
    function obreFitxer(f) {
        var lector = new FileReader();
        lector.onload = function () {
            obreText(lector.result, f.name).catch(function () {
                Ed.avisa(/\.tex$/i.test(f.name) && !TK.codiDelTex(lector.result) ? T.texSenseCodi : T.fitxerDolent);
            });
        };
        lector.readAsText(f);
    }
    $('btn-obre').addEventListener('click', function () {
        $('fitxer').value = '';
        $('fitxer').click();
    });
    $('fitxer').addEventListener('change', function () {
        if ($('fitxer').files[0]) obreFitxer($('fitxer').files[0]);
    });
    ['dragover', 'drop'].forEach(function (t) {
        document.addEventListener(t, function (ev) {
            if (
                !ev.dataTransfer ||
                !Array.prototype.some.call(ev.dataTransfer.types || [], function (x) {
                    return x === 'Files';
                })
            )
                return;
            ev.preventDefault();
            if (t === 'dragover') Ed.avisa(T.arrossegaFitxer);
            else if (ev.dataTransfer.files[0]) obreFitxer(ev.dataTransfer.files[0]);
        });
    });

    // Plantilles
    var sel = $('plantilles');
    var op0 = document.createElement('option');
    op0.value = '';
    op0.textContent = T.plantilles;
    sel.appendChild(op0);
    PLANTILLES.forEach(function (p) {
        var o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.nom;
        sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
        var p = PLANTILLES.filter(function (x) {
            return x.id === sel.value;
        })[0];
        sel.value = '';
        if (p) Ed.posaFigura(G.llegeix(p.figura).fig, p.nom);
    });
    $('btn-nova').addEventListener('click', function () {
        if (ed.fig.objectes.length && !window.confirm(T.confirmaNova)) return;
        Ed.posaFigura(G.nova(), T.nova);
    });

    // Desa i comparteix
    $('btn-desa').addEventListener('click', function () {
        var d = new Date();
        var data =
            d.getFullYear() +
            '-' +
            String(d.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(d.getDate()).padStart(2, '0');
        baixa('figura-' + data + '.json', G.serialitza(ed.fig), 'application/json');
    });
    $('btn-comparteix').addEventListener('click', function () {
        C.codifica(G.serialitza(ed.fig)).then(function (codi) {
            var url = location.href.replace(/#.*$/, '') + '#f=' + codi;
            try {
                history.replaceState(null, '', '#f=' + codi);
            } catch (e) {
                /* res */
            }
            copia(url).then(
                function () {
                    Ed.avisa(T.enllacCopiat);
                },
                function () {
                    Ed.avisa(url);
                }
            );
        });
    });

    // Importa des del .tex
    var dialeg = $('dialeg-importa');
    $('btn-importa').addEventListener('click', function () {
        $('text-importa').value = '';
        $('error-importa').textContent = '';
        if (dialeg.showModal) dialeg.showModal();
        else dialeg.setAttribute('open', '');
        $('text-importa').focus();
    });
    $('btn-fes-importa').addEventListener('click', function () {
        var t = $('text-importa').value;
        if (!TK.codiDelTex(t)) {
            $('error-importa').textContent = T.texSenseCodi;
            return;
        }
        obreText(t, T.importaTex).then(
            function () {
                dialeg.close();
            },
            function () {
                $('error-importa').textContent = T.fitxerDolent;
            }
        );
    });

    // ── Exportar ───────────────────────────────────────────────────────────
    var versio = 0;
    function actualitzaTikz() {
        var v = ++versio;
        var json = G.serialitza(ed.fig);
        C.codifica(json).then(function (codi) {
            if (v !== versio) return; // n'hi ha una de més nova
            $('tikz').value = TK.fragment(visibles(), codi);
        });
    }
    $('btn-copia-tikz').addEventListener('click', function () {
        copia($('tikz').value).then(
            function () {
                avisaExporta(T.copiat);
            },
            function () {
                $('tikz').select();
                avisaExporta(T.noCopiat);
            }
        );
    });
    $('btn-tex').addEventListener('click', function () {
        C.codifica(G.serialitza(ed.fig)).then(function (codi) {
            baixa('figura.tex', TK.autonom(visibles(), codi), 'text/x-tex');
        });
    });
    $('btn-svg').addEventListener('click', function () {
        baixa('figura.svg', S.svg(visibles()).svg, 'image/svg+xml');
    });
    function png(quan) {
        var s = S.svg(visibles());
        var m = S.midaPng(s.ample, s.alt, 300);
        var img = new Image();
        var url = URL.createObjectURL(new Blob([s.svg], { type: 'image/svg+xml' }));
        img.onload = function () {
            var cv = document.createElement('canvas');
            cv.width = m.w;
            cv.height = m.h;
            var ctx = cv.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, m.w, m.h);
            ctx.drawImage(img, 0, 0, m.w, m.h);
            URL.revokeObjectURL(url);
            cv.toBlob(function (b) {
                quan(b, m);
            }, 'image/png');
        };
        img.src = url;
    }
    $('btn-png').addEventListener('click', function () {
        png(function (b) {
            if (b) baixa('figura.png', b);
        });
    });
    if (typeof window.ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        $('btn-copia-png').hidden = false;
        $('btn-copia-png').addEventListener('click', function () {
            png(function (b) {
                navigator.clipboard.write([new window.ClipboardItem({ 'image/png': b })]).then(
                    function () {
                        avisaExporta(T.copiat);
                    },
                    function () {
                        avisaExporta(T.noCopiat);
                    }
                );
            });
        });
    }
    window.FiguresFitxers = { png: png, obreText: obreText };

    // ── Desat automàtic ────────────────────────────────────────────────────
    var temps = null;
    Ed.escolta(function () {
        clearTimeout(temps);
        temps = setTimeout(function () {
            try {
                localStorage.setItem(CLAU, G.serialitza(ed.fig));
            } catch (e) {
                /* sense emmagatzematge: es treballa igual */
            }
            actualitzaTikz();
        }, 150);
    });

    // ── Inici ──────────────────────────────────────────────────────────────
    function comenca() {
        var m = /#f=([A-Za-z0-9_-]+)/.exec(location.hash);
        if (m)
            return C.descodifica(m[1])
                .then(function (json) {
                    return obreText(json);
                })
                .catch(function () {
                    Ed.avisa(T.fitxerDolent);
                    return deLocal();
                });
        return deLocal();
    }
    function deLocal() {
        var t = null;
        try {
            t = localStorage.getItem(CLAU);
        } catch (e) {
            t = null;
        }
        if (t) {
            try {
                Ed.posaFigura(G.llegeix(t).fig, T.obre);
            } catch (e) {
                /* figura buida */
            }
        }
        return Promise.resolve();
    }
    comenca().then(function () {
        ed.hist.buida(); // en obrir la pàgina, no hi ha res a desfer
        Ed.pinta();
        actualitzaTikz();
    });
})();
