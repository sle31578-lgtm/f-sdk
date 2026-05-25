FROM node:20-bullseye
RUN apt-get update && apt-get install -y curl git unzip xz-utils zip libglu1-mesa wget && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/flutter/flutter.git -b stable /opt/flutter
ENV PATH="/opt/flutter/bin:${PATH}"
RUN flutter config --enable-web
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8090
CMD ["node", "server.js"]
