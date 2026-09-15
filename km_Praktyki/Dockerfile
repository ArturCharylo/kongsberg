FROM node:22 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

LABEL signer="Kongsberg-Maritime Code Signing"
LABEL cert-fingerprint="F1:5F:53:EB:4A:B2:19:91:C7:27:16:A3:D3:40:2F:5D:D1:40:C0:C7:F1:31:DB:95:7B:6E:F3:12:D2:A4:B3:E8"
LABEL image-signature="sha256:5c91e069518bed33b1ab41ccbf3b3e7bafc4041fa92e6f95d9bbcfdb24ff78c2"

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]