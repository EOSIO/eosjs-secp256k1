### CREDIT

https://github.com/arhag/crypto-experiments/tree/emscripten/emscripten/libsecp256k1-demo

### BUILD

```bash
docker run --rm -v $(pwd):/src -t secp256k1-js make veryclean
git clone https://github.com/ElementsProject/secp256k1-zkp.git secp256k1-build
cd secp256k1-build
git checkout 8de5830
cd -

docker build -t secp256k1-js .
docker run --rm -v $(pwd):/src -t secp256k1-js emconfigure ./configure wrap secp256k1-build
docker run --rm -v $(pwd):/src -t secp256k1-js emmake make
firefox wrap/secp256k1-test.html
```
