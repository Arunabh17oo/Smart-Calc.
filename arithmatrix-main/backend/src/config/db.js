import mongoose from 'mongoose';

export async function connectDb(mongoUri) {
  if (!mongoUri) {
    throw new Error('MONGO_URI is required. Add it in web/server/.env.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  return mongoose.connection;
}
