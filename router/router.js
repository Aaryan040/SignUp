import express from "express";
import { get_blogs, get_google, get_login, home, local, signUp, success, verify } from "../controller/function.js";

const router = express.Router();

router.get('/', home);

router.get('/login', get_login);

router.get("/blogs", get_blogs);

router.get("/auth/google", get_google);
  
router.get("/auth/google/secrets", success);

router.post("/login", local);

router.post('/signUp', signUp);

router.post("/verify", verify);

export default router;
