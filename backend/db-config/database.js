import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken' // we will be using this for authentication
import User from './User'
import dotenv from 'dotenv'

dotenv.config() // Load environment variables from .env file

/* ----------------------------------- */

const PORT = process.env.PORT || 8080
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173/signin'
const USER_DB_URL = process.env.USER_DB_URL || 'mongodb://localhost:27017/hscs_user_db';
const JWT_SECRET = 

// Mongoose Helper Functions
async function fetchUser (username) {
  if (!username) return null
  return await User.findOne({username: username})
}

// for sign up
export async function newUser(username, email, password) {
  try {
    // create new user using input email and input password
    const hashedPassword = await bcrypt.hash(password, 10) // hash the password
    await User.create({
      username: username,
      email: email,
      pwd: password
    })
  }
  catch (e) {
    console.log(e.message)
  }
}

mongoose.connect(USER_DB_URL)
  .then(() => {
    console.log("Database connected");
    signiuapp.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch((err) => console.error("Database connection error:", err));