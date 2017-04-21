Compiles c++ secp256k1 implementation into JavaScript.

Currently this project focuses only on the pedersen blind transfer methods.  A
from-scratch JavaScript implementation did not exist.

### BUILD
```bash
git submodule update --init --recursive
docker build -t secp256k1-js .
yarn
yarn configure
yarn make
yarn test
```

### DEVELOPMENT
```bash
sudo chown -R $(whoami) .
yarn make
```

### CREDIT
- Build files and proof-of-concept
- https://github.com/arhag/crypto-experiments/tree/emscripten/emscripten/libsecp256k1-demo
