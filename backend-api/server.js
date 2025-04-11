/**
 * Asterisk Admin - Backend API
 * Server.js - Main entry point
 */

// Imports
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const helmet = require('helmet');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const AsteriskManager = require('asterisk-manager');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Load environment variables
require('dotenv').config();

// Constants
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/asterisk-admin';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ASTERISK_CONFIG_DIR = process.env.ASTERISK_CONFIG_DIR || '/etc/asterisk';
const AMI_CONFIG = {
  host: process.env.AMI_HOST || 'localhost',
  port: process.env.AMI_PORT || 5038,
  username: process.env.AMI_USERNAME || 'admin',
  password: process.env.AMI_PASSWORD || 'password'
};

// Create Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(helmet());

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Import models
const User = require('./models/User');
const Extension = require('./models/Extension');
const Trunk = require('./models/Trunk');
const Queue = require('./models/Queue');
const OutboundRoute = require('./models/OutboundRoute');
const InboundRoute = require('./models/InboundRoute');
const CDR = require('./models/CDR');

// Initialize Asterisk Manager Interface (AMI)
let ami = null;

function connectAMI() {
  if (ami) {
    ami.disconnect();
  }

  ami = new AsteriskManager(
    AMI_CONFIG.port,
    AMI_CONFIG.host,
    AMI_CONFIG.username,
    AMI_CONFIG.password,
    true // Connect at start
  );

  ami.keepConnected();

  ami.on('connect', () => {
    console.log('Connected to Asterisk Manager Interface');
  });

  ami.on('disconnect', () => {
    console.log('Disconnected from Asterisk Manager Interface');
    // Try to reconnect after 5 seconds
    setTimeout(connectAMI, 5000);
  });

  ami.on('error', (err) => {
    console.error('AMI Error:', err);
  });

  // Handle events from Asterisk
  ami.on('managerevent', handleAsteriskEvent);
}

// Handle Asterisk events
function handleAsteriskEvent(event) {
  // Handle different event types
  switch (event.event) {
    case 'Newchannel':
      console.log(`New channel created: ${event.channel}, Caller ID: ${event.calleridnum}`);
      break;
    case 'Hangup':
      console.log(`Channel hangup: ${event.channel}, Cause: ${event.cause}`);
      break;
    case 'Cdr':
      // Save CDR to database
      saveCDRToDatabase(event);
      break;
    default:
      // Ignore other events
      break;
  }
}

// Save CDR to database
async function saveCDRToDatabase(event) {
  try {
    const cdr = new CDR({
      uniqueid: event.uniqueid,
      src: event.source,
      dst: event.destination,
      dcontext: event.context,
      clid: event.callerid,
      channel: event.channel,
      dstchannel: event.destchannel,
      lastapp: event.lastapp,
      lastdata: event.lastdata,
      start: new Date(event.starttime),
      answer: new Date(event.answertime),
      end: new Date(event.endtime),
      duration: parseInt(event.duration) || 0,
      billsec: parseInt(event.billseconds) || 0,
      disposition: event.disposition,
      amaflags: event.amaflags,
      accountcode: event.accountcode,
      userfield: event.userfield,
      recordingfile: event.recordingfile
    });

    await cdr.save();
    console.log(`CDR saved to database: ${event.uniqueid}`);
  } catch (error) {
    console.error('Error saving CDR:', error);
  }
}

// Connect to AMI
connectAMI();

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Utility function: Execute Asterisk CLI command
const executeAsteriskCommand = async (command) => {
  return new Promise((resolve, reject) => {
    if (ami) {
      ami.action({
        Action: 'Command',
        Command: command
      }, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.output || res.data || res);
        }
      });
    } else {
      exec(`asterisk -rx '${command}'`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    }
  });
};

// Utility function: Reload Asterisk module
const reloadAsteriskModule = async (module) => {
  return new Promise((resolve, reject) => {
    if (ami) {
      ami.action({
        Action: 'Reload',
        Module: module || ''
      }, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    } else {
      exec(`asterisk -rx 'module reload ${module || ''}'`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    }
  });
};

// Utility function: Get Asterisk status
const getAsteriskStatus = async () => {
  return new Promise((resolve, reject) => {
    if (ami) {
      ami.action({
        Action: 'CoreStatus'
      }, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    } else {
      exec(`asterisk -rx 'core show version'`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ output: stdout });
        }
      });
    }
  });
};

