# Asterisk Admin

A modern, comprehensive administration interface for Asterisk PBX, designed as an alternative to FreePBX.

## Features

- **Dashboard**: View system status, active calls, and key metrics
- **Extensions Management**: Create and manage SIP extensions
- **Trunks Management**: Configure SIP/PJSIP/IAX trunks
- **Queue Management**: Configure call queues and members
- **Route Management**: Set up inbound and outbound call routing
- **CDR Records**: View and search call detail records
- **System Management**: Execute CLI commands, reload modules, and monitor system status

## Architecture

- **Backend**: Node.js with Express, MongoDB, and Asterisk Manager Interface (AMI)
- **Frontend**: React with Material-UI (separate repository)

## Prerequisites

- Node.js (v14+)
- MongoDB (v4+)
- Asterisk PBX (v16+)

## Installation

### Clone the repository

```bash
git clone https://github.com/yourusername/asterisk-admin.git
cd asterisk-admin
```

### Install dependencies

```bash
npm install
```

### Configure environment variables

```bash
cp .env.sample .env
```

Edit the `.env` file to match your environment:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/asterisk-admin

# JWT Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Asterisk Configuration
ASTERISK_CONFIG_DIR=/etc/asterisk

# Asterisk Manager Interface (AMI)
AMI_HOST=localhost
AMI_PORT=5038
AMI_USERNAME=admin
AMI_PASSWORD=your-ami-password
```

### Configure Asterisk Manager Interface (AMI)

Edit your `/etc/asterisk/manager.conf` file to enable and configure AMI:

```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[admin]
secret = your-ami-password
read = all
write = all
writetimeout = 5000
```

Reload the Asterisk manager:

```bash
asterisk -rx 'manager reload'
```

### Start the server

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token

### Dashboard

- `GET /api/dashboard` - Get dashboard statistics

### Extensions

- `GET /api/extensions` - List all extensions
- `GET /api/extensions/:id` - Get a specific extension
- `POST /api/extensions` - Create a new extension
- `PUT /api/extensions/:id` - Update an extension
- `DELETE /api/extensions/:id` - Delete an extension

### Trunks

- `GET /api/trunks` - List all trunks
- `GET /api/trunks/:id` - Get a specific trunk
- `POST /api/trunks` - Create a new trunk
- `PUT /api/trunks/:id` - Update a trunk
- `DELETE /api/trunks/:id` - Delete a trunk

### Queues

- `GET /api/queues` - List all queues
- `GET /api/queues/:id` - Get a specific queue
- `POST /api/queues` - Create a new queue
- `PUT /api/queues/:id` - Update a queue
- `DELETE /api/queues/:id` - Delete a queue

### Outbound Routes

- `GET /api/outbound-routes` - List all outbound routes
- `GET /api/outbound-routes/:id` - Get a specific outbound route
- `POST /api/outbound-routes` - Create a new outbound route
- `PUT /api/outbound-routes/:id` - Update an outbound route
- `DELETE /api/outbound-routes/:id` - Delete an outbound route

### Inbound Routes

- `GET /api/inbound-routes` - List all inbound routes
- `GET /api/inbound-routes/:id` - Get a specific inbound route
- `POST /api/inbound-routes` - Create a new inbound route
- `PUT /api/inbound-routes/:id` - Update an inbound route
- `DELETE /api/inbound-routes/:id` - Delete an inbound route

### CDR (Call Detail Records)

- `GET /api/cdrs` - List CDRs with filtering options

### Asterisk System

- `GET /api/asterisk/status` - Get Asterisk system status
- `GET /api/asterisk/channels` - Get active channels
- `POST /api/asterisk/cli` - Execute CLI command
- `POST /api/asterisk/reload` - Reload Asterisk module
- `POST /api/asterisk/originate` - Originate a call
- `POST /api/asterisk/hangup` - Hangup a channel

## Frontend

The frontend repository is available at [asterisk-admin-frontend](https://github.com/yourusername/asterisk-admin-frontend).

## Security Considerations

- Always use HTTPS in production
- Configure proper file permissions for Asterisk configuration files
- Restrict access to the API with a firewall
- Use strong passwords for JWT secret and AMI credentials

## License

MIT