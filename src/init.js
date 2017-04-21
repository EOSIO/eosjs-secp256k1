/** @module secp256k1 */
// console.log('secp256k1-js Load');

// emscripton re-assigns Module (use var)
var Module = {} // eslint-disable-line no-var
// Module.noInitialRun = true;
// Module.noExitRuntime = true;

Module['initPromise'] = new Promise(resolve => {
    Module['onRuntimeInitialized'] = function() {
        // console.log('secp256k1-js Initialize');
        resolve()
    }
})
