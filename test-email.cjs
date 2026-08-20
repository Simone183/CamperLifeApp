const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
resend.emails.send({
  from: 'ViaCamperApp <onboarding@resend.dev>',
  to: 'viacamperapp@gmail.com',
  subject: 'Test API',
  html: 'test'
}).then(console.log).catch(console.error);
