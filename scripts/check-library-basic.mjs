// Run with Node 22+: node --experimental-strip-types scripts/check-library-basic.mjs
import assert from 'node:assert/strict';
import { expression, runBasic, DEMO } from '../src/modules/library/basic.ts';

assert.equal(expression('6 * (4 + 3)'), 42);
assert.deepEqual(runBasic(DEMO).output, ['ONE SMALL STEP 1', 'ONE SMALL STEP 2', 'ONE SMALL STEP 3', 'ONE SMALL STEP 4', 'ONE SMALL STEP 5', 'WELCOME TO KAIZEN']);
assert.deepEqual(runBasic({10: 'FOR I=3 TO 1', 20: 'PRINT "BAD"', 30: 'NEXT I', 40: 'PRINT "DONE"'}).output, ['DONE']);
assert.deepEqual(runBasic({10: 'FOR I=3 TO 1 STEP -1', 20: 'PRINT I', 30: 'NEXT I', 40: 'PRINT "DONE"'}).output, ['3', '2', '1', 'DONE']);
assert.deepEqual(runBasic({10: 'FOR I=2 TO 1', 20: ' FOR J=1 TO 2', 30: 'PRINT J', 40: ' NEXT J', 50: 'NEXT I', 60: 'PRINT "DONE"'}).output, ['DONE']);
assert.deepEqual(runBasic({10: 'LET N=7', 20: 'IF N>5 THEN 40', 30: 'PRINT "BAD"', 40: 'PRINT N'}).output, ['7']);
assert.match(runBasic({10: 'GOTO 10'}).output.at(-1), /EXECUTION LIMIT/);
assert.match(runBasic({10: 'PRINT 1/0'}).output.at(-1), /DIVISION BY ZERO/);
assert.match(runBasic({10: 'PRINT window.location'}).output.at(-1), /SYNTAX ERROR/);
console.log('BASIC interpreter: 9 assertions passed');
