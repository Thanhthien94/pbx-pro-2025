// src/asterisk/interfaces/originate-params.interface.ts
export interface OriginateParams {
  channel: string;
  extension: string;
  context?: string;
  priority?: number;
  variables?: Record<string, string>;
  callerid?: string;
}
