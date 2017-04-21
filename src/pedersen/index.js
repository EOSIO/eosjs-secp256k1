
/** @module secp256k1.pedersen */
const Long = require('long')

const Module = require('..')
const {malloc, charStar, charStarArray, Uint64Long} = require('../MemUtils')

module.exports = {
    commit,
    blindSum,
    verifySum,
    rangeProofSign,
    rangeGetInfo,
    destroy
}

/**
 *  @summary Generate a pedersen commitment.
 *  @desription Blinding factors can be generated and verified in the same way as secp256k1 private keys for ECDSA.
 *
 *  @return {Uint8Array} commitment successfully created. (33 bytes)
 *  @arg {Array} blindFactor - 32-byte blinding factor (cannot be NULL)
 *  @arg {uint64} value - unsigned 64-bit integer value to commit to.
 *  @throws Error
 *  @exports
 */
function commit(blindFactor, value) {
    if(!blindFactor || blindFactor.length !== 32)
        throw new TypeError('blindFactor is a required 32 byte array')

    const commitment = malloc(33)
    const valueLong = Long.fromString(String(value), true)
    const ret = Module.ccall(
        'secp256k1_pedersen_commit', 'number',
        ['number', 'number', 'number', 'number', 'number'],
        [ctx(), commitment, charStar(blindFactor), valueLong.low, valueLong.high]
    )
    if(ret === 1) {
        return new Uint8Array(Module.HEAPU8.subarray(commitment, commitment + 33))
    } else {
        throw new Error('secp256k1_pedersen_commit', ret);
    }
}

/** Computes the sum of multiple positive and negative blinding factors.
 *
 *  @return {Uint8Array} sum successfully computed (32 bytes)
 *  @arg {Array.<Array>} blinds - 32-byte character arrays for blinding factors.
 *  @arg {number} [nneg = blinds.length] - how many of the initial factors should be treated with a positive sign.
 *  @throws Error
 *  @exports
 */
function blindSum(blinds, nneg = blinds.length) {
    const sum = malloc(32)
    const ret = Module.ccall(
        'secp256k1_pedersen_blind_sum', 'number',
        ['number', 'number', 'number', 'number', 'number'],
        [ctx(), sum, charStarArray(blinds), blinds.length, nneg]
    )
    if(ret === 1) {
        return new Uint8Array(Module.HEAPU8.subarray(sum, sum + 32))
    } else {
        throw new Error('secp256k1_pedersen_blind_sum', ret);
    }
}


/** Verify pedersen commitments - negativeCommits - excess === 0
 * @return {boolean} commitments successfully sum to zero.
 * @throws {Error} Commitments do not sum to zero or other error.
 * @arg {Array} commits: pointer to pointers to 33-byte character arrays for the commitments.
 * @arg {Array} ncommits: pointer to pointers to 33-byte character arrays for negative commitments.
 * @arg {int64} [excess = 0]: signed 64bit amount to add to the total to bring it to zero, can be negative.
 *
 * This computes sum(commit[0..pcnt)) - sum(ncommit[0..ncnt)) - excess*H == 0.
 *
 * A pedersen commitment is xG + vH where G and H are generators for the secp256k1 group and x is a blinding factor,
 * while v is the committed value. For a collection of commitments to sum to zero both their blinding factors and
 * values must sum to zero.
 *
 */
function verifySum(commits, negativeCommits, excess = 0) {
    const excessLong = new Long(String(excess), false)
    const ret = Module.ccall(
        'secp256k1_pedersen_verify_tally', 'number',
        [
            'number',
            'number', 'number',
            'number', 'number',
            'number', 'number'
        ],
        [
            ctx(),
            charStarArray(commits), commits.length,
            charStarArray(negativeCommits), negativeCommits.length,
            excessLong.low, excessLong.high
        ]
    )
    return ret === 1
}

