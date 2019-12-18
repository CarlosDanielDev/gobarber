## install dependencies

```bash
yarn
```

## postgres 

```bash
docker run --name gobarber -e POSTGRES_PASSWORD=docker -p 5432:5432 -d postgres:11
```

## create database

```bash
yarn sequelize db:create
```

## run migrations

```bash
yarn sequelize db:migrate
```

## mongo

```bash
docker run --name mongobarber -p 27017:27017 -d -t mongo
```
## redis

```bash
docker run --name redisbarber -p 6379:6379 -d -t redis:alpine
```

## start project

```bash
docker start gobarber mongobarber redisbarber && yarn dev
```



