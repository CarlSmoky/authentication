import express from 'express';
import bodyParser from "body-parser";
import mongoose from 'mongoose';
import encrypt from 'mongoose-encryption';
import 'dotenv/config';
//1. Using md5
// import md5 from 'md5';

// 2. Using bcrypt
// import bcrypt from 'bcrypt';
// const saltRounds = 10;

//3. Using passport
import session from 'express-session';
import passport from 'passport';
import passportLocalMongoose from 'passport-local-mongoose';

//4. Using passport google auth20
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

//3. Using passport
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(`mongodb://localhost:27017/userDB`);

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

const secret = process.env.SECRETKEY;

//Using md5
// userSchema.plugin(encrypt, { secret, encryptedFields: ['password'] });

//Using passport
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("user", userSchema);

//Using passport
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Using passport google auth20
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/google/oauth2"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.route('/')
  .get((req, res) => {
    res.render("home");
  });

app.route('/login')
  .get((req, res) => {
    res.render("login");
  })

  .post((req, res) => {
    const user = new User({
      username: req.body.username,
      password: req.body.password
    })
    console.log("login");
    req.login(user, err => {
      if (!err) {
        passport.authenticate('local', { failureRedirect: '/' }) (req, res, function() {
          res.redirect('/secrets');
        })
      } else {
        res.send(err);
      }
    })

  })

//Using bcrypt
// .post(async (req, res) => {
//   const email = req.body.username;
//   const password = req.body.password;
//   try {
//     const userByEmail = await User.findOne({ email });
//     const match = await bcrypt.compare(password, userByEmail.password);
//     // console.log(match);
//     if (match) {
//       res.render("secrets");
//     } else {
//       res.send("wrong password");
//     }
//   }
//   catch (err) {
//     res.send("User doesn't register");
//   }
// });

app.route('/secrets')
  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render('secrets');
    } else {
      res.redirect('/login');
    }
  });

app.route('/register')
  .get((req, res) => {
    res.render("register");
  })

  //Using passport
  .post(async (req, res) => {
    try {
      const user = await User.register({ username: req.body.username, active: false }, req.body.password);
      if (!user) {
        res.redirect('/register');
      } else {
        console.log("here", user);
        // passport.authenticate('local', { failureRedirect: '/' }) (req, res, function() {
        //   res.redirect('/secrets');
        // })
        let returnedFunc = passport.authenticate('local', { failureRedirect: '/' });
        // console.log(returnedFunc);
        returnedFunc(req, res, () =>{
          res.redirect('/secrets');
        })
      }
    }
    catch (err) {
      res.send(err);
    }
  });
//Using bcrypt
// .post(async (req, res) => {
//   try {
//     const hash = await bcrypt.hash(req.body.password, saltRounds);

//     const newUser = new User({
//       email: req.body.username,
//       password: hash
//     })

//     newUser.save();
//     res.render("secrets");
//   }
//   catch (err) {
//     res.send(err);
//   }
// })

app.route('/logout')
  .get( (req, res) => {
      req.logout(err => {
        if(!err) {
          res.redirect('/');
        }
      });
  });


let port = process.env.PORT;
if (port == null || port == '') {
  port = 3001;
}

app.listen(port, (req, res) => {
  console.log(`I'm listening ${port}`);
})