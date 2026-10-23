/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: tests/harness.js
 * ROL: Eines mínimes per als tests (només Node, sense dependències):
 *      suite() / ok() / eq() i el resum final amb codi de sortida 0 o 1.
 *      Mateixa forma que operacions/tests/harness.js.
 * ============================================================================
 */
'use strict';
let passats = 0,
    fallats = 0;
const errors = [];
let actual = '';

function suite(nom) {
    actual = nom;
    console.log(`\n▶ ${nom}`);
}
function ok(etiqueta, condicio, detall = '') {
    if (condicio) {
        passats++;
        console.log(`  ✓ ${etiqueta}`);
    } else {
        fallats++;
        errors.push(`${actual} › ${etiqueta}`);
        console.log(`  ✗ ${etiqueta}${detall ? `\n      → ${detall}` : ''}`);
    }
}
function eq(etiqueta, rebut, esperat) {
    ok(etiqueta, rebut === esperat, `esperat ${JSON.stringify(esperat)}, rebut ${JSON.stringify(rebut)}`);
}
function finish(titol) {
    console.log(`\n${'─'.repeat(60)}\n${titol}: ${passats} correctes, ${fallats} errors`);
    if (fallats) errors.forEach(e => console.log(`  ✗ ${e}`));
    process.exit(fallats ? 1 : 0);
}
module.exports = { suite, ok, eq, finish };
