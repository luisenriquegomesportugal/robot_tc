FROM node:10.15.3-alpine

WORKDIR /var/www

COPY . .

RUN npm install

EXPOSE 3000

CMD [ "npm", "start" ]