// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/asterisk-admin',
  },
  API_KEY: process.env.API_KEY || 'pbx-admin-secret-key',
  asterisk: {
    configDir: process.env.ASTERISK_CONFIG_DIR || '/etc/asterisk',
    ami: {
      host: process.env.AMI_HOST || 'localhost',
      port: parseInt(process.env.AMI_PORT || '5038', 10),
      username: process.env.AMI_USERNAME || 'admin',
      password: process.env.AMI_PASSWORD || 'password',
    },
  },
  heplify: {
    enabled: process.env.SIP_LOGGING_ENABLED === 'true',
    server: process.env.HOMER_SERVER || 'localhost',
    port: parseInt(process.env.HOMER_PORT || '9060', 10),
    captureId: parseInt(process.env.HOMER_CAPTURE_ID || '2001', 10),
  },
});
