require("dotenv").config()
const bodyParser = require("body-parser");
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB");

//mongoose-encryption creates new mongoose schema
const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});

//mongoose encryption
userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });


const User = mongoose.model("User", userSchema);


app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.post("/register", function(req, res){
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save(function (err){
        if (!err){
            res.render("secrets");
        } else {
            console.log("Error on .post /register");
        };
    })
});


app.post("/login", function(req, res){
    const Username = req.body.username;
    const Password = req.body.password;

    User.findOne({email:Username}, function(err, foundUser){
        if (err || !foundUser) {
            console.log(err);
            res.redirect("login");
        } else {
            if (foundUser) {
                if (foundUser.password === Password) {
                    res.render("secrets");
                } else {
                    res.redirect("login");
                    console.log("error!!!");
                }
            }
        }

    });
});


app.listen(3000, function(){
    console.log("server started on post 3000");
});
