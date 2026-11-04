FROM emscripten/emsdk:latest

RUN apt-get update && apt-get install -y \
    nodejs npm make git

WORKDIR /app

COPY . .

RUN npm install

RUN make build

CMD ["npm", "start"]
