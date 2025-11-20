const mongoose = require(mongoose)

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        require: true,
    },
    pwd: {
        // password requirements can be set here as well
        type: String,
        require: true,
        minLength: 8,
        maxLength: 16,
        
    }
})

module.exports = mongoose.model("user", userSchema) // export this model ( you can think of it as a constructor )
