require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// --- CORS Middleware ---
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// --- Health Check Routes ---
app.get('/', (req, res) => {
  res.status(200).send('✅ Email Backend with Zoho SMTP is running!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, timestamp: Date.now() });
});

// --- SMTP Transporter Setup (Zoho) ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.zoho.in",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true" ? true : false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify SMTP
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP connection failed:", err);
  } else {
    console.log("✅ SMTP connected successfully to Zoho!");
  }
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
      from: process.env.SMTP_USER,
      replyTo: email,
      to: process.env.SMTP_USER,
      subject: `Website Inquiry - ${service || "General"}`,
      html: `
        <h2>New Inquiry from Website</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Service:</strong> ${service || "Not mentioned"}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent:", info.messageId);

    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      id: info.messageId
    });

  } catch (error) {
    console.error("❌ Email sending error:", error.message);

    res.status(500).json({
      success: false,
      error: error.message || "Failed to send email"
    });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
