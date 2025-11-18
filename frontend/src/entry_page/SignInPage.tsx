import React from "react";
import ReactDom from "react-dom";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitForm } from "/actions.js";

function SignInPage() {
    const server = "http://localhost:80";

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        
        if (username && password) {
            console.log("Username and password are valid");
        } else {
            console.log("Username or password are invalid");
        } 

        
    });

    const login = useEffect(() => {
        // Handle login logic here, e.g., send credentials to the server
        console.log("Logging in with", username, password);
    });

  return (
    <form onSubmit={login}>
      <div>
        <label>Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
    </form>
  );
}