import mongoose from 'mongoose'
import "dotenv/config"

async function connectDB() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/hscs_user_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Could not connect to database', err);
  }
}

await connectDB();
