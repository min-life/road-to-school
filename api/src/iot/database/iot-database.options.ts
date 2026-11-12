import type { MongooseModuleOptions } from '@nestjs/mongoose';
import { IOT_DATABASE } from '../iot.constants.js';

export function createIotDatabaseOptions(uri: string | undefined): MongooseModuleOptions {
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri.trim())) {
    // Do not include the URI in errors: it may contain credentials.
    throw new Error('MONGODB_IOT_URI must be configured when IOT_ENABLED=true');
  }

  return {
    uri: uri.trim(),
    dbName: IOT_DATABASE,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    retryAttempts: 1,
    bufferCommands: false,
    autoCreate: true,
    autoIndex: true,
  };
}
