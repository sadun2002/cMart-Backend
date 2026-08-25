export const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>cMart Notifications</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f8fafc;
      padding-bottom: 40px;
    }
    .webkit {
      max-width: 600px;
      background-color: #ffffff;
      border-radius: 16px;
      margin: 40px auto;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%);
      padding: 32px 40px;
      text-align: center;
    }
    .logo-container {
      background-color: #ffffff;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: inline-block;
      line-height: 48px;
      font-weight: 900;
      font-size: 24px;
      color: #1d4ed8;
      margin-bottom: 12px;
    }
    .brand-name {
      color: #ffffff;
      font-size: 24px;
      font-weight: 900;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px;
      background-color: #ffffff;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 32px 40px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
    }
    .footer-links {
      margin: 16px 0;
    }
    .footer-links a {
      color: #3b82f6;
      text-decoration: none;
      margin: 0 8px;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 10px;
      font-weight: bold;
      font-size: 15px;
      margin: 24px 0;
    }
    .h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .p {
      font-size: 16px;
      line-height: 24px;
      color: #334155;
      margin-bottom: 16px;
    }
    
    @media screen and (prefers-color-scheme: dark) {
      body, .wrapper { background-color: #020617; color: #f8fafc; }
      .webkit { background-color: #0f172a; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
      .content { background-color: #0f172a; color: #f8fafc; }
      .h1 { color: #f8fafc; }
      .p { color: #cbd5e1; }
      .footer { background-color: #020617; color: #94a3b8; }
      .logo-container { background-color: #1e293b; color: #60a5fa; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="webkit">
      <div class="header">
        <div class="logo-container">c</div>
        <h1 class="brand-name">cMart</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} cMart Platform. All rights reserved.</p>
        <div class="footer-links">
          <a href="https://cmart.lk/privacy">Privacy Policy</a> &bull; 
          <a href="https://cmart.lk/contact">Contact Support</a>
        </div>
        <p style="font-size: 11px; margin-top: 16px;">
          You received this email because you are registered on the cMart Platform.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const forgotPasswordTemplate = (name: string, resetLink: string) => baseTemplate(`
  <h1 class="h1">Reset Your Password</h1>
  <p class="p">Hi ${name},</p>
  <p class="p">We received a request to reset the password for your cMart account. Click the button below to choose a new password.</p>
  <div style="text-align: center;">
    <a href="${resetLink}" class="button">Reset Password</a>
  </div>
  <p class="p" style="font-size: 14px; color: #64748b;">
    If you did not request a password reset, please ignore this email or contact support if you have concerns. This link will expire in 15 minutes.
  </p>
`);

export const tenantApprovedTemplate = (name: string, dashboardLink: string, plan: string) => {
  const isStartup = plan === 'STARTUP';
  const actionText = isStartup ? 'Download Desktop App' : 'Go to Dashboard';
  const actionLink = isStartup ? 'https://cmart.lk/download' : dashboardLink;
  
  return baseTemplate(`
  <h1 class="h1">Welcome to cMart! 🚀</h1>
  <p class="p">Hi ${name},</p>
  <p class="p">Great news! Your store has been successfully reviewed and approved by our team. Your account is now active and ready to use.</p>
  <p class="p">With cMart, you now have access to:</p>
  <ul class="p" style="padding-left: 20px;">
    <li>Advanced Point of Sale System</li>
    <li>Real-time Inventory Management</li>
    <li>Comprehensive Reports & Analytics</li>
    ${!isStartup ? '<li>Your own Auto-generated Online Store</li>' : ''}
  </ul>
  ${isStartup ? '<p class="p"><strong>Note:</strong> Since you are on the STARTUP plan, your data is stored locally. You must use our Desktop Application to access your dashboard and manage your store.</p>' : ''}
  <div style="text-align: center;">
    <a href="${actionLink}" class="button">${actionText}</a>
  </div>
  <p class="p">If you need any help getting started, our support team is always here for you.</p>
  `);
};

export const subscriptionUpdateTemplate = (name: string, plan: string, action: 'upgraded' | 'downgraded' | 'cancelled') => {
  let title = '';
  let msg = '';
  
  if (action === 'upgraded') {
    title = 'Subscription Upgraded 🌟';
    msg = `You have successfully upgraded your subscription to the <strong>${plan}</strong> plan. You now have access to all the new features included in this tier!`;
  } else if (action === 'downgraded') {
    title = 'Subscription Downgraded 📉';
    msg = `Your subscription has been changed to the <strong>${plan}</strong> plan. Some premium features may no longer be available.`;
  } else if (action === 'cancelled') {
    title = 'Subscription Cancelled 😔';
    msg = `Your subscription to the <strong>${plan}</strong> plan has been cancelled. You will continue to have access until the end of your current billing period.`;
  }

  return baseTemplate(`
    <h1 class="h1">${title}</h1>
    <p class="p">Hi ${name},</p>
    <p class="p">${msg}</p>
    <p class="p">If you have any questions about your billing or features, please check our FAQ or contact support.</p>
    <div style="text-align: center;">
      <a href="https://cmart.lk/login" class="button">Log In to Your Account</a>
    </div>
  `);
};

export const tenantPendingTemplate = (name: string) => baseTemplate(`
  <h1 class="h1">Application Received! ⏳</h1>
  <p class="p">Hi ${name},</p>
  <p class="p">Thank you for registering your store with cMart! We have received your application and it is currently <strong>Under Review</strong>.</p>
  <p class="p">Our team typically reviews applications within 24 to 48 hours. Once approved, you will receive another email with instructions on how to access your dashboard and set up your store.</p>
  <p class="p">If we need any additional information, we will contact you directly.</p>
  <p class="p">Thank you for choosing cMart!</p>
`);

export const tenantRejectedTemplate = (name: string, reason: string) => baseTemplate(`
  <h1 class="h1">Application Update</h1>
  <p class="p">Hi ${name},</p>
  <p class="p">Thank you for your interest in cMart. After carefully reviewing your store application, we regret to inform you that we are unable to approve your account at this time.</p>
  <div style="background-color: #f1f5f9; border-left: 4px solid #e2e8f0; padding: 16px; margin: 24px 0; border-radius: 4px;">
    <p class="p" style="margin: 0; font-weight: bold;">Reason for Rejection:</p>
    <p class="p" style="margin: 8px 0 0 0; color: #475569;">${reason}</p>
  </div>
  <p class="p">If you believe this was a mistake or have additional information to provide, please reply directly to this email to contact our support team.</p>
  <p class="p">Thank you for your understanding.</p>
`);
