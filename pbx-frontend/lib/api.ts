// lib/api.ts
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "pbx-admin-secret-key";

// Định nghĩa các kiểu dữ liệu
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

// Tạo instance axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  },
});

// Thêm interceptor để đưa extension ID và secret vào header
api.interceptors.request.use(
  (config) => {
    const extensionId = localStorage.getItem("extension-id");
    const extensionSecret = localStorage.getItem("extension-secret");

    if (extensionId && extensionSecret) {
      config.headers["X-Extension-Id"] = extensionId;
      config.headers["X-Extension-Secret"] = extensionSecret;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Thêm interceptor để xử lý lỗi xác thực
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Xóa thông tin extension
      localStorage.removeItem("extension");
      localStorage.removeItem("extension-id");
      localStorage.removeItem("extension-secret");

      // Chuyển về trang đăng nhập
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const verifyExtension = async (
  extension: string,
  secret: string
): Promise<any> => {
  const response = await api.post("/auth/verify-extension", {
    extension,
    secret,
  });
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
  const response = await api.patch<Extension>(`/extensions/${id}`, extension);
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
  const response = await api.patch<Trunk>(`/trunks/${id}`, trunk);
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
  const response = await api.patch<Queue>(`/queues/${id}`, queue);
  return response.data;
};

export const deleteQueue = async (id: string): Promise<void> => {
  await api.delete(`/queues/${id}`);
};

export const getQueueStatus = async (name: string): Promise<any> => {
  const response = await api.get(`/queues/${name}/status`);
  return response.data;
};

export const getAllQueueStatuses = async (): Promise<any> => {
  const response = await api.get("/queues/status");
  return response.data;
};

export const addQueueMember = async (
  id: string,
  member: string
): Promise<Queue> => {
  const response = await api.post<Queue>(`/queues/${id}/members`, { member });
  return response.data;
};

export const removeQueueMember = async (
  id: string,
  member: string
): Promise<Queue> => {
  const response = await api.delete<Queue>(`/queues/${id}/members/${member}`);
  return response.data;
};

export const pauseQueueMember = async (
  name: string,
  member: string,
  reason?: string
): Promise<any> => {
  const response = await api.post(`/queues/${name}/members/${member}/pause`, {
    reason,
  });
  return response.data;
};

export const unpauseQueueMember = async (
  name: string,
  member: string
): Promise<any> => {
  const response = await api.post(`/queues/${name}/members/${member}/unpause`);
  return response.data;
};

export const addDynamicQueueMember = async (
  name: string,
  member: string,
  penalty?: number
): Promise<any> => {
  const response = await api.post(
    `/queues/${name}/members/${member}/dynamic-add`,
    { penalty }
  );
  return response.data;
};

export const removeDynamicQueueMember = async (
  name: string,
  member: string
): Promise<any> => {
  const response = await api.delete(
    `/queues/${name}/members/${member}/dynamic-remove`
  );
  return response.data;
};

export const resetQueueStats = async (name: string): Promise<any> => {
  const response = await api.post(`/queues/${name}/reset-stats`);
  return response.data;
};

// Outbound Routes API
export const getOutboundRoutes = async (): Promise<OutboundRoute[]> => {
  const response = await api.get<OutboundRoute[]>("/routes/outbound");
  return response.data;
};

export const getOutboundRoute = async (id: string): Promise<OutboundRoute> => {
  const response = await api.get<OutboundRoute>(`/routes/outbound/${id}`);
  return response.data;
};

export const createOutboundRoute = async (
  route: OutboundRoute
): Promise<OutboundRoute> => {
  const response = await api.post<OutboundRoute>("/routes/outbound", route);
  return response.data;
};

export const updateOutboundRoute = async (
  id: string,
  route: OutboundRoute
): Promise<OutboundRoute> => {
  const response = await api.patch<OutboundRoute>(
    `/routes/outbound/${id}`,
    route
  );
  return response.data;
};

export const deleteOutboundRoute = async (id: string): Promise<void> => {
  await api.delete(`/routes/outbound/${id}`);
};

// Inbound Routes API
export const getInboundRoutes = async (): Promise<InboundRoute[]> => {
  const response = await api.get<InboundRoute[]>("/routes/inbound");
  return response.data;
};

export const getInboundRoute = async (id: string): Promise<InboundRoute> => {
  const response = await api.get<InboundRoute>(`/routes/inbound/${id}`);
  return response.data;
};

export const createInboundRoute = async (
  route: InboundRoute
): Promise<InboundRoute> => {
  const response = await api.post<InboundRoute>("/routes/inbound", route);
  return response.data;
};

export const updateInboundRoute = async (
  id: string,
  route: InboundRoute
): Promise<InboundRoute> => {
  const response = await api.patch<InboundRoute>(
    `/routes/inbound/${id}`,
    route
  );
  return response.data;
};

export const deleteInboundRoute = async (id: string): Promise<void> => {
  await api.delete(`/routes/inbound/${id}`);
};

// CDR API
export interface CDRParams {
  startDate?: string;
  endDate?: string;
  src?: string;
  dst?: string;
  limit?: number;
  page?: number;
  disposition?: string;
}

export interface CDRResponse {
  data: CDR[];
  total: number;
  page: number;
  pages: number;
}

export const getCDRs = async (params: CDRParams): Promise<CDRResponse> => {
  const response = await api.get<CDRResponse>("/cdr", { params });
  return response.data;
};

export const getCDR = async (id: string): Promise<CDR> => {
  const response = await api.get<CDR>(`/cdr/${id}`);
  return response.data;
};

export const getCDRByUniqueId = async (uniqueid: string): Promise<CDR> => {
  const response = await api.get<CDR>(`/cdr/uniqueid/${uniqueid}`);
  return response.data;
};

export const getCDRStats = async (params: {
  startDate?: string;
  endDate?: string;
  groupBy?: "day" | "hour" | "source" | "destination" | "disposition";
}): Promise<any> => {
  const response = await api.get("/cdr/stats", { params });
  return response.data;
};

export const getRecentCDRs = async (limit?: number): Promise<CDR[]> => {
  const response = await api.get<CDR[]>("/cdr/recent", { params: { limit } });
  return response.data;
};

export const getTodayCDRs = async (): Promise<any> => {
  const response = await api.get("/cdr/today");
  return response.data;
};

export const getMostCalledDestinations = async (
  limit?: number
): Promise<any[]> => {
  const response = await api.get<any[]>("/cdr/most-called", {
    params: { limit },
  });
  return response.data;
};

export const getMostActiveCallers = async (limit?: number): Promise<any[]> => {
  const response = await api.get<any[]>("/cdr/most-active-callers", {
    params: { limit },
  });
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

export const getExtensionStatus = async (extension: string): Promise<any> => {
  const response = await api.get(`/asterisk/extension/${extension}/status`);
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
  callerid?: string;
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
  verifyExtension,
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
  getQueueStatus,
  getAllQueueStatuses,
  addQueueMember,
  removeQueueMember,
  pauseQueueMember,
  unpauseQueueMember,
  addDynamicQueueMember,
  removeDynamicQueueMember,
  resetQueueStats,
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
  getCDR,
  getCDRByUniqueId,
  getCDRStats,
  getRecentCDRs,
  getTodayCDRs,
  getMostCalledDestinations,
  getMostActiveCallers,
  getAsteriskStatus,
  getAsteriskChannels,
  getExtensionStatus,
  executeCliCommand,
  reloadAsteriskModule,
  originateCall,
  hangupChannel,
};
