import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'
import User from './User'
/* ----------------------------------- */

const PORT = 8080
const FRONTEND_ORIGIN = 'http://localhost:5173/signin'
const USER_DB_URL = 'mongodb://localhost:27017/hscs_user_db';

// Mongoose Helper Functions
export async function fetchUser (username) {
  if (!username) return null;
  return await User.findOne({username: username})
}

// for sign up
export async function newUser(username, email, password) {
  try {
    // create new user using input email and input password
    await User.create({
      username: username, email: email, pwd: password
    })
  }
  catch (e) {
    console.log(e.message)
  }
}

// create express application for sign in
const signiuapp = express();

// Middleware 
signiuapp.use(express.json()) // parses json
signiuapp.use(cookieParser()) // parses cookies
signiuapp.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
) // use cors to say that this frontend is safe to access the backend

// sign in if entered email and password are valid
// returns ... if password is incorrect but email exists
// returns ... if both password and email exist
// returns .. if none exist
signiuapp.post('/api/signin', (request, response) => {
  
  // get the username and password from the request
  const { username, password } = request.body
  
  const user = fetchUser(username) // use fetchUser function
  if (!user) return response.status(401).json({error: "User not found"})
  
  const passwordAuth = bcrypt(password, user.pwd)
  if (!passwordAuth) {return response.status(401).json({error: "Invalid password"})}
  else {return response.status(200).send('User authenticated!')}

  

})

// GET for sign up
signiuapp.get('/signup', (request, response) => {
  
  const { email, username, password } = request.body
  if (password)

  newUser(username, email, password)

})


mongoose.connect(USER_DB_URL)
  .then(() => {
    console.log("Database connected");
    signiuapp.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch((err) => console.error(err));