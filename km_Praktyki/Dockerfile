FROM node:22 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY certs/delivery.crt /etc/nginx/certs/delivery.crt
COPY certs/delivery.key /etc/nginx/certs/delivery.key

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]