/*
 * @summary Author a proof that a committed value is within a range.
 *
 * @return {Uint8Array} Proof successfully created.
 * @arg {uint64} minValue: constructs a proof where the verifer can tell the minimum value is at least the specified amount.
 * @arg {Array} commit: 33-byte array with the commitment being proved.
 * @arg {Array} commitBlind: 32-byte blinding factor used by commit.
 * @arg {Array} nonce: 32-byte secret nonce used to initialize the proof (value can be reverse-engineered out of the proof if this secret is known.)
 * @arg {int8} base10Exp: Base-10 exponent. Digits below above will be made public, but the proof will be made smaller. Allowed range is -1 to 18.
 *      (-1 is a special case that makes the value public. 0 is the most private.)
 * @arg {uint8} minBits: Number of bits of the value to keep private. (0 = auto/minimal, - 64).
 * @arg {uint64} actualValue:  Actual value of the commitment.
 * @exports
 *
 *  If min_value or exp is non-zero then the value must be on the range [0, 2^63) to prevent the proof range from spanning past 2^64.
 *
 *  If exp is -1 the value is revealed by the proof (e.g. it proves that the proof is a blinding of a specific value, without revealing the blinding key.)
 *
 *  This can randomly fail with probability around one in 2^100. If this happens, buy a lottery ticket and retry with a different nonce or blinding.
 *
 */
function rangeProofSign(minValue = 0, commitment, commitBlind, nonce, base10Exp = 0, minBits = 0, actualValue) {
    // array to receive the proof, can be up to 5134 bytes. (cannot be NULL)
    const proof = malloc(5134)

    // *  In/out: plen: point to an integer with the size of the proof buffer and the size of the constructed proof.
    const plen = charStar(8)
    Module.setValue(plen, 5134, 'i64')

    const minValueLong = Long.fromString(String(minValue), true)
    const actualValueLong = Long.fromString(String(actualValue), true)
    const ret = Module.ccall(
        'secp256k1_rangeproof_sign', 'number',
        [
            'number', 'number', 'number',
            'number', 'number',
            'number', 'number', 'number',
            'number', 'number', 'number'
        ],
        [
            ctx(), proof, plen,
            minValueLong.low, minValueLong.high,
            charStar(commitment), charStar(commitBlind), charStar(nonce),
            base10Exp, minBits, actualValueLong.low, actualValueLong.high,
        ]
    )
    if(ret === 1) {
        const plenRet = Module.getValue(plen, 'i64')
        return new Uint8Array(Module.HEAPU8.subarray(proof, proof + plenRet))
    } else {
        throw new Error('secp256k1_rangeproof_sign', ret);
    }
}

/**
    @typedef {ProofInfo}
    @property {int8} exp - Exponent used in the proof (-1 means the value isn't private).
    @property {int8} mantissa - Number of bits covered by the proof.
    @property {int64} min - minimum value that commit could have
    @property {int64} max - maximum value that commit could have
*/
/** Extract some basic information from a range-proof.
 *  @return {ProofInfo} 1: Information successfully extracted.
 *  @throws {Error} Decode failed
 *  @arg {Array} proof
 */
function rangeGetInfo(proof) {
    const exp = charStar(4)
    const mantissa = charStar(4)
    const min = charStar(8)
    const max = charStar(8)
    const secp256k1_rangeproof_info = Module.cwrap(
        'secp256k1_rangeproof_info', 'number',
        ['number', 'number', 'number', 'number', 'number', 'number', 'number']
    )
    const ret = secp256k1_rangeproof_info(
        ctx(), exp, mantissa, min, max,
        charStar(proof), proof.length
    )

    if(ret === 1) {
        return {
            exp: Module.getValue(exp, 'i32'),
            mantissa: Module.getValue(mantissa, 'i32'),
            min: Uint64Long(min).toString(),
            max: Uint64Long(max).toString(),
        }
    } else {
        throw new Error('secp256k1_rangeproof_info decode failed', ret)
    }
}

let _ctx
function ctx() {
    if(_ctx != null)
        return _ctx

    // const SECP256K1_FLAGS_TYPE_CONTEXT = 1 << 0
    // const SECP256K1_CONTEXT_NONE = SECP256K1_FLAGS_TYPE_CONTEXT
    const SECP256K1_CONTEXT_ALL = (1 << 0 | 1 << 1 | 1 << 7 | 1 << 8)
    _ctx = Module.ccall('secp256k1_context_create', 'number', ['number'], [SECP256K1_CONTEXT_ALL])
    return _ctx
}

/** @exports */
function destroy() {
    if(_ctx != null) {
        Module.ccall('secp256k1_context_destroy', null, ['number'], [_ctx])
        _ctx = null
    }
}
