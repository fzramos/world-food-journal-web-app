import winston from 'winston';
import 'express-async-errors'; // wraps all async routes with try/catch block

export default function () {
  winston.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
  winston.add(
    new winston.transports.File({
      filename: 'logfile.log',
      handleExceptions: true,
    })
  );
  winston.exceptions.handle([
    new winston.transports.Console({
      foramt: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: 'uncaughtExceptions.log',
      handleExceptions: true,
    }),
  ]);
}
