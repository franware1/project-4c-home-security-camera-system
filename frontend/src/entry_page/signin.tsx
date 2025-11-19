import React, { FormEvent, useEffect, useState } from "react";
import ReactDom, { useFormStatus } from "react-dom";
import { validate } from "../../../backend/database.js"

export default function SignInPage() {

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    function processUser(userSignInAttempt: React.FormEvent<HTMLFormElement>) {
      console.log("User sign-in attempt")
      console.log("Submitting, ", {username, password})
      'use server'
      validate{username, password}

    } 

    
  return (
    <form onSubmit={processUser}>

      <div>
        <label>
          Username:
        <input
          id="username"
          type="email"
          value={username}
          onChange={(user_typed_username) => setUsername(user_typed_username.target.value)} // inline function to change username on screen
        />
        </label>

        <label>Password:
        <input
          id="password"
          value={password}
          onChange={(user_typed_password) => setPassword(user_typed_password.target.value)} // inline function to change password on screen
        />
        </label>

        <button
          type="submit"
          title="Sign In"
          color="#0e0d6eff"
        />

      </div>
    </form>
  );
}