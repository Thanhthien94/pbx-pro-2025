import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Extension {
  _id?: string;
  extension: string;
  name: string;
  secret: string;
  context?: string;
  host?: string;
  callGroup?: string;
  pickupGroup?: string;
  mailbox?: string;
  email?: string;
  dtmfMode?: string;
  transport?: string;
  nat?: string;
  callLimit?: number;
  disallow?: string;
  allow?: string;
}

export interface Trunk {
  _id?: string;
  name: string;
  type: "sip" | "pjsip" | "iax";
  host: string;
  username?: string;
  secret?: string;
  context?: string;
  dtmfMode?: string;
  transport?: string;
  insecure?: string;
  nat?: string;
  qualifyFreq?: number;
  disallow?: string;
  allow?: string;
}

export interface Queue {
  _id?: string;
  name: string;
  strategy?:
    | "ringall"
    | "leastrecent"
    | "fewestcalls"
    | "random"
    | "rrmemory"
    | "linear"
    | "wrandom";
  timeout?: number;
  wrapuptime?: number;
  maxlen?: number;
  announce?: string;
  members: string[];
  musicClass?: string;
}

export interface OutboundRoute {
  _id?: string;
  name: string;
  pattern: string;
  trunk: string;
  prepend?: string;
  prefix?: string;
  callerIdName?: string;
  callerIdNumber?: string;
  priority?: number;
}

export interface InboundRoute {
  _id?: string;
  name: string;
  did?: string;
  destination: string;
  destinationType: "extension" | "queue" | "ivr";
  callerIdName?: string;
  priority?: number;
}

export interface CDR {
  _id?: string;
  uniqueid: string;
  src: string;
  dst: string;
  dcontext?: string;
  clid?: string;
  channel?: string;
  dstchannel?: string;
  lastapp?: string;
  lastdata?: string;
  start: Date | string;
  answer?: Date | string;
  end?: Date | string;
  duration: number;
  billsec: number;
  disposition: string;
  amaflags?: number;
  accountcode?: string;
  userfield?: string;
  recordingfile?: string;
}

export interface DashboardCounts {
  extensions: number;
  trunks: number;
  queues: number;
  activeCalls: number;
  cdrsToday: number;
}

export interface DashboardData {
  status: any;
  channels: any;
  counts: DashboardCounts;
}

// Create the Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized response
    if (error.response && error.response.status === 401) {
      // Clear token and user data
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Redirect to login page
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/login", credentials);
  return response.data;
};

// Dashboard API
export const getDashboard = async (): Promise<DashboardData> => {
  const response = await api.get<DashboardData>("/dashboard");
  return response.data;
};

// Extensions API
export const getExtensions = async (): Promise<Extension[]> => {
  const response = await api.get<Extension[]>("/extensions");
  return response.data;
};

export const getExtension = async (id: string): Promise<Extension> => {
  const response = await api.get<Extension>(`/extensions/${id}`);
  return response.data;
};

export const createExtension = async (
  extension: Extension
): Promise<Extension> => {
  const response = await api.post<Extension>("/extensions", extension);
  return response.data;
};

export const updateExtension = async (
  id: string,
  extension: Extension
): Promise<Extension> => {
  const response = await api.put<Extension>(`/extensions/${id}`, extension);
  return response.data;
};

export const deleteExtension = async (id: string): Promise<void> => {
  await api.delete(`/extensions/${id}`);
};

// Trunks API
export const getTrunks = async (): Promise<Trunk[]> => {
  const response = await api.get<Trunk[]>("/trunks");
  return response.data;
};

export const getTrunk = async (id: string): Promise<Trunk> => {
  const response = await api.get<Trunk>(`/trunks/${id}`);
  return response.data;
};

export const createTrunk = async (trunk: Trunk): Promise<Trunk> => {
  const response = await api.post<Trunk>("/trunks", trunk);
  return response.data;
};

export const updateTrunk = async (id: string, trunk: Trunk): Promise<Trunk> => {
  const response = await api.put<Trunk>(`/trunks/${id}`, trunk);
  return response.data;
};

export const deleteTrunk = async (id: string): Promise<void> => {
  await api.delete(`/trunks/${id}`);
};

// Queues API
export const getQueues = async (): Promise<Queue[]> => {
  const response = await api.get<Queue[]>("/queues");
  return response.data;
};

export const getQueue = async (id: string): Promise<Queue> => {
  const response = await api.get<Queue>(`/queues/${id}`);
  return response.data;
};

