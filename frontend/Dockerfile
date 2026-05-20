# Setting up the initial Node environment to compile our source files
FROM node:18-alpine AS build
WORKDIR /app

# Moving package files over to install necessary libraries first
COPY package.json package-lock.json ./
RUN npm install

# Copying all remaining files to run the production script compilation
COPY . .
RUN npm run build

# Switching over to a lightweight web server image to host our files
FROM nginx:stable-alpine

# Applying our custom routing setup directly to the server folder configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Grabbing the built assets from the previous stage to host them publicly
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# Launching the web server process in the foreground to keep the container running
CMD ["nginx", "-g", "daemon off;"]