FROM node

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app/

# Install dependent modules
RUN npm install

# Expose inter-container port
EXPOSE 3000

# Start the node server
CMD [ "node", "server/server.js"]