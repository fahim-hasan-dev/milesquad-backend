import config from '../config'
import { ICreateAccount, IResetPassword } from '../interfaces/emailTemplate'

const createAccount = (values: ICreateAccount) => {
  console.log(values, 'values')
  const data = {
    to: values.email,
    subject: `Verify your Template account, ${values.name}`,
    html: `
<body style="margin:0; padding:0; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="max-width:640px; margin:40px auto; background-color:#ffffff; border-radius:14px;
                overflow:hidden; box-shadow:0 5px 25px rgba(0,0,0,0.08);">
    
    <!-- Body -->
    <tr>
      <td style="padding:45px;">
        <h1 style="color:#0096FF; font-size:26px; font-weight:700; margin-bottom:15px; text-align:center;">
          Verify Your Email ✨
        </h1>

        <p style="color:#003060; font-size:16px; line-height:1.6; margin-bottom:25px; text-align:center;">
          Hey <strong>${values.name}</strong>, welcome to <strong>Template</strong>! 🎉<br>
          Please verify your email to activate your account.
        </p>

        <!-- OTP Box -->
        <div style="background:linear-gradient(145deg,#EAF4FF,#D7E9FF); border:2px solid #0096FF; 
                    border-radius:12px; padding:25px 0; text-align:center; margin:30px auto; max-width:300px;">
          <span style="font-size:40px; font-weight:700; color:#003060; letter-spacing:6px;">
            ${values.otp}
          </span>
        </div>

        <p style="color:#003060; font-size:15px; line-height:1.6; text-align:center;">
          This code will expire in <strong>5 minutes</strong>.<br>
          If you didn’t request this, you can safely ignore this email.
        </p>

        <!-- Tip -->
        <div style="margin-top:35px; background-color:#fff8e1; border-left:6px solid #ffd54f; 
                    border-radius:8px; padding:15px 18px;">
          <p style="margin:0; color:#4a4a4a; font-size:14px;">
            🔒 For security reasons, never share this code with anyone.
          </p>
        </div>

        <!-- Button -->
        <div style="text-align:center; margin-top:45px;">
          <a href="${config.frontend_url}/otp-verify" 
             style="background-color:#0096FF; color:#ffffff; padding:14px 32px; font-size:16px; 
                    font-weight:600; border-radius:10px; text-decoration:none; display:inline-block; 
                    box-shadow:0 4px 12px rgba(0,150,255,0.3); transition:all 0.3s;">
            Open App 🚀
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" style="background:linear-gradient(135deg,#F5FAFF,#E6F0FF); padding:25px 20px; border-top:1px solid #0096FF33;">
        <p style="margin:0; color:#003060; font-size:13px;">
          © ${new Date().getFullYear()} <strong>Template</strong>. All rights reserved.
        </p>
        <p style="margin:6px 0 0; color:#003060; font-size:13px;">
          Powered by <strong style="color:#0096FF;">Template API</strong> ✨
        </p>
      </td>
    </tr>

  </table>
</body>
    `,
  }
  return data
}

