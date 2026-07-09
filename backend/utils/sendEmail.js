const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  let transporter;

  // If you provide real Gmail credentials in your .env file, use them!
  if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  } else {
    // Fallback: Create a test account using Ethereal
    let testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
  }

  const message = {
    from: `Goodsync ERP <${process.env.SMTP_EMAIL || 'noreply@goodsync.edu'}>`,
    to: options.email,
    subject: options.subject,
    html: options.html
  };

  const info = await transporter.sendMail(message);

  console.log("Message sent: %s", info.messageId);
  
  if (!process.env.SMTP_EMAIL) {
    // Preview only available when sending through an Ethereal account
    console.log("============================================");
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    console.log("============================================");
  }
};

module.exports = sendEmail;
