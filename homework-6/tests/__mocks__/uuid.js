'use strict';

/**
 * Jest-only shim for the `uuid` package.
 *
 * The installed `uuid` (v14) ships ESM-only (`"type": "module"`), which
 * Node's native `require()` can interop with directly (Node >= 20.19 / 22.12
 * supports `require(esm)`), but Jest's CommonJS module registry does not.
 * Rather than pull in a Babel/ESM transform pipeline just for this one
 * dependency, tests map `uuid` to this shim (see jest.config.js
 * `moduleNameMapper`), which provides an equivalent `v4()` using Node's
 * built-in `crypto.randomUUID()`. This only affects module resolution
 * inside the Jest test runner -- it does not change pipeline source code
 * or its behavior when run normally via `node`/`npm run pipeline`.
 */

const { randomUUID } = require('crypto');

function v4() {
  return randomUUID();
}

module.exports = { v4 };
