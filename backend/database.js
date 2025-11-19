const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const app = express();
const mongoose = require("mongoose");
PORT = 5000;  

DB_URL = 'mongodb://localhost:27017/mydatabase';
mongoose.connect(DB_URL);
const conn = mongoose.connection;

conn.once('open', () => {
  console.log('Database connected successfully');
});

app.use(cors());
app.use(express.json());

export function fetchUser (username) {
  if (!username) return '';
  // fetch user from database

  
}