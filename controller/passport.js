import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import env from "dotenv";
import { db } from "./db.js";

const saltRounds = 10;
env.config();



const passportConfig = {
    initPassport(){
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
                      [profile.email, 'google']
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
    }
}

export default passportConfig;