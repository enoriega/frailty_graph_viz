# pull official base image
FROM node:latest

WORKDIR /app

COPY . ./
RUN npm install --silent

# start app
EXPOSE 3000
CMD ["npm", "start"]
