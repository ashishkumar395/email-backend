require('dotenv').config();
const express = require('express');
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
  res.status(200).send('✅ Email Backend (Resend API) is running!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, timestamp: Date.now() });
});

// --- Helpers ---
const RESEND_URL = 'https://api.resend.com/emails';

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

if (!process.env.RESEND_API_KEY) {
  console.warn("⚠️ RESEND_API_KEY is not set. /api/send-email will fail until it is added.");
}

// --- Email Sending Route ---
app.post('/api/send-email', async (req, res) => {
  const { name, email, phone, service, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: name, email, or message"
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;
  const toEmail = process.env.TO_EMAIL || process.env.SMTP_USER;

  if (!apiKey || !senderEmail || !toEmail) {
    console.error("❌ Email service not configured (RESEND_API_KEY / SENDER_EMAIL / TO_EMAIL)");
    return res.status(500).json({
      success: false,
      error: "Email service is not configured"
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Bluth Services Website <${senderEmail}>`,
        to: [toEmail],
        reply_to: String(email),
        subject: `Website Inquiry - ${service || "General"}`,
        html: `
          <h2>New Inquiry from Website</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}</p>
          <p><strong>Service:</strong> ${escapeHtml(service || "Not mentioned")}</p>
          <p><strong>Message:</strong><br/>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
        `
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("❌ Resend API error:", response.status, data);
      return res.status(500).json({
        success: false,
        error: data.message || "Failed to send email"
      });
    }

    console.log("✅ Email sent:", data.id);

    res.status(200).json({
      success: true,
      message: "Email sent successfully via Resend",
      id: data.id
    });

  } catch (error) {
    const timedOut = error.name === 'AbortError';
    console.error("❌ Email sending error:", timedOut ? "Request to Resend timed out" : error.message);
    res.status(500).json({
      success: false,
      error: timedOut ? "Email service timed out" : (error.message || "Failed to send email")
    });
  } finally {
    clearTimeout(timer);
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});