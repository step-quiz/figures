/**
 * ============================================================================
 * PROJECTE: figures (Step Quiz, vanilla JS)
 * FITXER: tests/run-all.js
 * ROL: Executa TOTS els tests, un darrere l'altre, i acaba amb error si algun
 *      falla. És el que executa GitHub a cada pujada (.github/workflows/tests.yml).
 *      Mateixa forma que operacions/tests/run-all.js. Només cal Node i Python 3.
 * ÚS: node tests/run-all.js
 * ============================================================================
 */
'use strict';
const path = require('path');
const { spawnSync } = require('child_process');

const ARREL = path.resolve(__dirname, '..');
const TESTS = [
    ['GeoMotor', 'tests/geo-motor.test.js'],
    ['Funcions y = f(x)', 'tests/funcio.test.js'],
    ['Exportació (TikZ, SVG, PNG, codi)', 'tests/export.test.js'],
    ['Eines i historial', 'tests/eines.test.js'],
    ['Repositori', 'tests/repo.test.js'],
    ['Versions dels CSS i JS (?v=)', 'tools/versio.py', ['--comprova']],
    ['Documentació ↔ codi', 'tests/docs_vs_codi.py'],
];

const resultats = TESTS.map(([nom, fitxer, args]) => {
    console.log(`\n${'═'.repeat(60)}\n  ${nom}  (${fitxer})\n${'═'.repeat(60)}`);
    const exe = fitxer.endsWith('.py') ? 'python3' : process.execPath;
    const r = spawnSync(exe, [path.join(ARREL, fitxer), ...(args || [])], { stdio: 'inherit', cwd: ARREL });
    if (r.error) console.log(`  ✗ No s'ha pogut executar: ${r.error.message}`);
    return [nom, r.status === 0];
});

console.log(`\n${'═'.repeat(60)}\n  RESUM\n${'═'.repeat(60)}`);
resultats.forEach(([nom, bo]) => console.log(`  ${bo ? '✓' : '✗'} ${nom}`));
const tot = resultats.every(([, bo]) => bo);
console.log(tot ? '\nTot correcte.' : '\nHi ha errors: mira els ✗ de més amunt.');
process.exit(tot ? 0 : 1);
