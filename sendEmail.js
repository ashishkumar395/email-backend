require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Health Check Routes ---
app.get('/', (req, res) => {
  res.status(200).send('✅ Email Backend is running successfully on Render');
});

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, timestamp: Date.now() });
});

// --- SMTP Transporter Setup ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtpout.secureserver.net",
  port: Number(process.env.SMTP_PORT) || 587,  // ⚠️ Changed to 587 for TLS
  secure: false,                               // TLS requires false
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000
});

// Verify SMTP connection
transporter.verify((err, success) => {
  if (err) console.error("❌ SMTP connection failed:", err);
  else console.log("✅ SMTP connection successful!");
});

// --- Email Sending Route ---
app.post('/api/send-email', async (req, res) => {
  const { name, email, phone, service, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: name, email, or message"
    });
  }

  try {
    const mailOptions = {
      from: `"${name}" <${process.env.SMTP_USER}>`,
      replyTo: email,
      to: process.env.SMTP_USER,
      subject: `Website Contact Form — ${service || "General Inquiry"}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>📩 New Contact Inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "N/A"}</p>
          <p><strong>Service:</strong> ${service || "Not specified"}</p>
          <p><strong>Message:</strong><br/>${message}</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.response);

    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId
    });
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to send email"
    });
  }
});

// --- Start the Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Email API running on port ${PORT}`);
});
