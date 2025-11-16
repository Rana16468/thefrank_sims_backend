interface EmailContextType {
  sendVerificationData: (username: string, otp: number, subject: string) => string;
}

const emailContext: EmailContextType = {
  sendVerificationData: (username: string, otp: number, subject: string): string => {
    if (!username || typeof username !== 'string') {
      throw new Error('Username must be a non-empty string');
    }
    if (!otp || typeof otp !== 'number' || otp < 100000 || otp > 999999) {
      throw new Error('OTP must be a 6-digit number');
    }
    if (!subject || typeof subject !== 'string') {
      throw new Error('Subject must be a non-empty string');
    }

    const currentYear = new Date().getFullYear();
    const escapedUsername = username.replace(/[<>&"]/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;'
      };
      return escapeMap[match] || match;
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .container {
      padding: 20px;
      border-radius: 5px;
      background-color: #f9f9f9;
      border: 1px solid #dddddd;
    }
    .header {
      text-align: center;
      padding: 10px;
      background-color: #4CAF50;
      color: white;
      border-radius: 5px 5px 0 0;
    }
    .content {
      padding: 20px;
      background-color: white;
      border-radius: 0 0 5px 5px;
    }
    .otp-code {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 5px;
      padding: 10px;
      margin: 20px 0;
      background-color: #f0f0f0;
      border-radius: 4px;
      font-family: monospace;
    }
    .footer {
      font-size: 12px;
      text-align: center;
      margin-top: 20px;
      color: #666666;
    }
    @media only screen and (max-width: 600px) {
      .container {
        padding: 10px;
      }
      .content {
        padding: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Email Verification</h2>
    </div>
    <div class="content">
      <p>Hello ${escapedUsername},</p>
      <p>Thank you for registering with our service. To complete your registration, please use the verification code below:</p>
      
      <div class="otp-code" role="text" aria-label="Verification code">${otp}</div>
      
      <p><strong>Important:</strong> This code will expire in 10 minutes for security reasons.</p>
      <p>If you did not request this code, please ignore this email.</p>
      <p>Best regards,<br>The Support Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>&copy; ${currentYear} Your Company Name. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }
};

export default emailContext;