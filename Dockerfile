FROM apiaryio/emcc:1.37

RUN apt-get update
RUN apt-get install dh-autoreconf -y
