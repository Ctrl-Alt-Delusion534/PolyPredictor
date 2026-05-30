import mongoose from "mongoose";
const accountUserSchema= new mongoose.Schema({
    username:{
        type:String,
        required:[true,'Username is structurally required.'],
        unique:true,
        trim:true,
        minlength:[3,'Username must be atleast 3 characters.']
    },
    email: { 
    type: String, 
    required: [true, 'Email field parameter cannot be left blank.'], 
    unique: true, 
    trim: true,
    lowercase: true
  },
  passwordHash: { 
    type: String, 
    required: [true, 'Security parameter requires a valid crypt string.'] 
  },
  balance: { 
    type: Number, 
    default: 1000.00,
    min: [0, 'Wallet balance parameters can never fall into a negative margin.']
  }
},{timestamps:true});
    
export const AccountUser = mongoose.model("AccountUser", accountUserSchema);