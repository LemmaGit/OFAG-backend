import nodemailer from "nodemailer";
import pug from "pug";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER_NAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const templatePath = path.join(__dirname, "views/email-confirmation.pug");

  const html = pug.renderFile(templatePath, {
    libraryName: options.libraryName || "Our Library",
    confirmationUrl: options.confirmationUrl,
    name: options.name || "User",
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM_DOMAIN,
    to: options.email,
    subject: options.subject || "Confirm Your Library Account",
    html: html,
    text: `Welcome to our Library!\n\nPlease confirm your email by visiting this link: ${options.confirmationUrl}`,
  };

  await transporter.sendMail(mailOptions);
};
export default sendEmail;
