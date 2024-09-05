'use strict';

const xlangBackend = require('..');
const assert = require('assert').strict;

assert.strictEqual(xlangBackend(), 'Hello from xlangBackend');
console.info('xlangBackend tests passed');
