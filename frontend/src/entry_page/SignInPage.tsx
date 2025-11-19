import React from "react";
import ReactDom from "react-dom";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

export default function SignInPage() {

    

    const [username, setUsername] = useState<string>();
    const [password, setPassword] = useState<string>();

    useEffect(() => { // use useEffect to sync with db
        
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
    <form action={SignIn}>
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