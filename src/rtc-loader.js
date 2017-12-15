import WebRTC from './index';
import {CustEvent} from 'chimee-helper';

export default class Rtcloader extends CustEvent {
  constructor (config) {
    super();
    this.peer_id = config.peer_id;
    this.config = config;
    this.socket = null;
    this.webrtc = null;
    this.createWebsocket();
  }

  createWebsocket () {
    const socket = this.socket = new WebSocket(this.config.websocketUrl);
    socket.addEventListener('open', ()=>{
      this.socketSend({'type': 'mediaInfo', url: this.config.url});
      this.getAvailableNodes();
    });

    socket.addEventListener('message', (event)=> {
      this.handleMessage(JSON.parse(event.data));
    });

    socket.addEventListener('close', ()=>{
      console.log('close');
    });
    socket.addEventListener('error', ()=>{
      console.log('error');
    });
  }
  /*
  * 获取可以用的节点信息
  */
  getAvailableNodes () {

  }

  socketSend (data) {
    let message = null;
    if(typeof data !== 'string') {
      message = JSON.stringify(data);
    } else {
      message = data;
    }
    this.socket.send(message);
  }

  webrtcEvent () {
    this.webrtc.on('signal', (desc)=>{
			const sdesc = JSON.stringify(desc.data);
			this.socket.send(sdesc);
    });
    
    this.webrtc.on('data', (handle)=>{
      this.emit('data', handle.data);
    });
  }
 
  handleMessage (message) {
    if(message.type === 'offer' && !this.webrtc) {
      this.webrtc = new WebRTC();
      this.webrtcEvent();
    }
    this.webrtc.signal(message);
  }

  send (arrayBuffer) {
    this.webrtc.send(arrayBuffer);
  }

  connect () {
    this.webrtc = new WebRTC();
    this.webrtcEvent();
    this.webrtc.sendOffer();
  }
}
