const nodemailer = require("nodemailer");
// import 'dotenv/config';
// const config = require("../config/config.js").get(process.env.NODE_ENV);
// const { EMAIL } = config;
const sendEmail = async (email, subject, html,attachments = []) => {  
try{
  let transport = nodemailer.createTransport(
    {
        host: process.env.HOST,
        port: process.env.EMAILPORT,
        secure: false,
        auth: {
            user:process.env.EMAILUSER,
            pass:process.env.EMAILPASS
        },
        tls: {
            rejectUnauthorized: false, // use this if you encounter self-signed certificate errors
          },
    }
);

const mailOptions = {
    from: "harshadakripal@gmail.com",
    to: email,
    subject: subject,
    html: html,
    attachments: attachments
}

let data = await transport.sendMail(mailOptions) 
console.log("data",data)    
if (data && data.accepted.length > 0)
    return true;
}
catch(err){
    console.log("error====================================>",err)
}

}
module.exports={sendEmail};