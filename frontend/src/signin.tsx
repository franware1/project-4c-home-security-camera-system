import React, { FormEvent, useEffect, useState } from "react";
import ReactDom, { useFormStatus } from "react-dom";
import { Navigate, Outlet, Link } from "react-router-dom"
import './styles/signin.css';

export default function SignIn() {

    const backend = "http://localhost:8080"

    // use react states to set and get username and password
    const [username, setUsername] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    let usernameExists = {'token':false}
    let passwordAuth = {'token':false}

    // error codes

    const [failedAttemptState, setAttempt] = useState(false)
    const failedAttemptMessage = 'Password not recognized for this username'

    const showElement = () => {
      setAttempt(true); 
    }

    const handleSignIn = async (e: React.FormEvent) => {
      if (!backend) return
      e.preventDefault() // prevents it from reloading the page
      console.log("Form submitted with", username, password)

      const fetchAuth = async () => {
        // (signiuapp.post) authenticate the form input
        try {
          console.log("Sending request to sign in with", username, password)
          const response = await fetch(`${backend}/api/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({username, password}), // send this to backend
            credentials: "include",
          })

          if (!response.ok) { // if response status code is not 200
            const authData = await response.json()
            console.log("Sign in failed:", authData)
            showElement();
            return
          }

          const authData = await response.json() // parse json response
          if (authData.authToken) {
            // store authToken in cookie
            document.cookie = `authToken=${authData.authToken}; path=/;`
            // redirect to main app page
            window.location.href = "/App"
          }

          console.log("Received response:", authData)
        }
        catch (error) {
          console.error("No user found", error)
          
        }
      }

      fetchAuth()
    }
    
  return (
    <div className='signin-container'>
      <form className="signin-form" onSubmit={handleSignIn}>

        <div className="form-box">
          <label>
            Username:
          <input
            id="username"
            type="username"
            value={username}
            onChange={(user_typed_username) => setUsername(user_typed_username.target.value)} // inline function to change username on screen
            required // require username for form submission
          />
          </label>

          <label>Password:
          <input
            id="password"
            type="password"
            value={password}
            onChange={(user_typed_password) => setPassword(user_typed_password.target.value)} // inline function to change password on screen
            required // require password for form submission
          />
          </label>

          <button
            type="submit"
            title="Sign In"
            color="#0e0d6eff"
          >
            Sign In
          </button>
        </div>

        <div className="forgot-password-link">
          <Link to="/forgotpwd.tsx">Forgot Password?</Link>
        </div>

        <div className="signup-link">
          Don't have an account? <Link to="/signup.tsx">Sign Up</Link>
        </div>

      </form>

    </div>
  );
}