import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import cors from 'cors' //unused
import cookieParser from 'cookie-parser' //unused
import Users from '../db-schema/User.js'
import { registerValidation, loginValidation } from '../validation.js'

// create express application for sign in
const router = express.Router();

// Middleware 
router.use(express.json());

// router.use(cookieParser()); // parses cookies

// sign in
router.post('/in', async (req, res) => {
  console.log("Sign-in attempted")
  
  const { error } = loginValidation(req.body);
  if (error) {
    console.log("Sign-in failed")
    return res.status(400).send({ error: "Invalid login" });
  }


  const isUserExist = await Users.findOne({ email: req.body.email }); // User object
  if (!isUserExist) {
    console.log("Sign-in failed")
    return res.status(400).send({ error: "User does not exist!" });
  }

  const validPass = await bcrypt.compare(
    req.body.password,
    isUserExist.password
  );
  if (!validPass) { // incorrect password
    return res.status(400).send({ error: "Incorrect password" });
  } else {
    const token = jwt.sign({ _id: isUserExist._id }, process.env.SECRET_KEY);
    res.header("auth-token", token).send({ token, user: isUserExist });
    console.log("Sign-in successful")
  }

});

// sign up
router.post('/up', async (req, res) => {
  console.log("User registration attempted")

  const { error } = registerValidation(req.body);
  if (error) {
    console.log("User registration failed")
    return res.status(400).send({ error: "Invalid registration" });
  }

  const isUserExist = await User.findOne({ email: req.body.email });
  if (isUserExist) {
    console.log("User registration failed")
    return res.status(400).send({ error: "User already exists!" })
  }

  // continue to register the account
  const verifPass = await string.compare(
    req.body.password,
    req.body.verification
  )

  if (!verifPass) {
    console.log("User registration failed")
    return res.status(400).send({ error: "Passwords do not match" })
  } else {
      try {
        const newUser = {
          email: req.body.email,
          username: req.body.username,
          password: req.body.password
        }

        const result = await Users.insertOne(newUser)

        console.log(`A user was created in Users with the _id: ${result.insertedId}`)

      } catch (err) {
      console.log(`User was unable to be created in Users`)
      return res.status(400).send({ error: "User could not be created" })
    }
  }

});

export default router