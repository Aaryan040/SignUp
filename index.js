import express from "express";
import bodyParser from "body-parser";
import passport from "passport";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
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

import userRoute from './router/router.js';
app.use('/', userRoute);

app.listen(port, ()=>{
    console.log(`Server is running on http://localhost:${port}`)
});
