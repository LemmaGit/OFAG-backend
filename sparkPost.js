import SparkPost from "sparkpost";
const client = new SparkPost(process.env.EMAIL_API_KEY);

export const sendEmail = async (from, to, subject, text, html) => {
  try {
    const response = await client.transmissions.send({
      content: {
        from: from,
        subject: subject,
        text: text,
        html: html,
      },
      recipients: [{ address: to }],
    });
    console.log("Email sent successfully:", response);
  } catch (err) {
    console.error("Error sending email:", err);
  }
};
