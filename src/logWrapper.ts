import { Injectable } from '@nestjs/common';
import { v4 as uuid_v4 } from 'uuid';
const winston = require('winston');

interface logInterface {
  warn: (message: string, args?: any[]) => void;
  error: (errorType: Error, message: string, args?: any[]) => void;
  log: (message: string, args?: any[]) => void;
}

@Injectable()
export default class logWrapper implements logInterface {
  private logInstance;

  constructor() {
    this.logInstance = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()],
    });
  }

  warn(message, args?): void {
    this.logInstance.warn(message, { ...args });
  }
  error(errorType, message, args?): void {
    const errorId = uuid_v4();

    const errorInstance = new errorType(message, errorId);

    this.logInstance.error(errorInstance.message, {
      ...args,
      errorId: errorId,
      stack: errorInstance.stack,
    });

    throw errorInstance;
  }
  log(message, args?): void {
    this.logInstance.log('info', message, { ...args });
  }
}
