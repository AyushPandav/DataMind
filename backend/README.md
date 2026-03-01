# DataMind Email Service Backend

Simple Node.js + Express + Nodemailer backend for sending CSV files via email.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Gmail (or other email service)

**For Gmail:**
1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **App passwords**
3. Select "Mail" and "Windows Computer"
4. Copy the generated 16-character password

**Alternative email services:**
- Change `service: 'gmail'` to your provider (e.g., 'outlook', 'yahoo')
- Or use SMTP configuration for custom providers

### 3. Create `.env` File

Copy `.env.example` and create `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
PORT=3001
```

### 4. Start the Backend

```bash
npm start
```

You should see:
```
🚀 DataMind Email Service running on http://localhost:3001
📧 Endpoint: http://localhost:3001/api/send-email
```

## Usage

The frontend (DataMind App) will automatically send requests to:
```
POST http://localhost:3001/api/send-email
```

### Example Request Body:
```json
{
  "senderEmail": "user@gmail.com",
  "senderName": "John Doe",
  "recipients": ["recipient1@email.com", "recipient2@email.com"],
  "subject": "Updated Dataset: Telco_Churn_Sample.csv",
  "csvContent": "col1,col2,col3\n...",
  "fileName": "Telco_Churn_Sample.csv"
}
```

## Testing

Check if the backend is running:
```bash
curl http://localhost:3001/health
```

Should return:
```json
{ "status": "OK", "message": "DataMind Email Service is running" }
```

## Troubleshooting

- **"Authentication failed"**: Check EMAIL_USER and EMAIL_PASS are correct
- **"Connection refused"**: Make sure backend is running (`npm start`)
- **Port already in use**: Change `PORT` in `.env` file
- **CORS errors**: Backend already has CORS enabled for all origins

## Security Notes

- ⚠️ Never commit `.env` file (already in `.gitignore`)
- Use App Passwords for Gmail, not your regular password
- For production, use environment variables or a secrets manager
