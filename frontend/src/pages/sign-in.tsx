import React, { FormEvent, useEffect, useState, Component } from "react";
import ReactDom, { useFormStatus } from "react-dom";
import { Navigate, Outlet, Link } from "react-router-dom"
import '../styles/sign-in.css';

export default function SignIn() {


    const backend = "http://localhost:8000"

    // use react states to set and get username and password
    const [username, setUsername] = useState<string>('')
    const [password, setPassword] = useState<string>('')

    // error codes
    const [errorMessage, setErrorMessage] = useState<string>('')

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault() // prevents it from reloading the page

      const fetchAuth = async () => {
        //  authenticate the form input
        try {

          const res = await fetch(`${backend}/api/v1/sign/in`, {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({username, password}), // send this to backend
            credentials: "include",
          })
          console.log("Sign in attempted")

          const authData = await res.json() // parses through the response object as json

          if (!res.ok) { // if response status code is not 200
            setErrorMessage(authData.error)
            return
          }

          setErrorMessage("")

        }
        catch (err) {
          setErrorMessage("No user found")
        }
      }

      fetchAuth();
    }
    
  return (
    <div className='signin-container'>
      <form id="form" className="signin-form" onSubmit={handleSubmit}>
        Username:
        <input
          id="username"
          type="username"
          value={username}
          onChange={(user_typed_username) => setUsername(user_typed_username.target.value)} // inline function to change username on screen
          required // require username for form submission
        />
        <br />

        Password:
        <input
          id="password"
          type="password"
          value={password}
          onChange={(user_typed_password) => setPassword(user_typed_password.target.value)} // inline function to change password on screen
          required // require password for form submission
        />
        <br />

        <button
          type="submit"
          color="#0e0d6eff"
        >
        Sign in
        </button>

        <div className="forgot-password-link">
          <Link to="/forgotpwd.tsx">Forgot Password?</Link>
        </div>

        <div className="signup-link">
          Don't have an account? <Link to="/signup.tsx">Sign Up</Link>
        </div>

        <div id="error-box">{errorMessage}</div>

      </form>
    </div>
  );
}
