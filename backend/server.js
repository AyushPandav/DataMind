const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

/**
 * Configure your email service here
 * For Gmail: Use an App Password (not your regular password)
 * https://support.google.com/accounts/answer/185833
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { senderEmail, senderName, recipients, subject, csvContent, fileName } = req.body;

    // Validate input
    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'No recipients provided' });
    }

    // Create CSV attachment
    const attachment = {
      filename: fileName || 'data.csv',
      content: csvContent,
      contentType: 'text/csv'
    };

    // Compose email
    const mailOptions = {
      from: senderEmail || process.env.EMAIL_USER,
      to: recipients.join(','),
      subject: subject || 'Updated Dataset',
      text: `Hi,\n\nPlease find the updated CSV dataset attached.\n\nFile: ${fileName}\n\nBest regards,\n${senderName || 'DataMind Team'}`,
      html: `
        <html>
          <body>
            <p>Hi,</p>
            <p>Please find the updated CSV dataset attached.</p>
            <p><strong>File:</strong> ${fileName}</p>
            <p>Best regards,<br/>${senderName || 'DataMind Team'}</p>
          </body>
        </html>
      `,
      attachments: [attachment]
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${recipients.join(', ')} - Message ID: ${info.messageId}`);

    res.json({ 
      success: true, 
      message: `Email sent to ${recipients.length} recipient(s)`,
      messageId: info.messageId 
    });
  } catch (error) {
    console.error('❌ Email error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send email' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'DataMind Email Service is running' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 DataMind Email Service running on http://localhost:${PORT}`);
  console.log(`📧 Endpoint: http://localhost:${PORT}/api/send-email`);
  console.log(`\nℹ️  Make sure to set EMAIL_USER and EMAIL_PASS environment variables\n`);
});
