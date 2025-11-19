import React, { FormEvent, useEffect, useState } from "react";
import ReactDom, { useFormStatus } from "react-dom";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"; // use this to route user to different pages
import { fetchUser } from "../../../backend/database.js"

export default function SignInPage() {

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    function processUser(userSignInAttempt: React.FormEvent<HTMLFormElement>) {
      userSignInAttempt.preventDefault(); // prevent page reload on form submit

      console.log("User sign-in attempt")
      console.log("Submitting, ", {username, password})

      'use server'
      const user = fetchUser(username);

      if (!user) {
        console.log("User not found in database")
      }
      else {
        console.log("User found in database:", user)
      }

    } 

    
  return (
    <div className='signin-container'>
      <form className="signin-form" onSubmit={processUser}>

        <div className="form-box">
          <label>
            Email address:
          <input
            id="email"
            type="email"
            value={username}
            onChange={(user_typed_username) => setUsername(user_typed_username.target.value)} // inline function to change username on screen
          />
          </label>

          <label>Password:
          <input
            id="password"
            type="password"
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

        <div className="forgot-password-link">
          <Route path="/reset-password"/>
        </div>

        <div className="signup-link">
          Don't have an account?
          <a href="/signup.tsx">Sign up</a>
        </div>

      </form>
    </div>
  );
}