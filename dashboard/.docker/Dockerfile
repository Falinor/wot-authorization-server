FROM node:latest

LABEL maintainer "Andrea Gueugnaut <agueugnaut@octo.com>"

ENV APP /code

RUN mkdir -p $APP
WORKDIR $APP

COPY package.json yarn.lock $APP/
RUN yarn install

EXPOSE 4200

COPY . $APP
