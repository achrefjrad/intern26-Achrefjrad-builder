FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN rm -f package-lock.json && npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]