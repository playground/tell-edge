import { spawn } from 'child_process';
import cors from 'cors';
import dgram from 'dgram';
import express from 'express';
import { writeFile } from 'fs';
import path from 'path';
import sdk from 'tellojs';
import ws from 'ws';

const app = express();
const http = require('http');
const server = http.createServer(app);
const socketio = require('socket.io');
const io = socketio(server, {
  cors: {
    origins: [
      'http://localhost:4200',
      'http://localhost:3001',
      'http://localhost:8080'
    ]
  }
});
//const http = require('http').Server(app);
//const io = require('socket.io')(http, {
//  cors: {
//    origins: [
//      'http://localhost:4200',
//      'http://localhost:3001',
//      'http://localhost:8080'
//    ]
//  }
//});

const telloSocket = dgram.createSocket('udp4');

export class Server {
  socketBound = false;
  app = express();
  telloHost = '192.168.10.1';
  telloPortCamera = 11111;
  localPort = 3001;
  localHost = 'localhost';
  wsPort = 3002;
  telloPort = 8889;
  barcodeAlreadyScanned = [];
  
  apiUrl = `${process.env.SERVERLESS_ENDPOINT}`
  constructor(private port = 3000) {
    this.initialise()
  }

  setupFFMPeg() {
    // FFMEG - use udp for stream video
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner',
      '-i',
      `udp://${this.telloHost}:${this.telloPortCamera}`,
      '-f',
      'mpegts',
      '-codec:v',
      'mpeg1video',
      '-s',
      '640x480',
      '-b:v',
      '800k',
      '-bf',
      '0',
      '-r',
      '20',
      `http://${this.localHost}:${this.localPort}/streaming`
    ]);
  }
  initialise() {    
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      console.log('token', token);
      next();
    });
    
    io.on('connection', async(socket) => {
      console.log('a user connected');
      try {
        await sdk.control.connect();
        if(!this.socketBound) {
          await telloSocket.bind(this.telloPort);
        }
        this.socketBound = true;
        const battery = await sdk.read.battery();
        const height = await sdk.read.height();
        console.log('emit isConnected')
        socket.emit('isConnected', true, battery, height);
      } catch (error) {
        console.log(error)
        socket.emit('isConnected', false, 0);
      }
      socket.on('disconnect', () => {
        console.log('user disconnected');
      });
      
      socket.on('my message', (msg) => {
        console.log('message: ' + msg);
        io.emit('my broadcast', `server: ${msg}`);
      });

      socket.on('command', async (params) => {
        try {
          console.log(params)
          switch (params.name) {
            case 'takeoff':
              await sdk.control.takeOff();
              break;
            case 'land':
              await sdk.control.land();
              break;
            case 'up':
              await sdk.control.move.up(params.val);
              break;
            case 'down':
              await sdk.control.move.down(params.val);
              break;
            case 'right':
              await sdk.control.move.right(params.val);
              break;
            case 'left':
              await sdk.control.move.left(params.val);
              break;
            case 'forward':
              await sdk.control.move.forward(params.val);
              break;
            case 'back':
              await sdk.control.move.back(params.val);
              break;
            case 'cw':
              await sdk.control.move.cw(params.val);
              break;
            case 'ccw':
              await sdk.control.move.ccw(params.val);
              break;
          }
        } catch (error) {
            socket.emit('commandError', error);
        }
      });

      socket.on('streamon', async () => {
        try {
          console.log('streamon')
          await telloSocket.send('command', this.telloPort, this.telloHost);
          await telloSocket.send('streamon', this.telloPort, this.telloHost);
          console.log('streamoon sent', this.telloPort, this.telloHost)
        } catch (error) {
          console.log(error);
        }
      });

      socket.on('streamoff', async () => {
        try {
            await telloSocket.send('command', this.telloPort, this.telloHost);
            await telloSocket.send('streamoff', this.telloPort, this.telloHost);
            console.log('streamoff sent')
        } catch (error) {
            console.log(error);
        }
      });

      socket.on('detectbarcode', async (params: any) => {
        try {
          const base64 = params.base64png;
          await writeFile("barcode.png", base64, 'base64', () => { return; });

          const zbarimg = spawn('zbarimg', ['./barcode.png']);
          zbarimg.stdout.setEncoding('utf8');
          zbarimg.stderr.setEncoding('utf8');
          zbarimg.stdout.on('data', function (data) {
            if (!this.barcodeAlreadyScanned.includes(data.split(':')[1].trim(''))) {
              this.barcodeAlreadyScanned.push(data.split(':')[1].trim(''));
              socket.emit('newbarcodescanned', data.split(':')[1].trim(''));
            };
          });
        } catch (error) {
          //console.log(error);
        }
      });

      socket.on('route1', async () => {
        try {
          sdk.control.connect()
            .then(() => sdk.control.takeOff())
            .then(() => sdk.control.move.up(60))
            .then(() => sdk.control.move.down(60))
            .then(() => sdk.control.move.left(60))
            .then(() => sdk.control.move.up(60))
            .then(() => sdk.control.move.down(60))
            .then(() => sdk.control.land())
            .then(result => console.log(result))
            .catch(error => console.error(error))
        } catch (error) {
          console.log(error);
        }
      });
    });
    let app = this.app;
    app.use(cors({
      origin: '*'
    }));

    app.use('/static', express.static('public'));

    app.use('/', express.static('dist/tello-edge'))
  
    app.get('/', (req: express.Request, res: express.Response, next: any) => { //here just add next parameter
      res.sendFile(
        path.resolve(__dirname, "index.html")
      )
      // next();
    })

    // Ws Tello streaming
    app.post('/streaming', (req, res) => {
      console.log('streaming')
      res.connection.setTimeout(0)
      req.on('data', function (data) {
        webSocket.broadcast(data);
      });
    });

    server.listen(this.port, this.localHost);

    // WebSocket Server for stream Tello Camera
    const webSocket:any = new ws.Server({ port: this.wsPort, host: this.localHost });

    // WebSocket Server Broadcast, when the video data is sent to client 
    webSocket.broadcast = function (data) {
      webSocket.clients.forEach(function each(client) {
        if (client.readyState === ws.OPEN) {
          client.send(data);
        }
      })
    };

    this.setupFFMPeg();
  }
}
