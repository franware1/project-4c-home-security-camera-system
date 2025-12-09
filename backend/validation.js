import { z } from "zod"


// helper functions for auth.js
const registerSchema = z.object({   
    username: z.string().
        min(6, "Username must be at least 6 characters").
        max(20, "Username cannot be more than 20 characters long"),

    email: z.union([
        z.string().endsWith("@gmail.com"),
        z.string().endsWith(".com")
    ]),

    password: z.string().
        min(6, "Password must be at least 6 characters"),

    verfication: z.string().
        min(6, "Password does not match")
    
});
    

const loginSchema = z.object({
    username: z.string().
        min(6, "Invalid username"),

    password: z.string().
        min(6, "Invalid password"),
})

export const registerValidation = (registerSchema) => (req, res, next) => {
    
    try {
        registerSchema.parse(req.body)
        next();
    } catch (err) {
        return res.status(400).json({
            error: "Cannot registration due to invalid field"
        })
    }

};

export const loginValidation = (loginSchema) => (req, res, next) => {

    try {
        loginSchema.parse(req.body);
        next();
  } catch (err) {
        return res.status(400).json({
        error: "Login is invalid",
    });
  }


};
