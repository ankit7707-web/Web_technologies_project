FROM node:22.14.0-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIR=/data

COPY package.json ./
COPY server.js ./
COPY public ./public

RUN mkdir -p /data

EXPOSE 3000

VOLUME ["/data"]

CMD ["npm", "start"]
