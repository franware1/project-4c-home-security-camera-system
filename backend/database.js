const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const app = express();

app.use(cors());
app.use(express.json());

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  const user = await db.findUserByEmail(email); // your DB call
  if (!user) return res.status(404).json({ message: "User not found" });

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) return res.status(401).json({ message: "Incorrect password" });

  res.json({ id: user.id, email: user.email, name: user.name });
});

app.listen(3001, () => console.log("Server started"));
