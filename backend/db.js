import mongoose from 'mongoose'
import "dotenv/config"

async function connectDB() {
  try {
    await mongoose.connect(
      process.env.DB_CONNECTION || "mongodb://localhost:27017/hscs_user_db",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Could not connect to MongoDB", err);
  }
}


await connectDB();