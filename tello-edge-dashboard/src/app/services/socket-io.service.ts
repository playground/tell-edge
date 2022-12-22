import { EventEmitter, Injectable, Output } from '@angular/core';
import { io } from 'socket.io-client';

import { environment } from '../../environments/environment';
import { Broadcast, Enum } from '../models/edge-model';

@Injectable({
  providedIn: 'root'
})
export class SocketIoService {
  @Output() broadcastAgent = new EventEmitter<Broadcast>();
  socket: any;
  constructor() { }

  broadcast(data: any) {
    this.broadcastAgent.emit(data);
  }

  emit(command, value) {
    this.socket.emit(command, value);
  }
  emitVideo(streamCommand) {
    this.socket.emit(streamCommand);    
  }
  setupSocketConnection() {
    this.socket = io(environment.SOCKET_ENDPOINT, {
      auth: {
        token: '123'
      }
    })
    this.socket.on('isConnected', (status: boolean, battery: { toString: () => string; }, height: { toString: () => string; }) => {
      this.broadcast({type: Enum.SOCKETIO_CONNECTED, payload: {status: status, battery: battery, height: height}})
    }); 
  }
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
