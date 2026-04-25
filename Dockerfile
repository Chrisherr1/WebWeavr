FROM node:lts-alpine

RUN addgroup -S webweavr && adduser -S webweavr -G webweavr

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY config ./config
COPY controllers ./controllers
COPY middleware ./middleware
COPY modules ./modules
COPY pipeline ./pipeline
COPY repositories ./repositories
COPY routes ./routes
COPY services ./services
COPY utils ./utils
COPY app.js index.js ./

USER webweavr

EXPOSE 3000

CMD ["node", "index.js"]
