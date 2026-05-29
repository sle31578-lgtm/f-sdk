FROM ghcr.io/cirruslabs/flutter:stable

USER root

RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    xz-utils \
    zip \
    libglu1-mesa \
    nodejs \
    npm

RUN git config --global --add safe.directory '*'

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN flutter config --enable-web

EXPOSE 3000

CMD ["npm", "start"]
