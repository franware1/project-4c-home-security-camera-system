const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const app = express();
const mongoose = require("mongoose");

const user = require("../User")

const USER_DB_URL = 'mongodb://localhost:27017/hscs_user_db';
mongoose.connect(DB_URL);
const conn = mongoose.connection;

conn.once('open', () => {
  console.log('Database connected successfully');
});

export async function fetchUser (email, password) {
  if (!email) return null;
  return await User.findOne({email: email, pwd: password})
}

// for sign up
export async function newUser(email, password) {
  try {
    // create new user using input email and input password
    const user = await User.create({
      email: email, pwd: password
    })

  }
  catch (e) {
    console.log(e.message)
  }
}