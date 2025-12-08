import { mongoose } from "mongoose"

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        require: true,
    },
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

const Users = mongoose.model("Users", usersSchema);

export default Users;
