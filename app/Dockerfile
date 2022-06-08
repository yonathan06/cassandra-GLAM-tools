FROM       node:16-alpine

# Installs latest Chromium (100) package.
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  nodejs \
  yarn

WORKDIR    /app

# Copy and install production packages
COPY       config config/
COPY       pages pages/
COPY       api.js ./
COPY       middlewares middlewares/
COPY       routes routes/
COPY       locales locales/
COPY       lib lib/
COPY       countries.json ./
COPY       routes.js ./
COPY       server.js ./
COPY       package*.json ./

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN npm ci --production

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
  && mkdir -p /home/pptruser/Downloads /app \
  && chown -R pptruser:pptruser /home/pptruser \
  && chown -R pptruser:pptruser /app

# Non root user
USER       pptruser

ENV        ENV="production"
ENV        PORT=8080
EXPOSE     8080
ENTRYPOINT ["npm"]
CMD        ["start"]
