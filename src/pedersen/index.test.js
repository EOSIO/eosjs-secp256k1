const assert = require('assert')
const createHash = require('create-hash')
const randomBytes = require('randombytes')
const Long = require('long')

const Module = require('..')
const pedersen = require('.')

const MAX_U64 = Long.MAX_UNSIGNED_VALUE.toString()
const sha256 = data => createHash('sha256').update(data).digest()
const {commit, blindSum, verifySum, rangeProofSign, rangeGetInfo} = pedersen

describe('pedersen', () => {

    before((done) => {
        Module.initPromise.then(() => {done()})
    })

    describe('bindings', () => {

        const h1 = sha256('h1') // blinding factor
        const h2 = sha256('h2')
        const nonce = createHash('sha256').update('nonce').digest()

        it('blind sum', () => {
            assert.equal(blindSum([h1], 0).length, 32)
            assert.equal(hexId(blindSum([h1], 0)), 'cceed11e')
            assert.equal(hexId(blindSum([h1], 1)), '33112ee1')
            assert.equal(hexId(blindSum([h1, h2], 0)), 'd355d318')
            assert.equal(hexId(blindSum([h1, h2], 1)), '397830da')
            assert.equal(hexId(blindSum([h1, h2], 2)), '2caa2ce7')
        })

        it('blind', () => {
            const blind = blindSum([h1], 0)
            assert.equal(commit(blind, 0).length, 33)
            assert.equal(hexId(commit(h1, 0)), '039253b1')
            assert.equal(hexId(commit(h1, 1)), '03d014f6')
            assert.equal(hexId(commit(h1, MAX_U64)), '02eb69fc')
        })

        it('range proof sign', () => {
            const B1 = blindSum([h1], 0)
            const C1 = commit(B1, 0)

            // console.log('h(C1)', h(C1))
            // console.log('h(B1)', h(B1))
            // console.log('h(nonce)', h(nonce))
            // console.log('Long.MAX_UNSIGNED_VALUE.toString()', MAX_U64)

            // BitShares websocket API example
            // $ wscat -c wss://bitshares.openledger.info/ws
            //
            // {"id":1,"method":"call","params":[1,"login",["",""]]}
            // {"id":2, "method":"call", "params":[1,"crypto",[]]}
            // {"id":2, "method":"call", "params":[2, "range_proof_sign", ["0", "029253b17ea78c505c5ab87944d3f284d25c80338b77b6a4fd3dd4cbac3a4f6c8d", "cceed11eb11b963c14ad016fcdd137e0e6aa3cdd71f245ce4e03e6c10823f306","78377b525757b494427f89014f97d79928f3938d14eb51e20fb5dec9834eb304", 0, 64, 123]]}

            // All of the following pass and return the same proofs aa the crypto_api in bitshares.
            assert.equal(shaId(rangeProofSign(0, C1, B1, nonce, 0, 0, 0)), '357dff97')
            assert.equal(shaId(rangeProofSign(MAX_U64, C1, B1, nonce, 0, 0, MAX_U64)), '8e6be734')
            throws(() => {rangeProofSign(0, C1, B1, nonce, 0, 65, MAX_U64)}, /secp256k1_rangeproof_sign/)
            throws(() => {rangeProofSign(0, C1, B1, nonce, 19, 0, MAX_U64)}, /secp256k1_rangeproof_sign/)
            assert.equal(shaId(rangeProofSign(0, C1, B1, nonce, -1, 0, 123)), '1d5282c8')
            assert.equal(shaId(rangeProofSign(0, C1, B1, nonce, 18, 0, 123)), '8995041a')
        })

        it('range proof info', () => {
            const B1 = blindSum([h1], 0)
            const C1 = commit(B1, 0)
            const P1 = rangeProofSign(0, C1, B1, nonce, 0, 0, 0)
            const p1 = rangeGetInfo(P1)
            assert.equal(p1.exp, 0)
            assert.equal(p1.mantissa, 1)
            assert.equal(p1.min, 0)
            assert.equal(p1.max, 1)
        })

        // it('range proof sign (S L O W)', () => {
        //     const blind = blindSum([h1], 0)
        //     const C1 = commit(blind, 0)
        //     assert.equal(shaId(rangeProofSign(0, C1, blind, nonce, 0, 64, 123)), 'a6dd4bc2') // S L O W
        // })
    })

    describe('usage', () => {

        const BF1 = randomBytes(32) // secret
        const BF2 = randomBytes(32) // secret
        const amount1 = randomBytes(1)[0]
        const amount2 = randomBytes(1)[0]

        const C1 = commit(BF1, amount1)
        const C2 = commit(BF2, amount2)

        it('proof', () => {
            const nonce = randomBytes(32)
            const P1 = rangeProofSign(0, C1, BF1, nonce, 0, 0, amount1)
            const p1 = rangeGetInfo(P1)
            assert.equal(p1.exp, 0)
            assert(p1.mantissa <= 8, p1.mantissa)
            assert.equal(p1.min, 0)
            assert(p1.max <= 255, p1.max)
        })

        it('verify sum', () => {
            // @see https://www.weusecoins.com/confidential-transactions
            // Commitments can be added, and the sum of a set of commitments is
            // the same as a commitment to the sum of the data.

            // C(BF1, amount1) + C(BF2, amount2) == C(BF1 + BF2, amount1 + amount2)
            const C3 = commit(blindSum([BF1, BF2]), amount1 + amount2)
            assert(verifySum([C1, C2], [C3]))
            assert(verifySum([C1], [C1]))
            assert(verifySum([C2], [C2]))
            assert(verifySum([C3], [C3]))

            // TODO: C(BF1, amount1) + C(BF2, amount2) - C(BF4, data4) == 0
        })

        it('medium proof', () => {
            const nonce = randomBytes(32)
            const B1 = blindSum([BF1], 0)
            const P1 = rangeProofSign(0, C1, B1, nonce, 0, 0, MAX_U64) // S L O W
            const p1 = rangeGetInfo(P1)
            assert.equal(p1.exp, 0)
            assert.equal(p1.mantissa, 64)
            assert(p1.min >= 0, p1.min)
            assert(p1.max == Long.MAX_UNSIGNED_VALUE.toString(), p1.max)
        })

        it('strong proof', () => {
            const nonce = randomBytes(32)
            const B1 = blindSum([BF1], 0)
            const P1 = rangeProofSign(0, C1, B1, nonce, 0, 0, Math.pow(2, 32))
            const p1 = rangeGetInfo(P1)
            assert.equal(p1.exp, 0)
            assert.equal(p1.mantissa, 33)
            assert(p1.min >= 0)
            assert(p1.max == Math.pow(2, 33) - 1, p1.max)
        })
    })

    after(()=> {
        pedersen.destroy()
    })
})

// const hex = arr => Buffer.from(arr).toString('hex')
const hexId = arr => Buffer.from(arr).slice(0, 4).toString('hex')
const shaId = buf => hexId(createHash('sha1').update(buf).digest())

function throws(fn, match) {
    try {
        fn()
        assert(false, 'Expecting error')
    } catch(error) {
        if(!match.test(error)) {
            error.message = `Error did not match ${match}\n${error.message}`
            throw error
        }
    }
}
