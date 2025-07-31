FROM public.ecr.aws/docker/library/node:22 AS builder

WORKDIR /usr/src/app

# Install dependencies based on the preferred package manager
COPY package.json ./

RUN npm install

COPY . .

RUN npm run build

FROM public.ecr.aws/docker/library/node:22

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/public ./public
# COPY --from=builder /usr/src/app/next.config.js ./next.config.js

RUN npm install

ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]