const resetPassword = (values: IResetPassword) => {
  console.log(values, 'values')
  const data = {
    to: values.email,
    subject: `Reset your App password, ${values.name}`,
    html: `
<body style="margin:0; padding:0; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="max-width:640px; margin:40px auto; background-color:#ffffff; border-radius:14px;
                overflow:hidden; box-shadow:0 5px 25px rgba(0,0,0,0.08);">
    
    <!-- Body -->
    <tr>
      <td style="padding:45px;">
        <h1 style="color:#0096FF; font-size:26px; font-weight:700; margin-bottom:15px; text-align:center;">
          Password Reset Request 🔐
        </h1>

        <p style="color:#003060; font-size:16px; line-height:1.6; margin-bottom:25px; text-align:center;">
          Hi <strong>${values.name}</strong>, 👋<br>
          We received a request to reset your password for your <strong>App</strong> account.
          <br>Enter the code below to complete the process:
        </p>

        <!-- OTP Box -->
        <div style="background:linear-gradient(145deg,#EAF4FF,#D7E9FF); border:2px solid #0096FF;
                    border-radius:12px; padding:25px 0; text-align:center; margin:30px auto; max-width:300px;">
          <span style="font-size:40px; font-weight:700; color:#003060; letter-spacing:6px;">
            ${values.otp}
          </span>
        </div>

        <p style="color:#003060; font-size:15px; line-height:1.6; text-align:center;">
          This verification code is valid for <strong>5 minutes</strong>.<br>
          If you didn’t request this, please ignore this email — your account is safe.
        </p>

        <!-- Tip -->
        <div style="margin-top:35px; background-color:#fff8e1; border-left:6px solid #ffd54f;
                    border-radius:8px; padding:15px 18px;">
          <p style="margin:0; color:#4a4a4a; font-size:14px;">
            ⚠️ <strong>Security Tip:</strong> Never share your reset code with anyone. App will never ask for it.
          </p>
        </div>

        <!-- Button -->
        <div style="text-align:center; margin-top:45px;">
          <a href="${config.frontend_url}/otp-verify" target="_blank"
             style="background-color:#0096FF; color:#ffffff; padding:14px 32px; font-size:16px;
                    font-weight:600; border-radius:10px; text-decoration:none; display:inline-block;
                    box-shadow:0 4px 12px rgba(0,150,255,0.3); transition:all 0.3s;">
            🔑 Reset Password
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" style="background:linear-gradient(135deg,#F5FAFF,#E6F0FF); padding:25px 20px; border-top:1px solid #0096FF33;">
        <p style="margin:0; color:#003060; font-size:13px;">
          © ${new Date().getFullYear()} <strong>Template</strong>. All rights reserved.
        </p>
        <p style="margin:6px 0 0; color:#003060; font-size:13px;">
          Powered by <strong style="color:#0096FF;">Template API</strong> ✨
        </p>
      </td>
    </tr>

  </table>
</body>
    `,
  }

  return data
}

const resendOtp = (values: {
  email: string
  name: string
  otp: string
  type: 'resetPassword' | 'createAccount'
}) => {
  console.log(values, 'values')
  const isReset = values.type === 'resetPassword'

  const data = {
    to: values.email,
    subject: `${isReset ? 'Password Reset' : 'Account Verification'} - New Code`,
    html: `
   <body style="margin:0; padding:0; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="max-width:640px; margin:40px auto; background:#ffffff; border-radius:14px;
                overflow:hidden; box-shadow:0 5px 25px rgba(0,0,0,0.08);">

    <!-- Body -->
    <tr>
      <td style="padding:45px;">
        <h1 style="color:#1b4332; font-size:26px; font-weight:700; margin-bottom:15px; text-align:center;">
          ${isReset ? 'Reset Your Password 🔐' : 'Verify Your Account 🚀'}
        </h1>

        <p style="color:#3a5a40; font-size:16px; line-height:1.6; margin-bottom:25px; text-align:center;">
          Hi <strong>${values.name}</strong>, 👋<br>
          ${isReset
            ? 'You requested a new verification code to reset your Template password.'
            : 'Here is your new verification code to complete your Template account setup.'
          }<br>
          Use the code below to continue:
        </p>

        <!-- OTP Box -->
        <div style="background:linear-gradient(145deg,#d8f3dc,#b7e4c7);
                    border:2px solid #52b788; border-radius:12px;
                    padding:25px 0; text-align:center;
                    margin:30px auto; max-width:300px;">
          <span style="font-size:40px; font-weight:700; color:#1b4332; letter-spacing:6px;">
            ${values.otp}
          </span>
        </div>

        <p style="color:#3a5a40; font-size:15px; line-height:1.6; text-align:center;">
          This code is valid for <strong>5 minutes</strong>.<br>
          If this was not you, please ignore the email.
        </p>

        <!-- Tip -->
        <div style="margin-top:35px; background-color:#fff8e1;
                    border-left:6px solid #ffd54f;
                    border-radius:8px; padding:15px 18px;">
          <p style="margin:0; color:#4a4a4a; font-size:14px;">
            🔒 <strong>Security Tip:</strong> Never share your OTP with anyone. Template
 will never request it.
          </p>
        </div>

        <!-- Button -->
        <div style="text-align:center; margin-top:45px;">
          <a href="${config.frontend_url}/otp-verify"
             style="background-color:#2d6a4f; color:#ffffff; padding:14px 32px;
                    font-size:16px; font-weight:600; border-radius:10px;
                    text-decoration:none; display:inline-block;
                    box-shadow:0 4px 12px rgba(45,106,79,0.3);">
            ${isReset ? 'Reset Password' : 'Verify Account'}
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f1f8f4; padding:25px 20px; border-top:1px solid #e6f4ea;">
        <p style="margin:0; color:#52796f; font-size:13px;">
          © ${new Date().getFullYear()} <strong>Template</strong>. All rights reserved.
        </p>
        <p style="margin:6px 0 0; color:#3a5a40; font-size:13px;">
          Powered by <strong style="color:#1b4332;">Template API</strong> 🚀
        </p>
      </td>
    </tr>

  </table>
</body>
    `,
  }

  return data
}

