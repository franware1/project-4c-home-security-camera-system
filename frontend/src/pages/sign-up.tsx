import React, { FormEvent, useEffect, useState, Component } from "react";
import ReactDom, { useFormStatus } from "react-dom";
import { Navigate, Outlet, Link } from "react-router-dom"
import '../styles/sign-up.css';

export default function SignUp() {

    const backend = "http://localhost:8002"

    // use react states to set and get username and password
    const [username, setUsername] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [verification, setVerification] = useState<string>('')
    const [email, setEmail] = useState<string>('')

    // error codes
    const [errorMessage, setErrorMessage] = useState<string>('')

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault() // prevents it from reloading the page

      const fetchRegister = async () => {
        //  authenticate the form input
        try {

          const res = await fetch(`${backend}/api/v1/sign/up`, {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({
                email,
                username, 
                password,
                verification
            }), // send this to backend
            credentials: "include",
          })
          console.log("Sign up attempted")

          const authData = await res.json() // parses through the response object as json

          if (!res.ok) { // if response status code is not 200
            setErrorMessage(authData.error)
            return
          } else {
            setErrorMessage("")
          }

        }
        catch (err) {
          setErrorMessage("Invalid registration")
        }
      }

      fetchRegister();
    }
    
  return (
    <div className='signup-container'>
      <form id="form" className="signup-form" onSubmit={handleSubmit}>
        Email:
        <input
          id="email"
          type="email"
          value={email}
          onChange={(user_typed_email) => setEmail(user_typed_email.target.value)} // inline function to change username on screen
          required // require username for form submission
        />
        <br />

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

        Verify Password:
        <input
          id="verification"
          type="verification"
          value={verification}
          onChange={(user_typed_verification) => setVerification(user_typed_verification.target.value)} // inline function to change password on screen
          required // require password for form submission
        />
        <br />

        <button
          type="submit"
          color="#0e0d6eff"
        >
        Sign up
        </button>

        <div className="signin-link">
          Already have an account? <Link to="/sign-in">Sign In</Link>
        </div>

        <div id="error-box">{errorMessage}</div>

      </form>
    </div>
  );
}