// Utility function: Get active channels
const getActiveChannels = async () => {
  return new Promise((resolve, reject) => {
    if (ami) {
      ami.action({
        Action: 'CoreShowChannels'
      }, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    } else {
      exec(`asterisk -rx 'core show channels'`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ output: stdout });
        }
      });
    }
  });
};

// Utility functions to update Asterisk configuration files
const getConfigPath = (type) => {
  switch (type) {
    case 'sip':
      return path.join(ASTERISK_CONFIG_DIR, 'sip.conf');
    case 'pjsip':
      return path.join(ASTERISK_CONFIG_DIR, 'pjsip.conf');
    case 'iax':
      return path.join(ASTERISK_CONFIG_DIR, 'iax.conf');
    case 'extensions':
      return path.join(ASTERISK_CONFIG_DIR, 'extensions.conf');
    case 'queues':
      return path.join(ASTERISK_CONFIG_DIR, 'queues.conf');
    default:
      throw new Error(`Unknown configuration type: ${type}`);
  }
};

// Update configuration file
const updateConfigFile = async (type, content) => {
  const configPath = getConfigPath(type);
  try {
    await fs.writeFile(configPath, content);
    return true;
  } catch (error) {
    console.error(`Error updating ${type} configuration:`, error);
    throw error;
  }
};

// Read configuration file
const readConfigFile = async (type) => {
  const configPath = getConfigPath(type);
  try {
    const content = await fs.readFile(configPath, 'utf8');
    return content;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default template
      return getDefaultConfig(type);
    }
    console.error(`Error reading ${type} configuration:`, error);
    throw error;
  }
};

// Get default configuration template
const getDefaultConfig = (type) => {
  switch (type) {
    case 'sip':
      return `;SIP Configuration\n\n[general]\ncontext=from-internal\nallowguest=no\n\n`;
    case 'pjsip':
      return `;PJSIP Configuration\n\n[global]\ntype=global\n\n[transport-udp]\ntype=transport\nprotocol=udp\nbind=0.0.0.0\n\n`;
    case 'iax':
      return `;IAX Configuration\n\n[general]\nbandwidth=high\n\n`;
    case 'extensions':
      return `;Extensions Configuration\n\n[general]\nstatic=yes\nwriteprotect=no\n\n[from-internal]\nexten => _X.,1,NoOp(Dialed extension ${EXTEN})\nexten => _X.,n,Dial(SIP/${EXTEN},30)\nexten => _X.,n,Hangup()\n\n[from-trunk]\nexten => _X.,1,NoOp(Incoming call)\nexten => _X.,n,Goto(from-internal,${EXTEN},1)\n\n`;
    case 'queues':
      return `;Queue Configuration\n\n[general]\npersistentmembers=yes\nmonitor-type=MixMonitor\n\n`;
    default:
      return '';
  }
};

// Update Extensions Configuration
const updateExtensionConfig = async (extension) => {
  try {
    // Read current SIP configuration
    let content = await readConfigFile('sip');
    
    // Check if extension section already exists
    const extensionRegex = new RegExp(`\\[${extension.extension}\\](.*?)(?=\\[|$)`, 's');
    const match = content.match(extensionRegex);
    
    // Create extension config
    const extensionConfig = `[${extension.extension}]
type=friend
secret=${extension.secret}
host=${extension.host || 'dynamic'}
context=${extension.context || 'from-internal'}
callgroup=${extension.callGroup || ''}
pickupgroup=${extension.pickupGroup || ''}
mailbox=${extension.mailbox || extension.extension}
callerid="${extension.name}" <${extension.extension}>
dtmfmode=${extension.dtmfMode || 'rfc2833'}
transport=${extension.transport || 'udp'}
nat=${extension.nat || 'yes'}
call-limit=${extension.callLimit || 5}
disallow=${extension.disallow || 'all'}
allow=${extension.allow || 'ulaw,alaw,g722,g729'}

`;
    
    // Update or add extension section
    if (match) {
      content = content.replace(extensionRegex, extensionConfig);
    } else {
      content += extensionConfig;
    }
    
    // Write updated configuration
    await updateConfigFile('sip', content);
    
    // Reload SIP configuration
    await reloadAsteriskModule('chan_sip.so');
    
    return true;
  } catch (error) {
    console.error('Error updating extension configuration:', error);
    throw error;
  }
};

