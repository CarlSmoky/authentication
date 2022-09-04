import express from 'express';
import bodyParser from "body-parser";
import mongoose from 'mongoose';
import encrypt from 'mongoose-encryption';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

mongoose.connect(`mongodb://localhost:27017/userDB`);

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

const User = mongoose.model("user", userSchema);

app.route('/')
.get((req, res) => {
  res.render("home");
});

app.route('/login')
  .get((req, res) => {
    res.render("login");
  })

  .post (async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    try {
      const userByEmail = await User.findOne({email});
      if (userByEmail.password === password) {
        res.render("secrets");
      } else {
        res.send("wrong password");
      }
    }
    catch (err) {
      console.log(err);
      res.send("User doesn't exist");
    }
  });

app.route('/register')
  .get((req, res) => {
    res.render("register");
  })

  .post(async (req, res) => {
    const newUser = new User ({
      email: req.body.username,
      password: req.body.password
    })
    try {
      newUser.save();
      res.render("secrets");
    }
    catch (err) {
      res.send(err);
    }
  })




let port = process.env.PORT;
if (port == null || port == '') {
  port = 3001;
}

app.listen(port, (req, res) => {
  console.log(`I'm listening ${port}`);
})