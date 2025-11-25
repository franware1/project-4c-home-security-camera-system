import React, { FormEvent, useEffect, useState } from "react";
import ReactDom, { useFormStatus } from "react-dom";
import { fetchUser, newUser } from "../../backend/db-config/database"
import { Navigate, Outlet, Link } from "react-router-dom"
import './signin.css';

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
      if (!backend) return;
      e.preventDefault() // prevents it from reloading the page

      const fetchAuth = async () => {
        // (signiuapp.post) authenticate the form input
        try {
          const response = await fetch(`${backend}/api/signin`, {
            method: "POST",
            headers: { "Content-Type": ""},
            body: JSON.stringify({username, password}), // send this to backend
            credentials: "include",
        });

        const authData = await response.json() // parses through the response object as json

        if (!response.ok) { // if response status code is not 200
          alert(authData.error || "Login Failed")
          return
        }

        }
        catch (error) {
          console.error("No user found", error)
        }
      }
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
          />
        </div>

        <div className="forgot-password-link">
          <Link to="/forgotpwd.tsx">Forgot Password?</Link>
        </div>

        <div className="signup-link">
          Don't have an account? <Link to="/signup.tsx">Sign Up</Link>
        </div>

      </form>

      if (!usernameExists) <Navigate to='/signin?usernameExists=false'/> {/* if username doesn't exist then appear username doesn't exist message */}
      passwordAuth ? <Outlet/> : <Navigate to='/signin?passwordAuth=false'/> {/* if password doesn't exist then appear password is incorrect for given username message */}

    </div>
  );
}