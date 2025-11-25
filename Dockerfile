FROM node:22 AS build

WORKDIR /usr/src

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY prisma ./prisma
COPY . .
RUN npx prisma generate
RUN yarn build

FROM node:22

WORKDIR /usr/src

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY --from=build /usr/src/dist ./dist
COPY --from=build /usr/src/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["node", "dist/main"]
