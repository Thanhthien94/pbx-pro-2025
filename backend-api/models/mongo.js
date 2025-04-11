// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  active: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;

// models/Extension.js
const mongoose = require('mongoose');

const extensionSchema = new mongoose.Schema({
  extension: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  secret: {
    type: String,
    required: true
  },
  context: {
    type: String,
    default: 'from-internal'
  },
  host: {
    type: String,
    default: 'dynamic'
  },
  callGroup: String,
  pickupGroup: String,
  mailbox: String,
  email: String,
  dtmfMode: {
    type: String,
    enum: ['rfc2833', 'info', 'inband', 'auto'],
    default: 'rfc2833'
  },
  transport: {
    type: String,
    enum: ['udp', 'tcp', 'tls', 'ws', 'wss'],
    default: 'udp'
  },
  nat: {
    type: String,
    enum: ['yes', 'no', 'force_rport', 'comedia'],
    default: 'yes'
  },
  callLimit: {
    type: Number,
    default: 5
  },
  disallow: {
    type: String,
    default: 'all'
  },
  allow: {
    type: String,
    default: 'ulaw,alaw,g722'
  }
}, {
  timestamps: true
});

const Extension = mongoose.model('Extension', extensionSchema);

module.exports = Extension;

// models/Trunk.js
const mongoose = require('mongoose');

const trunkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['sip', 'pjsip', 'iax'],
    default: 'sip'
  },
  host: {
    type: String,
    required: true
  },
  username: String,
  secret: String,
  context: {
    type: String,
    default: 'from-trunk'
  },
  dtmfMode: {
    type: String,
    enum: ['rfc2833', 'info', 'inband', 'auto'],
    default: 'rfc2833'
  },
  transport: {
    type: String,
    enum: ['udp', 'tcp', 'tls', 'ws', 'wss'],
    default: 'udp'
  },
  insecure: {
    type: String,
    default: 'port,invite'
  },
  nat: {
    type: String,
    enum: ['yes', 'no', 'force_rport', 'comedia'],
    default: 'yes'
  },
  qualifyFreq: {
    type: Number,
    default: 60
  },
  disallow: {
    type: String,
    default: 'all'
  },
  allow: {
    type: String,
    default: 'ulaw,alaw,g722'
  }
}, {
  timestamps: true
});

const Trunk = mongoose.model('Trunk', trunkSchema);

module.exports = Trunk;

// models/Queue.js
const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  strategy: {
    type: String,
    enum: ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear', 'wrandom'],
    default: 'ringall'
  },
  timeout: {
    type: Number,
    default: 15
  },
  wrapuptime: {
    type: Number,
    default: 0
  },
  maxlen: {
    type: Number,
    default: 0
  },
  announce: String,
  members: {
    type: [String],
    default: []
  },
  musicClass: {
    type: String,
    default: 'default'
  }
}, {
  timestamps: true
});

const Queue = mongoose.model('Queue', queueSchema);

module.exports = Queue;

// models/OutboundRoute.js
const mongoose = require('mongoose');

const outboundRouteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  pattern: {
    type: String,
    required: true
  },
  trunk: {
    type: String,
    required: true
  },
  prepend: String,
  prefix: String,
  callerIdName: String,
  callerIdNumber: String,
  priority: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

const OutboundRoute = mongoose.model('OutboundRoute', outboundRouteSchema);

module.exports = OutboundRoute;

// models/InboundRoute.js
const mongoose = require('mongoose');

const inboundRouteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  did: String,
  destination: {
    type: String,
    required: true
  },
  destinationType: {
    type: String,
    enum: ['extension', 'queue', 'ivr'],
    required: true
  },
  callerIdName: String,
  priority: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

const InboundRoute = mongoose.model('InboundRoute', inboundRouteSchema);

module.exports = InboundRoute;

// models/CDR.js
const mongoose = require('mongoose');

const cdrSchema = new mongoose.Schema({
  uniqueid: {
    type: String,
    unique: true,
    required: true
  },
  src: String,
  dst: String,
  dcontext: String,
  clid: String,
  channel: String,
  dstchannel: String,
  lastapp: String,
  lastdata: String,
  start: Date,
  answer: Date,
  end: Date,
  duration: Number,
  billsec: Number,
  disposition: String,
  amaflags: Number,
  accountcode: String,
  userfield: String,
  recordingfile: String
}, {
  timestamps: true
});

// Create indexes for common queries
cdrSchema.index({ start: -1 });
cdrSchema.index({ src: 1 });
cdrSchema.index({ dst: 1 });
cdrSchema.index({ disposition: 1 });

const CDR = mongoose.model('CDR', cdrSchema);

module.exports = CDR;

// models/index.js
module.exports = {
  User: require('./User'),
  Extension: require('./Extension'),
  Trunk: require('./Trunk'),
  Queue: require('./Queue'),
  OutboundRoute: require('./OutboundRoute'),
  InboundRoute: require('./InboundRoute'),
  CDR: require('./CDR')
};