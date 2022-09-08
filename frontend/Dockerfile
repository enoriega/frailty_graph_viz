# pull official base image
FROM node:latest

ARG BACKEND_PORT
ARG BACKEND_HOST

WORKDIR /app

ENV REACT_APP_BACKEND_HOST=${BACKEND_HOST}
ENV REACT_APP_BACKEND_PORT=${BACKEND_PORT}

COPY . ./
RUN npm install --silent
# Build the site
RUN npm run build
# Install serve
RUN npm install --global serve

# start app
EXPOSE ${FRONTEND_PORT}
#CMD ["npm", "start"]
CMD ["serve", "-p", "1600", "build/"]