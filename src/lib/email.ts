import nodemailer from 'nodemailer';

export async function verifySmtpConnection(): Promise<boolean> {
  if (!process.env.SMTP_HOST) {
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();
    return true;
  } catch (error) {
    console.warn('SMTP verification failed:', error);
    return false;
  }
}

export async function sendInviteEmail(email: string, name: string | null, username: string, tempPassword: string) {
  if (!process.env.SMTP_HOST) {
    console.log(`
--- MOCK EMAIL ---
To: ${email}
Name: ${name || 'User'}
Username: ${username}
Temp Password: ${tempPassword}
------------------
    `);
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@peartravel.app';
    const loginUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome ${name ? name : ''}!</h2>
        <p>Your account has been created. Here are your login details:</p>
        
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 4px; font-family: monospace; margin: 24px 0;">
          <div style="margin-bottom: 8px;"><strong>Username:</strong> ${username}</div>
          <div><strong>Password:</strong> ${tempPassword}</div>
        </div>

        <p style="color: #b45309; font-weight: bold; padding: 12px; background-color: #fef3c7; border-radius: 4px;">
          This email contains your temporary password. Log in and change it immediately. Do not forward this email.
        </p>
        
        <p style="font-size: 0.9em; color: #666;">
          Note: For security reasons, this password will not be sent again.
        </p>

        <div style="margin-top: 32px;">
          <a href="${loginUrl}/login" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Log In Now
          </a>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Your Pear Travel Invitation',
      html,
      headers: {
        'X-Priority': '1',
        'X-Mailer': 'Pear Travel'
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return false;
  }
}
