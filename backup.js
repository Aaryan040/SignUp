import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";
import { Auth, LoginCredentials } from "two-step-auth";
import nodeMailer from  "nodemailer";
import otpGenerator from "otp-generator";
import validator from "validator";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
    })
  );

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });
  db.connect();

app.get('/', (req, res)=>{
    res.render("home.ejs");
})

app.get('/login', (req, res)=>{
    res.render( 'login.ejs');
});

app.get("/blogs", async (req, res) => {
  if (req.isAuthenticated()) {
    try{
      res.render("blog.ejs");
    }catch(err){
      console.log(err);
    }

    //TODO: Update this to pull in the user secret to render in secrets.ejs
  } else {
    res.redirect("/login");
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);
  
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/blogs",
    failureRedirect: "/login",
  })
);

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/blogs",
    failureRedirect: "/login",
  })
);

app.post('/signUp', async (req, res)=>{
  const email = req.body.email;
  const password = req.body.password;

  // Validate email address
  // if (!email || !validator.isEmail(email)) {
  //   return res.status(400).send("Invalid email address");
  // }

  const testAccount = await nodeMailer.createTestAccount();

  //connection with smtp server
  const transporter = nodeMailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.USER,
        pass: process.env.APP_PASSWORD
    }
  });

  const OTP = otpGenerator.generate(6, {digits : true, lowerCaseAlphabets : false, upperCaseAlphabets: false, specialChars: false });
  const OTP_int = parseInt(OTP);

   // send mail with defined transport object
   const info = await transporter.sendMail({
    from: 'a01042004@gmail.com', // sender address
    to: email, // list of receivers
    subject: "OTP for email verification", // Subject line
    text: `your otp is: ${OTP}`, // plain text body
  });
  
  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password, otp) VALUES ($1, $2, $3) RETURNING *",
            [email, hash, OTP_int]
          );
        }
      });
    }
  } catch (err) {
    console.log(err);
  }

  res.render('otp.ejs', { email : email});
})

app.post("/verify", async (req, res)=>{
  const enteredOtp = req.body.input1 + req.body.input2 + req.body.input3 + req.body.input4 + req.body.input5 + req.body.input6;
  const enteredOtp_int = parseInt(enteredOtp);
  const email = req.body.email;
  console.log(email);
  console.log(enteredOtp);

  const otpResult = await db.query("SELECT otp FROM users WHERE email = $1", [email]);
  const otp = otpResult.rows[0].otp;

    try{
      if(enteredOtp_int === otp){
        res.render('blog.ejs');
      }
      else{
        res.redirect('/');
      }
    } catch(err){
      console.log(err);
    }

});

passport.use(
  "local",
  new Strategy(async function verify(email, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        email,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile);
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, ()=>{
    console.log(`Server is running on http://localhost:${port}`)
});
