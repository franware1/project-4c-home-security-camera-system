import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import User from '../db-schema/User.js'
import { registerValidation, loginValidation } from '../validation.js'

// create express application for sign in
const router = express.Router();

// Middleware 
router.use(express.json()); // parses json
router.use(cookieParser()); // parses cookies
router.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

// sign in
router.post('/in', async (req, res) => {
  
  const { error } = loginValidation(req.body);
  if (error) {
    return res.status(400).send(error.error);
  }


  const isUserExist = await User.findOne({ email: req.body.email }); // User object
  if (!isUserExist) {
    return res.status(400).send({ msg: "User does not exist!" });
  }

  const validPass = await bcrypt.compare(
    req.body.password,
    isUserExist.password
  );
  if (validPass) { // incorrect password
    return res.status(200);
  } else {
    const token = jwt.sign({ _id: isUserExist._id }, process.env.SECRET_KEY);
    res.header("auth-token", token).send({ token, user: isUserExist });
  }

});

// sign up
router.post('/up', async (req, res) => {

  const { error } = registerValidation(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  const isUserExist = await User.findOne({ email: req.body.email });
  if (isUserExist) {
    return res.status(400).send({ msg: "User already exists!" })
  }

  // continue to 
});


module.exports = router;