const adminContactNotificationEmail = (payload: {
  name: string
  email: string
  phone?: string
  message: string
}) => {
  return {
    to: config.super_admin.email as string,
    subject: '📩 New Contact Form Submission – App',
    html: `
<body style="margin:0; padding:0; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="max-width:640px; margin:40px auto; background-color:#ffffff; border-radius:14px;
                overflow:hidden; box-shadow:0 5px 25px rgba(0,0,0,0.08);">

    <!-- Body -->
    <tr>
      <td style="padding:45px;">
        <h1 style="color:#0096FF; font-size:26px; font-weight:700; margin-bottom:20px; text-align:center;">
          📬 New Contact Submission
        </h1>

        <p style="color:#003060; font-size:16px; text-align:center; margin-bottom:30px;">
          A new contact message has been submitted on <strong>App</strong>.
        </p>

        <!-- Contact Details -->
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <tr>
            <td style="padding:12px 0; font-size:15px; color:#003060;">👤 <strong>Name:</strong></td>
            <td style="padding:12px 0; font-size:15px; color:#003060; text-align:right;">
              ${payload.name}
            </td>
          </tr>

          <tr style="border-top:1px solid #0096FF22;">
            <td style="padding:12px 0; font-size:15px; color:#003060;">📧 <strong>Email:</strong></td>
            <td style="padding:12px 0; font-size:15px; color:#003060; text-align:right;">
              ${payload.email}
            </td>
          </tr>

          <tr style="border-top:1px solid #0096FF22;">
            <td style="padding:12px 0; font-size:15px; color:#003060;">📞 <strong>Phone:</strong></td>
            <td style="padding:12px 0; font-size:15px; color:#003060; text-align:right;">
              ${payload.phone || 'N/A'}
            </td>
          </tr>
        </table>

        <!-- Message Box -->
        <div style="background:linear-gradient(145deg,#EAF4FF,#D7E9FF); border:2px solid #0096FF;
                    border-radius:12px; padding:20px; margin-top:30px;">
          <p style="margin:0; font-size:15px; color:#003060; line-height:1.6;">
            “${payload.message}”
          </p>
        </div>

        <p style="color:#003060; font-size:14px; margin-top:30px; text-align:center;">
          You can respond directly to <strong>${payload.email}</strong>.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" 
          style="background:linear-gradient(135deg,#F5FAFF,#E6F0FF); padding:25px 20px; border-top:1px solid #0096FF33;">
        <p style="margin:0; color:#003060; font-size:13px;">
          © ${new Date().getFullYear()} <strong>App</strong>. All rights reserved.
        </p>
        <p style="margin:6px 0 0; color:#003060; font-size:13px;">
          Powered by <strong style="color:#0096FF;">App API</strong> 
        </p>
      </td>
    </tr>

  </table>
</body>
    `,
  }
}

