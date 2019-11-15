import 'dotenv/config';
import express from 'express';
import path from 'path';
import Youch from 'youch';
import * as Sentry from '@sentry/node';
import 'express-async-errors';
import routes from './routes';
import './database';
import sentryConfig from './config/sentry';
import io from 'socket.io';
import http from 'http';

class App {
  constructor() {
    this.app = express();
    this.server = http.Server(this.app);
    Sentry.init(sentryConfig);
    this.socket();
    this.middlewares();
    this.routes();
    this.exceptionHandler();
    this.connectionUsers = {};
  }

  socket() {
    this.io = io(this.server);
    this.io.on('connection', socket => {
      const { user_id } = socket.handshake.query;
      this.connectionUsers[user_id] = socket.id;
      socket.on('disconnect', () => {
        delete this.connectionUsers[user_id];
      });
    });
  }

  middlewares() {
    this.app.use(Sentry.Handlers.requestHandler());
    this.app.use(express.json());
    this.app.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'tmp', 'uploads'))
    );
    this.app.use((req, res, next) => {
      req.io = this.io;
      req.connectionUsers = this.connectionUsers;
      next();
    });
  }

  routes() {
    this.app.use(routes);
    this.app.use(Sentry.Handlers.errorHandler());
  }

  exceptionHandler() {
    this.app.use(async (err, req, res, next) => {
      if (process.env.NODE_ENV === 'development') {
        const errors = await new Youch(err, req).toJSON();
        return res.status(500).json(errors);
      }
      return res.status(500).json({ error: 'Internal server error.' });
    });
  }
}

export default new App().server;
