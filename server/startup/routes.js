import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import winston from 'winston';
import bodyParser from 'body-parser';
import restaurants from '../routes/restaurants.js';
import countryCounts from '../routes/countryCounts.js';
import users from '../routes/user.js';
import auth from '../routes/auth.js';
import image from '../routes/image.js';
import logout from '../routes/logout.js';
import error from '../middleware/error.js';

export default function (app) {
  // required since some of the journal request will be large strings
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(express.json());
  // for React HTTP ONly cookie parsing
  app.use(cookieParser());

  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('tiny'));
    winston.info('Morgan activated');
  }

  // increase the API req limit
  //   app.use(bodyParser.json({ limit: 10 * 1024 * 1024 }));
  //   app.use(bodyParser.raw({ limit: 10 * 1024 * 1024 }));

  app.use('/api/restaurants', restaurants);
  app.use('/api/country-counts', countryCounts);
  app.use('/api/user', users);
  app.use('/api/auth', auth);
  app.use('/api/logout', logout);
  app.use('/api/image', image);

  app.use(error);
}