// Remove Extension Configuration
const removeExtensionConfig = async (extension) => {
  try {
    // Read current SIP configuration
    let content = await readConfigFile('sip');
    
    // Remove extension section
    const extensionRegex = new RegExp(`\\[${extension.extension}\\](.*?)(?=\\[|$)`, 's');
    content = content.replace(extensionRegex, '');
    
    // Write updated configuration
    await updateConfigFile('sip', content);
    
    // Reload SIP configuration
    await reloadAsteriskModule('chan_sip.so');
    
    return true;
  } catch (error) {
    console.error('Error removing extension configuration:', error);
    throw error;
  }
};

// Update Trunk Configuration
const updateTrunkConfig = async (trunk) => {
  try {
    // Determine config file type
    const configType = trunk.type.toLowerCase();
    
    // Read current configuration
    let content = await readConfigFile(configType);
    
    // Check if trunk section already exists
    const trunkRegex = new RegExp(`\\[${trunk.name}\\](.*?)(?=\\[|$)`, 's');
    const match = content.match(trunkRegex);
    
    // Create trunk config
    let trunkConfig = '';
    
    if (configType === 'sip') {
      trunkConfig = `[${trunk.name}]
type=peer
host=${trunk.host}
username=${trunk.username || trunk.name}
secret=${trunk.secret}
context=${trunk.context || 'from-trunk'}
dtmfmode=${trunk.dtmfMode || 'rfc2833'}
transport=${trunk.transport || 'udp'}
insecure=${trunk.insecure || 'port,invite'}
nat=${trunk.nat || 'yes'}
qualify=yes
qualifyfreq=${trunk.qualifyFreq || 60}
disallow=${trunk.disallow || 'all'}
allow=${trunk.allow || 'ulaw,alaw,g722,g729'}

`;
    } else if (configType === 'pjsip') {
      trunkConfig = `[${trunk.name}]
type=endpoint
transport=transport-udp
context=${trunk.context || 'from-trunk'}
disallow=${trunk.disallow || 'all'}
allow=${trunk.allow || 'ulaw,alaw,g722,g729'}
from_domain=${trunk.host}
dtmf_mode=${trunk.dtmfMode || 'rfc4733'}
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
ice_support=yes

[${trunk.name}-auth]
type=auth
auth_type=userpass
username=${trunk.username || trunk.name}
password=${trunk.secret}

[${trunk.name}-aor]
type=aor
contact=sip:${trunk.host}
qualify_frequency=${trunk.qualifyFreq || 60}

`;
    } else if (configType === 'iax') {
      trunkConfig = `[${trunk.name}]
type=peer
host=${trunk.host}
username=${trunk.username || trunk.name}
secret=${trunk.secret}
context=${trunk.context || 'from-trunk'}
qualify=yes
disallow=${trunk.disallow || 'all'}
allow=${trunk.allow || 'ulaw,alaw,g722,g729'}

`;
    }
    
    // Update or add trunk section
    if (match) {
      content = content.replace(trunkRegex, trunkConfig);
    } else {
      content += trunkConfig;
    }
    
    // Write updated configuration
    await updateConfigFile(configType, content);
    
    // Reload configuration
    if (configType === 'sip') {
      await reloadAsteriskModule('chan_sip.so');
    } else if (configType === 'pjsip') {
      await reloadAsteriskModule('chan_pjsip.so');
    } else if (configType === 'iax') {
      await reloadAsteriskModule('chan_iax2.so');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating trunk configuration:', error);
    throw error;
  }
};

// Remove Trunk Configuration
const removeTrunkConfig = async (trunk) => {
  try {
    // Determine config file type
    const configType = trunk.type.toLowerCase();
    
    // Read current configuration
    let content = await readConfigFile(configType);
    
    // Remove trunk section
    const trunkRegex = new RegExp(`\\[${trunk.name}\\](.*?)(?=\\[|$)`, 's');
    content = content.replace(trunkRegex, '');
    
    // For PJSIP, also remove auth and aor sections
    if (configType === 'pjsip') {
      const authRegex = new RegExp(`\\[${trunk.name}-auth\\](.*?)(?=\\[|$)`, 's');
      const aorRegex = new RegExp(`\\[${trunk.name}-aor\\](.*?)(?=\\[|$)`, 's');
      
      content = content.replace(authRegex, '');
      content = content.replace(aorRegex, '');
    }
    
    // Write updated configuration
    await updateConfigFile(configType, content);
    
    // Reload configuration
    if (configType === 'sip') {
      await reloadAsteriskModule('chan_sip.so');
    } else if (configType === 'pjsip') {
      await reloadAsteriskModule('chan_pjsip.so');
    } else if (configType === 'iax') {
      await reloadAsteriskModule('chan_iax2.so');
    }
    
    return true;
  } catch (error) {
    console.error('Error removing trunk configuration:', error);
    throw error;
  }
};

// Update Queue Configuration
const updateQueueConfig = async (queue) => {
  try {
    // Read current configuration
    let content = await readConfigFile('queues');
    
    // Check if queue section already exists
    const queueRegex = new RegExp(`\\[${queue.name}\\](.*?)(?=\\[|$)`, 's');
    const match = content.match(queueRegex);
    
    // Create members string
    const membersStr = queue.members.map(member => `member=SIP/${member}`).join('\n');
    
    // Create queue config
    const queueConfig = `[${queue.name}]
strategy=${queue.strategy || 'ringall'}
timeout=${queue.timeout || 15}
wrapuptime=${queue.wrapuptime || 0}
maxlen=${queue.maxlen || 0}
announce=${queue.announce || ''}
musicclass=${queue.musicClass || 'default'}
${membersStr}

`;
    
    // Update or add queue section
    if (match) {
      content = content.replace(queueRegex, queueConfig);
    } else {
      content += queueConfig;
    }
    
    // Write updated configuration
    await updateConfigFile('queues', content);
    
    // Reload queue configuration
    await reloadAsteriskModule('app_queue.so');
    
    return true;
  } catch (error) {
    console.error('Error updating queue configuration:', error);
    throw error;
  }
};

// Remove Queue Configuration
const removeQueueConfig = async (queue) => {
  try {
    // Read current configuration
    let content = await readConfigFile('queues');
    
    // Remove queue section
    const queueRegex = new RegExp(`\\[${queue.name}\\](.*?)(?=\\[|$)`, 's');
    content = content.replace(queueRegex, '');
    
    // Write updated configuration
    await updateConfigFile('queues', content);
    
    // Reload queue configuration
    await reloadAsteriskModule('app_queue.so');
    
    return true;
  } catch (error) {
    console.error('Error removing queue configuration:', error);
    throw error;
  }
};

// Update Dialplan Configuration
const updateDialplanConfig = async () => {
  try {
    // Get all routes
    const [outboundRoutes, inboundRoutes] = await Promise.all([
      OutboundRoute.find().sort({ name: 1 }),
      InboundRoute.find().sort({ name: 1 })
    ]);
    
    // Read current configuration
    let content = await readConfigFile('extensions');
    
    // Check if sections exist
    let fromInternalMatch = content.match(/\[from-internal\](.*?)(?=\[|$)/s);
    let fromTrunkMatch = content.match(/\[from-trunk\](.*?)(?=\[|$)/s);
    
    // Create new sections
    let fromInternalSection = '[from-internal]\n';
    let fromTrunkSection = '[from-trunk]\n';
    
    // Add default behaviors
    fromInternalSection += 'exten => _X.,1,NoOp(Dialed extension ${EXTEN})\n';
    fromInternalSection += 'exten => _X.,n,Dial(SIP/${EXTEN},30)\n';
    fromInternalSection += 'exten => _X.,n,Hangup()\n\n';
    
    // Add outbound routes to from-internal
    for (const route of outboundRoutes) {
      fromInternalSection += `; Outbound route: ${route.name}\n`;
      fromInternalSection += `exten => _${route.pattern},1,NoOp(Matched outbound route ${route.name})\n`;
      
      // Add caller ID name/number if specified
      if (route.callerIdName || route.callerIdNumber) {
        fromInternalSection += `exten => _${route.pattern},n,Set(CALLERID(name)=${route.callerIdName || '${CALLERID(name)}'})\n`;
        fromInternalSection += `exten => _${route.pattern},n,Set(CALLERID(num)=${route.callerIdNumber || '${CALLERID(num)}'})\n`;
      }
      
      // Add prepend and prefix if specified
      if (route.prepend) {
        fromInternalSection += `exten => _${route.pattern},n,Set(EXTEN=${route.prepend}\${EXTEN})\n`;
      }
      if (route.prefix) {
        fromInternalSection += `exten => _${route.pattern},n,Set(EXTEN=${route.prefix}\${EXTEN:${route.pattern.replace(/[^X]/g, '').length}})\n`;
      }
      
      // Add Dial command
      fromInternalSection += `exten => _${route.pattern},n,Dial(SIP/${route.trunk}/\${EXTEN},30)\n`;
      fromInternalSection += `exten => _${route.pattern},n,Hangup()\n\n`;
    }
    
    // Add inbound routes to from-trunk
    for (const route of inboundRoutes) {
      fromTrunkSection += `; Inbound route: ${route.name}\n`;
      
      if (route.did) {
        fromTrunkSection += `exten => ${route.did},1,NoOp(Matched inbound route ${route.name})\n`;
      } else {
        fromTrunkSection += `exten => _X.,1,NoOp(Matched default inbound route ${route.name})\n`;
      }
      
      // Add caller ID name if specified
      if (route.callerIdName) {
        fromTrunkSection += `exten => ${route.did || '_X.'},n,Set(CALLERID(name)=${route.callerIdName})\n`;
      }
      
      // Route to destination
      if (route.destinationType === 'extension') {
        fromTrunkSection += `exten => ${route.did || '_X.'},n,Dial(SIP/${route.destination},30)\n`;
      } else if (route.destinationType === 'queue') {
        fromTrunkSection += `exten => ${route.did || '_X.'},n,Queue(${route.destination})\n`;
      } else if (route.destinationType === 'ivr') {
        fromTrunkSection += `exten => ${route.did || '_X.'},n,Goto(ivr-${route.destination},s,1)\n`;
      }
      
      fromTrunkSection += `exten => ${route.did || '_X.'},n,Hangup()\n\n`;
    }
    
    // Update or add sections
    if (fromInternalMatch) {
      content = content.replace(/\[from-internal\](.*?)(?=\[|$)/s, fromInternalSection);
    } else {
      content += fromInternalSection;
    }
    
    if (fromTrunkMatch) {
      content = content.replace(/\[from-trunk\](.*?)(?=\[|$)/s, fromTrunkSection);
    } else {
      content += fromTrunkSection;
    }
    
    // Write updated configuration
    await updateConfigFile('extensions', content);
    
    // Reload dialplan
    await reloadAsteriskModule('pbx_config.so');
    
    return true;
  } catch (error) {
    console.error('Error updating dialplan configuration:', error);
    throw error;
  }
};

// API Routes

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, name, email } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Create new user
    const user = new User({
      username,
      password, // Will be hashed in the model pre-save hook
      name,
      email,
      role: 'admin'  // Default role
    });
    
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected routes - requires authentication
app.use('/api/dashboard', authenticate);
app.use('/api/extensions', authenticate);
app.use('/api/trunks', authenticate);
app.use('/api/queues', authenticate);
app.use('/api/outbound-routes', authenticate);
app.use('/api/inbound-routes', authenticate);
app.use('/api/cdrs', authenticate);
app.use('/api/asterisk', authenticate);

// Dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const [status, channels, extensionsCount, trunksCount, queuesCount, cdrsToday] = await Promise.all([
      getAsteriskStatus(),
      getActiveChannels(),
      Extension.countDocuments(),
      Trunk.countDocuments(),
      Queue.countDocuments(),
      CDR.countDocuments({
        start: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    ]);
    
    // Parse active calls from channels response
    let activeCalls = 0;
    if (channels.output) {
      // Parse from CLI output
      const match = channels.output.match(/(\d+) active channel/i);
      if (match && match[1]) {
        activeCalls = parseInt(match[1]);
      }
    } else if (channels.ListItems) {
      // Parse from AMI response
      activeCalls = channels.ListItems.length;
    } else if (channels.ChannelCount) {
      activeCalls = parseInt(channels.ChannelCount);
    }
    
    res.json({
      status,
      channels,
      counts: {
        extensions: extensionsCount,
        trunks: trunksCount,
        queues: queuesCount,
        activeCalls,
        cdrsToday
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Extensions
app.get('/api/extensions', async (req, res) => {
  try {
    const extensions = await Extension.find().sort({ extension: 1 });
    res.json(extensions);
  } catch (error) {
    console.error('Get extensions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/extensions/:id', async (req, res) => {
  try {
    const extension = await Extension.findById(req.params.id);
    if (!extension) {
      return res.status(404).json({ error: 'Extension not found' });
    }
    res.json(extension);
  } catch (error) {
    console.error('Get extension error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/extensions', async (req, res) => {
  try {
    // Check if extension already exists
    const existingExtension = await Extension.findOne({ extension: req.body.extension });
    if (existingExtension) {
      return res.status(400).json({ error: 'Extension number already exists' });
    }
    
    // Create new extension
    const extension = new Extension(req.body);
    await extension.save();
    
    // Update Asterisk configuration
    await updateExtensionConfig(extension);
    
    res.status(201).json(extension);
  } catch (error) {
    console.error('Create extension error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/extensions/:id', async (req, res) => {
  try {
    const extension = await Extension.findById(req.params.id);
    if (!extension) {
      return res.status(404).json({ error: 'Extension not found' });
    }
    
    // Update extension in database
    Object.assign(extension, req.body);
    await extension.save();
    
    // Update Asterisk configuration
    await updateExtensionConfig(extension);
    
    res.json(extension);
  } catch (error) {
    console.error('Update extension error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/extensions/:id', async (req, res) => {
  try {
    const extension = await Extension.findById(req.params.id);
    if (!extension) {
      return res.status(404).json({ error: 'Extension not found' });
    }
    
    // Remove extension from Asterisk configuration
    await removeExtensionConfig(extension);
    
    // Remove extension from database
    await Extension.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Extension deleted successfully' });
  } catch (error) {
    console.error('Delete extension error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trunks
app.get('/api/trunks', async (req, res) => {
  try {
    const trunks = await Trunk.find().sort({ name: 1 });
    res.json(trunks);
  } catch (error) {
    console.error('Get trunks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/trunks/:id', async (req, res) => {
  try {
    const trunk = await Trunk.findById(req.params.id);
    if (!trunk) {
      return res.status(404).json({ error: 'Trunk not found' });
    }
    res.json(trunk);
  } catch (error) {
    console.error('Get trunk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/trunks', async (req, res) => {
  try {
    // Check if trunk already exists
    const existingTrunk = await Trunk.findOne({ name: req.body.name });
    if (existingTrunk) {
      return res.status(400).json({ error: 'Trunk name already exists' });
    }
    
    // Create new trunk
    const trunk = new Trunk(req.body);
    await trunk.save();
    
    // Update Asterisk configuration
    await updateTrunkConfig(trunk);
    
    res.status(201).json(trunk);
  } catch (error) {
    console.error('Create trunk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/trunks/:id', async (req, res) => {
  try {
    const trunk = await Trunk.findById(req.params.id);
    if (!trunk) {
      return res.status(404).json({ error: 'Trunk not found' });
    }
    
    // Update trunk in database
    Object.assign(trunk, req.body);
    await trunk.save();
    
    // Update Asterisk configuration
    await updateTrunkConfig(trunk);
    
    res.json(trunk);
  } catch (error) {
    console.error('Update trunk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/trunks/:id', async (req, res) => {
  try {
    const trunk = await Trunk.findById(req.params.id);
    if (!trunk) {
      return res.status(404).json({ error: 'Trunk not found' });
    }
    
    // Remove trunk from Asterisk configuration
    await removeTrunkConfig(trunk);
    
    // Remove trunk from database
    await Trunk.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Trunk deleted successfully' });
  } catch (error) {
    console.error('Delete trunk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Queues
app.get('/api/queues', async (req, res) => {
  try {
    const queues = await Queue.find().sort({ name: 1 });
    res.json(queues);
  } catch (error) {
    console.error('Get queues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/queues/:id', async (req, res) => {
  try {
    const queue = await Queue.findById(req.params.id);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    res.json(queue);
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/queues', async (req, res) => {
  try {
    // Check if queue already exists
    const existingQueue = await Queue.findOne({ name: req.body.name });
    if (existingQueue) {
      return res.status(400).json({ error: 'Queue name already exists' });
    }
    
    // Create new queue
    const queue = new Queue(req.body);
    await queue.save();
    
    // Update Asterisk configuration
    await updateQueueConfig(queue);
    
    res.status(201).json(queue);
  } catch (error) {
    console.error('Create queue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/queues/:id', async (req, res) => {
  try {
    const queue = await Queue.findById(req.params.id);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    
    // Update queue in database
    Object.assign(queue, req.body);
    await queue.save();
    
    // Update Asterisk configuration
    await updateQueueConfig(queue);
    
    res.json(queue);
  } catch (error) {
    console.error('Update queue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/queues/:id', async (req, res) => {
  try {
    const queue = await Queue.findById(req.params.id);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    
    // Remove queue from Asterisk configuration
    await removeQueueConfig(queue);
    
    // Remove queue from database
    await Queue.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Queue deleted successfully' });
  } catch (error) {
    console.error('Delete queue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Outbound Routes
app.get('/api/outbound-routes', async (req, res) => {
  try {
    const routes = await OutboundRoute.find().sort({ name: 1 });
    res.json(routes);
  } catch (error) {
    console.error('Get outbound routes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/outbound-routes/:id', async (req, res) => {
  try {
    const route = await OutboundRoute.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Outbound route not found' });
    }
    res.json(route);
  } catch (error) {
    console.error('Get outbound route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/outbound-routes', async (req, res) => {
  try {
    // Check if route already exists
    const existingRoute = await OutboundRoute.findOne({ name: req.body.name });
    if (existingRoute) {
      return res.status(400).json({ error: 'Outbound route name already exists' });
    }
    
    // Create new route
    const route = new OutboundRoute(req.body);
    await route.save();
    
    // Update Asterisk configuration
    await updateDialplanConfig();
    
    res.status(201).json(route);
  } catch (error) {
    console.error('Create outbound route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/outbound-routes/:id', async (req, res) => {
  try {
    const route = await OutboundRoute.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Outbound route not found' });
    }
    
    // Update route in database
    Object.assign(route, req.body);
    await route.save();
    
    // Update Asterisk configuration
    await updateDialplanConfig();
    
    res.json(route);
  } catch (error) {
    console.error('Update outbound route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/outbound-routes/:id', async (req, res) => {
  try {
    const route = await OutboundRoute.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Outbound route not found' });
    }
    
    // Remove route from database
    await OutboundRoute.findByIdAndDelete(req.params.id);
    
    // Update Asterisk configuration
    await updateDialplanConfig();
    
    res.json({ message: 'Outbound route deleted successfully' });
  } catch (error) {
    console.error('Delete outbound route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Inbound Routes
app.get('/api/inbound-routes', async (req, res) => {
  try {
    const routes = await InboundRoute.find().sort({ name: 1 });
    res.json(routes);
  } catch (error) {
    console.error('Get inbound routes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/inbound-routes/:id', async (req, res) => {
  try {
    const route = await InboundRoute.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Inbound route not found' });
    }
    res.json(route);
  } catch (error) {
    console.error('Get inbound route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inbound-routes', async (req, res) => {
  try {
    // Check if route already exists
    const existingRoute = await InboundRoute.findOne({ name: req.body.name });
    if (existingRoute) {
      return res.status(400).json({ error: 'Inbound route name already exists' });
    }
    
    // Create new route
    const route = new InboundRoute(req.body);
    await route.save();
    
    // Update Asterisk configuration
    await updateDialplanConfig();
    
    res.status(201).json(route);
  } catch (error) {
    console.error('Create inbound route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/inbound-routes/:id', async (req, res) => {
  try {
    const route = await InboundRoute.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Inbound route not found' });
    }
    
    // Update route in database
    Object.assign(route, req.body);
    await route.save();
    
    // Update Asterisk configuration
    await updateDialplanConfig();
    
    res.json(route);
  } catch (error) {
    console.error('Update inbound route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/inbound-routes/:id', async (req, res) => {
  try {
    const route = await InboundRoute.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Inbound route not found' });
    }
    
    // Remove route from database
    await InboundRoute.findByIdAndDelete(req.params.id);
    
    // Update Asterisk configuration
    await updateDialplanConfig();
    
    res.json({ message: 'Inbound route deleted successfully' });
  } catch (error) {
    console.error('Delete inbound route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CDRs
app.get('/api/cdrs', async (req, res) => {
  try {
    const { startDate, endDate, src, dst, limit = 100, page = 1 } = req.query;
    
    const query = {};
    
    if (startDate) {
      query.start = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      if (!query.start) query.start = {};
      query.start.$lte = new Date(endDate);
    }
    
    if (src) {
      query.src = { $regex: src, $options: 'i' };
    }
    
    if (dst) {
      query.dst = { $regex: dst, $options: 'i' };
    }
    
    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit);
    
    const [cdrs, total] = await Promise.all([
      CDR.find(query)
        .sort({ start: -1 })
        .skip(skip)
        .limit(limitNum),
      CDR.countDocuments(query)
    ]);
    
    res.json({
      cdrs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get CDRs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Asterisk System Management
app.get('/api/asterisk/status', async (req, res) => {
  try {
    const status = await getAsteriskStatus();
    res.json(status);
  } catch (error) {
    console.error('Get Asterisk status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/asterisk/channels', async (req, res) => {
  try {
    const channels = await getActiveChannels();
    res.json(channels);
  } catch (error) {
    console.error('Get Asterisk channels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/asterisk/cli', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    const output = await executeAsteriskCommand(command);
    res.json({ success: true, output });
  } catch (error) {
    console.error('Execute CLI command error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/asterisk/reload', async (req, res) => {
  try {
    const { module } = req.body;
    const result = await reloadAsteriskModule(module);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Reload Asterisk error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/asterisk/originate', async (req, res) => {
  try {
    const { channel, extension, context, priority, variables } = req.body;
    
    if (!ami) {
      return res.status(503).json({ error: 'AMI not connected' });
    }
    
    ami.action({
      Action: 'Originate',
      Channel: channel,
      Exten: extension,
      Context: context || 'from-internal',
      Priority: priority || 1,
      Timeout: 30000,
      Async: true,
      Variable: variables
    }, (err, resp) => {
      if (err) {
        console.error('Error originating call:', err);
        res.status(500).json({ error: 'Error originating call' });
      } else {
        res.json({ success: true, response: resp });
      }
    });
  } catch (error) {
    console.error('Originate call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/asterisk/hangup', async (req, res) => {
  try {
    const { channel } = req.body;
    
    if (!ami) {
      return res.status(503).json({ error: 'AMI not connected' });
    }
    
    ami.action({
      Action: 'Hangup',
      Channel: channel
    }, (err, resp) => {
      if (err) {
        console.error('Error hanging up channel:', err);
        res.status(500).json({ error: 'Error hanging up channel' });
      } else {
        res.json({ success: true, response: resp });
      }
    });
  } catch (error) {
    console.error('Hangup channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('Shutting down server...');
  
  if (ami) {
    ami.disconnect();
  }
  
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
}

module.exports = { app, server };