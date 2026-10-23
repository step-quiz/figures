/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: js/ui/historial.js
 * ROL: Desfer i refer (200 passos) amb el patró d'ordres: cada ordre guarda
 *      l'estat d'abans i el de després de la construcció (serialitzada), i es
 *      pot desfer i refer.
 * ARQUITECTURA: Pur, sense DOM (es prova amb Node). Les ordres són
 *      { nom, abans, despres } amb text JSON; així una ordre és barata i no
 *      depèn de com s'ha fet el canvi (eina, propietat, arrossegar…).
 * DEPENDÈNCIES: cap
 * ============================================================================
 */
(function (arrel, fabrica) {
    'use strict';
    var api = fabrica();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else arrel.Historial = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function crea(max) {
        max = max || 200;
        var passat = [],
            futur = [];
        return {
            /** Registra una ordre feta. No fa res si no ha canviat res. */
            fet: function (nom, abans, despres) {
                if (abans === despres) return false;
                passat.push({ nom: nom, abans: abans, despres: despres });
                if (passat.length > max) passat.shift();
                futur = [];
                return true;
            },
            /** L'estat que cal posar per desfer (o null). */
            desfes: function () {
                var o = passat.pop();
                if (!o) return null;
                futur.push(o);
                return { nom: o.nom, estat: o.abans };
            },
            /** L'estat que cal posar per refer (o null). */
            refes: function () {
                var o = futur.pop();
                if (!o) return null;
                passat.push(o);
                return { nom: o.nom, estat: o.despres };
            },
            potDesfer: function () {
                return passat.length > 0;
            },
            potRefer: function () {
                return futur.length > 0;
            },
            mida: function () {
                return passat.length;
            },
            buida: function () {
                passat = [];
                futur = [];
            },
        };
    }
    return { crea: crea };
});
