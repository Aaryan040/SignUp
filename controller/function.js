import bcrypt from "bcrypt";
import passport from "passport";
import passportConfig from "./passport.js";
import { db } from "./db.js";
import nodeMailer from "nodemailer";
import otpGenerator from "otp-generator";
import env from "dotenv";

const saltRounds = 10;

env.config();
passportConfig.initPassport(); // Initialize Passport

export function home(req, res) {
  res.render("home.ejs");
}

export function get_login(req, res) {
  res.render("login.ejs");
}

export async function get_blogs(req, res) {
  if (req.isAuthenticated()) {
    try {
      res.render("blog.ejs");
    } catch (err) {
      console.log(err);
    }

    //TODO: Update this to pull in the user secret to render in secrets.ejs
  } else {
    res.redirect("/login");
  }
}

export async function get_google(req, res, next) {
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
}

export async function success(req, res, next) {
  passport.authenticate("google", {
    successRedirect: "/blogs",
    failureRedirect: "/login",
  })(req, res, next);
}

export async function local(req, res, next) {
  passport.authenticate("local", {
    successRedirect: "/blogs",
    failureRedirect: "/login",
  })(req, res, next);
}

export async function signUp(req, res) {
  const email = req.body.email;
  const password = req.body.password;

  // Validate email address
  // if (!email || !validator.isEmail(email)) {
  //   return res.status(400).send("Invalid email address");
  // }

  const testAccount = await nodeMailer.createTestAccount();

  //connection with smtp server
  const transporter = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.USER,
      pass: process.env.APP_PASSWORD,
    },
  });

  const OTP = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  const OTP_int = parseInt(OTP);

  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: "a01042004@gmail.com", // sender address
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

  res.render("otp.ejs", { email: email });
}

export async function verify(req, res) {
  const enteredOtp =
    req.body.input1 +
    req.body.input2 +
    req.body.input3 +
    req.body.input4 +
    req.body.input5 +
    req.body.input6;
  const enteredOtp_int = parseInt(enteredOtp);
  const email = req.body.email;
  console.log(email);
  console.log(enteredOtp);

  const otpResult = await db.query("SELECT otp FROM users WHERE email = $1", [
    email,
  ]);
  const otp = otpResult.rows[0].otp;

  try {
    if (enteredOtp_int === otp) {
      res.render("blog.ejs");
    } else {
      res.redirect("/");
    }
  } catch (err) {
    console.log(err);
  }
}
