/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: tests/geo-motor.test.js
 * ROL: El GeoMotor és un FITXER COMÚ (step-quiz-commons, fitxers/geo-motor.js):
 *      els seus tests de veritat són a step-quiz-commons (tests/geo-motor.test.js).
 *      Aquí només es comprova que la còpia d'aquest web és la comuna, que es
 *      carrega i que fa el que l'editor necessita; i, si al costat hi ha una
 *      còpia de step-quiz-commons, que és al dia.
 * ÚS: node tests/geo-motor.test.js
 * ============================================================================
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { suite, ok, eq, finish } = require('./harness');
const G = require('../js/motor/geo-motor.js');

const FITXER = path.join(__dirname, '..', 'js', 'motor', 'geo-motor.js');
const text = fs.readFileSync(FITXER, 'utf8');

suite('1. El fitxer comú');
{
    ok('porta l’avís de FITXER COMÚ (no s’edita aquí)', /FITXER COMÚ/.test(text) && /step-quiz-commons/.test(text));
    eq('versió del format', G.VERSIO, 1);
    const commons = path.join(__dirname, '..', '..', 'step-quiz-commons', 'fitxers', 'geo-motor.js');
    if (fs.existsSync(commons)) ok('és igual que el de step-quiz-commons (al costat)', fs.readFileSync(commons, 'utf8') === text, 'executa sincronitza.py');
    else ok('(no hi ha step-quiz-commons al costat: el workflow «Fitxers comuns» el posa al dia)', true);
}

suite('2. El que fa servir l’editor');
{
    const f = G.nova();
    G.afegeix(f, 'punt', [0, 0], { id: 'A' });
    G.afegeix(f, 'punt', [4, 0], { id: 'B' });
    G.afegeix(f, 'punt', [1, 3], { id: 'C' });
    for (const t of ['segment', 'recta', 'semirecta', 'mediatriu', 'circumferencia']) G.afegeix(f, t, ['A', 'B']);
    G.afegeix(f, 'poligon', ['A', 'B', 'C']);
    G.afegeix(f, 'marca-angle', ['B', 'A', 'C']);
    G.afegeix(f, 'eixos', []);
    const v = G.avalua(f).valors;
    ok('tots els tipus de l’editor s’avaluen', f.objectes.every(o => v[o.id] !== null && v[o.id] !== undefined));
    const s = G.serialitza(f);
    eq('anada i tornada', G.serialitza(G.llegeix(s).fig), s);
    for (const tipus of Object.keys(require('../js/ui/eines.js').EINES).map(k => require('../js/ui/eines.js').EINES[k].tipus).filter(Boolean))
        ok(`el tipus «${tipus}» de les eines existeix al GeoMotor`, !!G.TIPUS[tipus]);
}

finish('GEOMOTOR (FITXER COMÚ)');
