import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { Broadcast, Enum } from './models/edge-model';
import { SocketIoService } from './services/socket-io.service';

declare const JSMpeg: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('.tellocamera', {static: false, read: HTMLCanvasElement})
  tellocamera: HTMLCanvasElement;
  @ViewChild('btnTakeOff', {static: false, read: ElementRef})
  btnTakeOff: ElementRef;
  @ViewChild('btnLand', {static: false, read: ElementRef})
  btnLand: ElementRef;
  @ViewChild('btnUp', {static: false, read: ElementRef})
  btnUp: ElementRef;
  @ViewChild('btnDown', {static: false, read: ElementRef})
  btnDown: ElementRef;
  @ViewChild('btnLeft', {static: false, read: ElementRef})
  btnLeft: ElementRef;
  @ViewChild('btnRight', {static: false, read: ElementRef})
  btnRight: ElementRef;
  @ViewChild('btnForward', {static: false, read: ElementRef})
  btnForward: ElementRef;
  @ViewChild('btnBack', {static: false, read: ElementRef})
  btnBack: ElementRef;
  @ViewChild('btnRotateLeft', {static: false, read: ElementRef})
  btnRotateLeft: ElementRef;
  @ViewChild('btnRotateRight', {static: false, read: ElementRef})
  btnRotateRight: ElementRef;
  @ViewChild('btnStreamOn', {static: false, read: ElementRef})
  btnStreamOn: ElementRef;
  @ViewChild('btnStreamOff', {static: false, read: ElementRef})
  btnStreamOff: ElementRef;
  @ViewChild('btnRoute1', {static: false, read: ElementRef})
  btnRoute1: ElementRef;
  @ViewChild('cameraoff', {static: false, read: ElementRef})
  cameraoff: ElementRef;
  @ViewChild('statusDisconnected', {static: false, read: ElementRef})
  statusDisconnected: ElementRef;
  @ViewChild('statusConnected', {static: false, read: ElementRef})
  statusConnected: ElementRef;
  @ViewChild('battery', {static: false, read: ElementRef})
  battery: ElementRef;
  @ViewChild('batteryLevel', {static: false, read: ElementRef})
  batteryLevel: ElementRef;
  @ViewChild('heightLevel', {static: false, read: ElementRef})
  heightLevel: ElementRef;

  psAgent!: { unsubscribe: () => void; };
  webSockUrl = `ws://${window.location.hostname}:3002/`;
  telloCamera: HTMLCanvasElement;
  telloPlayer;
  timer: any;
  timeMS =  100;
  title = 'tello-edge-dashboard';

  constructor(private socketIoService: SocketIoService) {

  }

  ngOnInit(): void {
    this.socketIoService.setupSocketConnection();
    
    this.psAgent = this.socketIoService.broadcastAgent.subscribe({
      next: async (msg: Broadcast) => {
        if(msg.type == Enum.SOCKETIO_CONNECTED) {
          this.updateUI(msg.payload);
          this.initVideoPlayer();
        }
      }  
    })  
  }

  initVideoPlayer() {
    this.telloCamera = <HTMLCanvasElement>document.querySelector('.tellocamera');
    if(this.telloCamera) {
      this.telloPlayer = new JSMpeg.Player(this.webSockUrl, {
        canvas: this.telloCamera,
        audio: false,
        videoBufferSize: 512 * 1024,
        preserveDrawingBuffer: true
      });
      this.telloCamera.setAttribute('style', 'display: none')  
    } else {
      console.log('failed to init video player.')
    }
  }

  trigger(command, task = '', val = 0) {
    this.socketIoService.emit(command, {
      name: task,
      val: val
    });
    console.log(command, task)
  }
  updateUI(payload: any) {
    this.statusDisconnected.nativeElement.setAttribute('style', payload.status ? 'display: none' : 'display: block');
    this.statusConnected.nativeElement.setAttribute('style', !payload.status ? 'display: none' : 'display: block');

    this.battery.nativeElement.innerText =`Battery ${payload.battery}%`;
    this.batteryLevel.nativeElement.setAttribute('style', `width: ${payload.battery}%`)

    this.heightLevel.nativeElement.innerText = payload.height || 0;

    this.toggleButtons(!payload.status);
  }
  streamOn() {
    console.log('streamon')
    this.socketIoService.emitVideo('streamon');
    this.cameraoff.nativeElement.setAttribute('style', 'display:none');
    this.telloCamera.setAttribute('style', 'display: block')  
    this.setCheckInterval(this.timeMS);
  }
  streamOff() {
    console.log('streamoff')
    this.socketIoService.emitVideo('streamoff');
    this.telloCamera.setAttribute('style', 'display: none')  
    this.cameraoff.nativeElement.setAttribute('style', 'display:block');
    clearInterval(this.timer);
  }
  setCheckInterval(ms: number) {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      let base64png = this.telloCamera.toDataURL('image/png').replace(/^data:image\/png;base64,/, "");
      this.socketIoService.emit('detectbarcode', {
        base64png
      });
    }, ms);
  };

  toggleButtons(enable: boolean) {
    this.btnTakeOff.nativeElement.disabled = enable;
    this.btnLand.nativeElement.disabled = enable;
    this.btnUp.nativeElement.disabled = enable;
    this.btnDown.nativeElement.disabled = enable;
    this.btnLeft.nativeElement.disabled = enable;
    this.btnRight.nativeElement.disabled = enable;
    this.btnForward.nativeElement.disabled = enable;
    this.btnBack.nativeElement.disabled = enable;
    this.btnRotateLeft.nativeElement.disabled = enable;
    this.btnRotateRight.nativeElement.disabled = enable;
    this.btnStreamOn.nativeElement.disabled = enable;
    this.btnStreamOff.nativeElement.disabled = enable;
    this.btnRoute1.nativeElement.disabled = enable;
  };

  ngOnDestroy() {
    this.socketIoService.disconnect()
  }  
}
