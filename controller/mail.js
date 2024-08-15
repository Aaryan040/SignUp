import nodeMailer from  "nodemailer";
import otpGenerator from "otp-generator";

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

export { OTP, OTP_int };