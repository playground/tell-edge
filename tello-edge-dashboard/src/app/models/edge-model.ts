export enum Enum {
  SOCKETIO_CONNECTED
}

export interface Broadcast {
  type: string | Enum;
  payload?: any;
}

