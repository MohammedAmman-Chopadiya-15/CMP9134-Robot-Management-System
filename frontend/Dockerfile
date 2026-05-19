# Stage 1: Building React application
FROM node:18-alpine AS build
WORKDIR /app

# Installing dependencies
COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serving static files with Nginx
FROM nginx:stable-alpine

# Copying the custom configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]