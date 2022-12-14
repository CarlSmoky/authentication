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
import findOrCreate from 'mongoose-findorcreate';

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
  password: String,
  googleId: String,
  secret: String
});

// const secret = process.env.SECRETKEY;

//Using md5
// userSchema.plugin(encrypt, { secret, encryptedFields: ['password'] });

//Using passport
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("user", userSchema);
mongoose.Promise = Promise;

//Using passport local authenticate
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser((user, done) => {
  done(null, user.id); //user.id is the id from Mongo
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) =>{
    done(err, user);
  });
});

//Using passport google auth20
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/google/oauth2",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
 (accessToken, refreshToken, profile, cb) => {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, (err, user) => {
      console.log(user);
      return cb(err, user);
    });
  }
));

app.route('/')
  .get((req, res) => {
    res.render("home");
  });

app.route('/auth/google')
  .get(passport.authenticate('google', { scope: ["profile"] }))

app.route('/auth/google/oauth2')
  .get(passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
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
        passport.authenticate('local', { failureRedirect: '/' })(req, res, () => {
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
    User.find({'secret': {$ne: null}}, (err, foundUsers) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUsers) {
          res.render('secrets', {usersWithSecrets: foundUsers});
        }
      }
    });

    // if (req.isAuthenticated()) {
    //   res.render('secrets');
    // } else {
    //   res.redirect('/login');
    // }
  });

app.route('/submit')
  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render('submit');
    } else {
      res.redirect('/login');
    }
  })

  .post((req, res) => {
    const submittedSecret = req.body.secret;
    User.findById(req.user.id, ((err, userByID) => {
      if (err) {
        console.log(err);
      } else {
        if (userByID) {
          userByID.secret = submittedSecret;
          userByID.save(() => {
            res.redirect('/secrets');
          });
        }
      }
    })
    )
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
        returnedFunc(req, res, () => {
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
  .get((req, res) => {
    req.logout(err => {
      if (!err) {
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