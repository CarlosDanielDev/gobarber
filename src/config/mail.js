export default {
  host: process.env.MAIL_HOST,
  // port: 2525,
  secure: process.env.MAIL_SECURE,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  default: {
    from: `DevDaniel's <noreply@gobarber.com>`,
  },
};
