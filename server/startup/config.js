import { existsSync } from 'fs';

export default async function () {
  const env_variables = new Set(['WFJ_jwtPrivateKey', 'WFJ_mongoUri']);

  env_variables.forEach(function (value) {
    if (!(value in process.env)) {
      throw new Error(
        `FATAL ERROR: Required environment variable ${value} not set so application shutting down. Please set this variable before running the application again.`
      );
    }
  });

  if (!existsSync('credentials.json')) {
    throw new Error(
      'FATAL ERROR: Required file "credentials.json" file not found. Please set this file before running the application again'
    );
  }
}
