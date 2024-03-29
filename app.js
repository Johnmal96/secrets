//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

//passing in options to session
app.use(session({
    secret: process.env.GOOD_LUCK,
    resave:false,
    saveUninitialized: false
}));

//initializing and setup session with passport
app.use(passport.initialize());
app.use(passport.session());

//connect to mongoose
mongoose.set('strictQuery', false);
mongoose.connect(process.env.DB, {useNewUrlParser: true});

//create user Schema using mongoose encryption
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secrets: [{type: String}]
});

//add plugin to schema for hashing, salting, and saving passwords // & findOrCreate
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//create model for userSchema
const User = mongoose.model("User", userSchema);

//passport/passport-local configuration
passport.use(User.createStrategy());

//code from passportjs used to serializeUser to maintain a login session
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
        });
    });
});

//code from passportjs used to deserializeUser to close a login session
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user);
    });
});

//Google stratergy code used to implement oauth2.0
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secrets-app-ga0j.onrender.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
})

//initiate authentication of user through Google
app.get("/auth/google",
    passport.authenticate("google", { scope: [ "profile" ]})
);

//get request made by google to redirect user back to 'secrets' site
app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
        res.redirect("/secrets");
    }
);

app.get("/secrets", function(req,res){

    if (req.isAuthenticated()){
        User.find({ secrets: { $exists: true, $ne: [] } }, function(err, foundUsers){
        if (err){
            console.log(err);
            res.redirect("/login");
        } else {
            if(foundUsers) {
                res.render("secrets", {usersWithSecrets: foundUsers});
            }
        }
        });
    } else {
        res.redirect("/login");
    }
});


app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});


app.post("/submit", function(req,res){

    const submittedSecret = req.body.secret;
    const userId = req.user.id
    const foundUser = User.findOne({_id: userId})

    foundUser.updateOne(
        {$push: {secrets: [submittedSecret]}},
        function(err) {
            if (err) {
                console.log(err);
              } else {
                res.redirect("/secrets");
              }
        }
    );  

});


app.get("/login", function(req, res){
    res.render("login");
});


app.post("/login", function(req,res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    //authenticae user before displaying secrets page
    req.login(user, function(err){
        if(err) {
            console.log(err);
            res.redirect("/register")
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });

});


app.get("/logout", function(req, res){
    req.logout( function (err) {
        if(err) {
            console.log(err)
        } else {
            res.redirect("/");      
        }
    });
});


app.get("/register", function(req, res){
    res.render("register");
});


app.post("/register", function(req, res){
    
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
            console.log(err);
            res.redirect("/login");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
})


app.listen(process.env.PORT, function(){
    console.log("Server started on port");
});