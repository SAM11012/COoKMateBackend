import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GOOGLE_USER,
    pass:  process.env.GOOGLE_PASS,
  },
});

async function sendVerifcationEmail(receiverEmail: string) {
  try {
    const info = await transporter.sendMail({
      from: `"Maddison Foo Koch" <${process.env.EMAIL_USER}>`,
      to: receiverEmail,
      subject: "Hello ✔",
      text: "Hello world?", // plain‑text body
      html: "<b>Hello world?</b>", // HTML body
    });

    console.log("Message sent:", info.messageId);

    return { info, error: null };
  } catch (error) {
    console.error("Error sending email:", error);
    return { info: null, error };
  }
}

export { sendVerifcationEmail };