const userContactConfirmationEmail = (payload: {
  name: string
  email: string
  message: string
}) => {
  return {
    to: payload.email,
    subject: '💬 Thank You for Contacting App',
    html: `
<body style="margin:0; padding:0; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="max-width:640px; margin:40px auto; background-color:#ffffff; border-radius:14px;
                overflow:hidden; box-shadow:0 5px 25px rgba(0,0,0,0.08);">

    <!-- Body -->
    <tr>
      <td style="padding:45px;">
        <h1 style="color:#0096FF; font-size:26px; font-weight:700; margin-bottom:20px; text-align:center;">
          Thank You for Contacting Us 💙
        </h1>

        <p style="color:#003060; font-size:16px; line-height:1.6; text-align:center;">
          Dear <strong>${payload.name}</strong>,<br>
          We’ve received your message! Our support team will reach out to you shortly.
        </p>

        <!-- User Message -->
        <div style="background:linear-gradient(145deg,#EAF4FF,#D7E9FF); border:2px solid #0096FF; 
                    border-radius:12px; padding:25px 20px; text-align:center; margin:30px auto; max-width:500px;">
          <p style="font-size:15px; color:#003060; line-height:1.6; margin:0;">
            <em>“${payload.message}”</em>
          </p>
        </div>

        <p style="color:#003060; font-size:15px; line-height:1.6; text-align:center;">
          Thanks for reaching out to <strong>App</strong>.<br>
          We truly appreciate your message 💙
        </p>

        <!-- Button -->
        <div style="text-align:center; margin-top:40px;">
          <a href="${config.frontend_url}"
             style="background-color:#0096FF; color:#ffffff; padding:14px 32px; font-size:16px; 
                    font-weight:600; border-radius:10px; text-decoration:none; display:inline-block; 
                    box-shadow:0 4px 12px rgba(0,150,255,0.3); transition:all 0.3s;">
            Open App 
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" 
          style="background:linear-gradient(135deg,#F5FAFF,#E6F0FF); padding:25px 20px; border-top:1px solid #0096FF33;">
        <p style="margin:0; color:#003060; font-size:13px;">
          © ${new Date().getFullYear()} <strong>Template</strong>. All rights reserved.
        </p>
        <p style="margin:6px 0 0; color:#003060; font-size:13px;">
          Powered by <strong style="color:#0096FF;">Template API</strong> ✨
        </p>
      </td>
    </tr>

  </table>
</body>
    `,
  }
}

const subscriptionActivatedEmail = (data: any) => {
  return {
    to: data.user.email,
    subject: `✅ Subscription Activated – Welcome to App`,
    html: `
<body style="margin:0;padding:0;font-family:Inter,Segoe UI,sans-serif;background:#f7f9fc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.06);">
    <tr>
      <td align="center" style="background:#EAF4FF;padding:25px 20px;">
        <h2 style="margin:0;color:#0077DD;font-size:20px;">Subscription Activated!</h2>
      </td>
    </tr>
    <tr>
      <td style="padding:25px 20px;">
        <p style="font-size:14px;color:#000;line-height:1.5;">
          Hello <strong>${data.user.firstName}</strong>,<br>
          Your subscription for <strong>${data.plan.title}</strong> has been successfully activated.
        </p>
        <p style="font-size:13px;margin:2px 0;"><strong>Amount Paid:</strong> £${data.amountPaid}</p>
        <p style="font-size:13px;margin:2px 0;"><strong>Transaction ID:</strong> ${data.trxId}</p>
        <div style="text-align:center;margin-top:20px;">
          <a href="${config.frontend_url}/dashboard" style="background:#0077DD;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;display:inline-block;">Go to Dashboard</a>
        </div>
      </td>
    </tr>
  </table>
</body>
`,
  }
}

export const emailTemplate = {
  createAccount,
  resetPassword,
  resendOtp,
  userContactConfirmationEmail,
  adminContactNotificationEmail,
  subscriptionActivatedEmail,
}
