import winston from 'winston';
import 'express-async-errors'; // wraps all async routes with try/catch block

export default function () {
  // Configure Winston transports for logging
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

  // Handle uncaught exceptions and log them to a separate file
  winston.exceptions.handle(
    new winston.transports.File({
      filename: 'uncaughtExceptions.log',
      handleExceptions: true,
    })
  );

  // Handle uncaught exceptions and exit the process
  process.on('uncaughtException', (err) => {
    winston.error('Uncaught Exception:', err.message);
    winston.error('Stack Trace:', err.stack);
    process.exit(1);
  });
}
