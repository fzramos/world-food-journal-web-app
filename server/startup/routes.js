import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import winston from 'winston';
import bodyParser from 'body-parser';
import restaurants from '../routes/restaurants';
import countryCounts from '../routes/countryCounts';
import users from '../routes/user';
import auth from '../routes/auth';
import logout from '../routes/logout';
import error from '../middleware/error';

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

  app.use(error);
}
