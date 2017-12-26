import {CustEvent} from 'chimee-helper';

export default class WebRTC extends CustEvent {
  constructor (config) {
    super();
    this.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection;
    this.RTCSessionDescription = window.RTCSessionDescription ||
    window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
    this.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate ||
    window.webkitRTCIceCandidate;
    this.dataChannel = null;
    this.peerConnection = null;
    this.currentoffer = null;
    this.sdp = null;
    this.isDataChannelCreating = null;
    this.iceServer = {
      'iceServers': [{
        'url': 'stun:203.183.172.196:3478'
      }]
    };
    this.createPeerConnect();
  }
  /*
  * 创建Peer链接
  */
  createPeerConnect () {
    const self = this;
    this.peerConnection = new this.RTCPeerConnection(this.iceServer);
    // this.sendOffer();
    this.peerConnection.onopen = function () {
      console.log('PeerConnection established');
    };
    this.peerConnection.onicecandidate = function (event) {
      if (event.candidate === null) {
        if (self.sdp === '') {
          console.log('sdp error');
          self.emit('error', 'sdp error');
          return;
        }
        return;
      } else {
          self.emit('signal', event.candidate);
      }
      console.log('iceGatheringState: ' + self.peerConnection.iceGatheringState);
    };
    this.createDatachannel();
    this.peerConnection.oniceconnectionstatechange = (evt)=> {
      if (this.peerConnection.signalingState === 'stable' && !this.isDataChannelCreating) {
        this.createDatachannel();
        this.isDataChannelCreating = true;
      }
    };
    this.peerConnection.ondatachannel = (evt)=> {
      this.dataChannel = evt.channel;
      console.log(this.dataChannel.label + 'dc state: ' + this.dataChannel.readyState);
      this.dataChannelEvents(this.dataChannel);
    };
  }
  /*
  * 发送信令
  */
  sendOffer () {
    this.peerConnection.createOffer().then((desc)=> {
      this.currentoffer = desc;
      this.peerConnection.setLocalDescription(desc);
      this.emit('signal', desc);
      this.sdp = desc.sdp;
    }, function (error) {
        console.log(error);
    });
  }

  createDatachannel () {
    try {
      this.dataChannel = this.peerConnection.createDataChannel('dataChannel', {ordered: true, reliable: true});
      this.dataChannel.binaryType = 'arraybuffer';
    }catch (dce) {
        this.emit('error', dce.message);
    }
    this.dataChannelEvents(this.dataChannel);
  }

  dataChannelEvents (channel) {
    channel.onopen = ()=> {
      console.log('Datachannel opened, current stateis :\n' + this.dataChannel.readyState);
      this.emit('connect', this.dataChannel.readyState);
    };

    channel.onmessage = (event)=> {
      console.log(event);
        this.emit('data', event.data);
    };

    channel.onerror = (err)=> {
      this.emit('error', err);
    };

    channel.onclose = ()=> {
      console.log('DataChannel is closed');
    };
  }

  signal (event) {
    console.log(event);
    console.log('[pear_webrtc] event.type' + event.type);
    if (event.type === 'offer') {
      this.receiveOffer(event);
    } else if (event.type === 'answer') {
      this.receiveAnswer(event);
    } else {
      this.receiveIceCandidate(event);
      // console.log('err event.type: ' + JSON.stringify(event));
    }
  }

  receiveOffer (evt) {
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(evt));
    this.peerConnection.createAnswer().then((desc)=> {
      this.peerConnection.setLocalDescription(desc, ()=>{
        this.currentoffer = desc;
        this.sdp = desc.sdp;
        this.emit('signal', desc);
      });
    }, function (err) {
      console.log(err);
    });
  }
  receiveAnswer (answer) {
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  receiveIceCandidate (evt) {
    if (evt) {
      this.peerConnection.addIceCandidate(new RTCIceCandidate(evt)).then(_=>{
      }).catch(e=>{
        console.log(e);
      });;
    } else{
      return;
    }
  }

  send (data) {
    try {
      this.dataChannel.send(data);
    } catch (e) {
      console.log('dataChannel send error：' + e.message);
    }
  }

  close () {
    if (this.peerConnection) {
      this.peerConnection.close();
      clearInterval(this.timer);
    }
  }

  startHeartbeat () {
    const heartbeat = {
      action: 'ping'
    };

    this.timer = setInterval(()=> {
      console.log(JSON.stringify(heartbeat));
      this.send(JSON.stringify(heartbeat));
    }, 90 * 1000);
  }
}
