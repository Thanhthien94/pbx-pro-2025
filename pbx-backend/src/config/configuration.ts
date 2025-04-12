// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/asterisk-admin',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-here',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  asterisk: {
    configDir: process.env.ASTERISK_CONFIG_DIR || '/etc/asterisk',
    ami: {
      host: process.env.AMI_HOST || 'localhost',
      port: parseInt(process.env.AMI_PORT, 10) || 5038,
      username: process.env.AMI_USERNAME || 'admin',
      password: process.env.AMI_PASSWORD || 'password',
    },
  },
  heplify: {
    enabled: process.env.SIP_LOGGING_ENABLED === 'true',
    server: process.env.HOMER_SERVER || 'localhost',
    port: parseInt(process.env.HOMER_PORT, 10) || 9060,
    captureId: parseInt(process.env.HOMER_CAPTURE_ID, 10) || 2001,
  },
  crm: {
    apiUrl: process.env.CRM_API_URL || '',
    apiKey: process.env.CRM_API_KEY || '',
    webhookSecret: process.env.CRM_WEBHOOK_SECRET || '',
  },
});
