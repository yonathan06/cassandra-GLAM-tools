FROM       node:12-alpine

WORKDIR    /usr/cassandra-app

# Copy and install production packages
COPY       config config/
COPY       pages pages/
COPY       api.js ./
COPY       routes.js ./
COPY       server.js ./
COPY       package*.json ./
RUN        npm ci --production

# Non root user
USER       node

ENV        ENV="production"
ENV        PORT=8080
EXPOSE     8080
ENTRYPOINT ["npm"]
CMD        ["start"]