export const createQueue = async (queue: Queue): Promise<Queue> => {
  const response = await api.post<Queue>("/queues", queue);
  return response.data;
};

export const updateQueue = async (id: string, queue: Queue): Promise<Queue> => {
  const response = await api.put<Queue>(`/queues/${id}`, queue);
  return response.data;
};

export const deleteQueue = async (id: string): Promise<void> => {
  await api.delete(`/queues/${id}`);
};

// Outbound Routes API
export const getOutboundRoutes = async (): Promise<OutboundRoute[]> => {
  const response = await api.get<OutboundRoute[]>("/outbound-routes");
  return response.data;
};

export const getOutboundRoute = async (id: string): Promise<OutboundRoute> => {
  const response = await api.get<OutboundRoute>(`/outbound-routes/${id}`);
  return response.data;
};

export const createOutboundRoute = async (
  route: OutboundRoute
): Promise<OutboundRoute> => {
  const response = await api.post<OutboundRoute>("/outbound-routes", route);
  return response.data;
};

export const updateOutboundRoute = async (
  id: string,
  route: OutboundRoute
): Promise<OutboundRoute> => {
  const response = await api.put<OutboundRoute>(
    `/outbound-routes/${id}`,
    route
  );
  return response.data;
};

export const deleteOutboundRoute = async (id: string): Promise<void> => {
  await api.delete(`/outbound-routes/${id}`);
};

// Inbound Routes API
export const getInboundRoutes = async (): Promise<InboundRoute[]> => {
  const response = await api.get<InboundRoute[]>("/inbound-routes");
  return response.data;
};

export const getInboundRoute = async (id: string): Promise<InboundRoute> => {
  const response = await api.get<InboundRoute>(`/inbound-routes/${id}`);
  return response.data;
};

export const createInboundRoute = async (
  route: InboundRoute
): Promise<InboundRoute> => {
  const response = await api.post<InboundRoute>("/inbound-routes", route);
  return response.data;
};

export const updateInboundRoute = async (
  id: string,
  route: InboundRoute
): Promise<InboundRoute> => {
  const response = await api.put<InboundRoute>(`/inbound-routes/${id}`, route);
  return response.data;
};

export const deleteInboundRoute = async (id: string): Promise<void> => {
  await api.delete(`/inbound-routes/${id}`);
};

// CDR API
export interface CDRParams {
  startDate?: string;
  endDate?: string;
  src?: string;
  dst?: string;
  limit?: number;
  page?: number;
}

export interface CDRResponse {
  cdrs: CDR[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export const getCDRs = async (params: CDRParams): Promise<CDRResponse> => {
  const response = await api.get<CDRResponse>("/cdrs", { params });
  return response.data;
};

// Asterisk System API
export const getAsteriskStatus = async (): Promise<any> => {
  const response = await api.get("/asterisk/status");
  return response.data;
};

export const getAsteriskChannels = async (): Promise<any> => {
  const response = await api.get("/asterisk/channels");
  return response.data;
};

export const executeCliCommand = async (command: string): Promise<any> => {
  const response = await api.post("/asterisk/cli", { command });
  return response.data;
};

export const reloadAsteriskModule = async (module?: string): Promise<any> => {
  const response = await api.post("/asterisk/reload", { module });
  return response.data;
};

export interface OriginateCallParams {
  channel: string;
  extension: string;
  context?: string;
  priority?: number;
  variables?: Record<string, string>;
}

export const originateCall = async (
  params: OriginateCallParams
): Promise<any> => {
  const response = await api.post("/asterisk/originate", params);
  return response.data;
};

export const hangupChannel = async (channel: string): Promise<any> => {
  const response = await api.post("/asterisk/hangup", { channel });
  return response.data;
};

export default {
  login,
  getDashboard,
  getExtensions,
  getExtension,
  createExtension,
  updateExtension,
  deleteExtension,
  getTrunks,
  getTrunk,
  createTrunk,
  updateTrunk,
  deleteTrunk,
  getQueues,
  getQueue,
  createQueue,
  updateQueue,
  deleteQueue,
  getOutboundRoutes,
  getOutboundRoute,
  createOutboundRoute,
  updateOutboundRoute,
  deleteOutboundRoute,
  getInboundRoutes,
  getInboundRoute,
  createInboundRoute,
  updateInboundRoute,
  deleteInboundRoute,
  getCDRs,
  getAsteriskStatus,
  getAsteriskChannels,
  executeCliCommand,
  reloadAsteriskModule,
  originateCall,
  hangupChannel,
};
