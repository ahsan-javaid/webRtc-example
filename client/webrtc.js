var localVideo;
var remoteVideo;
var peerConnection;
var uuid;
//
var peerConnectionConfig = {};
peerConnectionConfig = {
    "iceServers":[
        {
            "url":"stun:s2.xirsys.com"
        },
        {
            "username":"d07e54e8-6e03-11e7-a7e3-d5820985e5f6",
            "url":"turn:s2.xirsys.com:80?transport=udp",
            "credential":"d07e55a6-6e03-11e7-87a0-e40f3d09665d"
        },
        {
            "username":"d07e54e8-6e03-11e7-a7e3-d5820985e5f6",
            "url":"turn:s2.xirsys.com:3478?transport=udp",
            "credential":"d07e55a6-6e03-11e7-87a0-e40f3d09665d"
        },
        {
            "username":"d07e54e8-6e03-11e7-a7e3-d5820985e5f6",
            "url":"turn:s2.xirsys.com:80?transport=tcp",
            "credential":"d07e55a6-6e03-11e7-87a0-e40f3d09665d"
        },
        {
            "username":"d07e54e8-6e03-11e7-a7e3-d5820985e5f6",
            "url":"turn:s2.xirsys.com:3478?transport=tcp",
            "credential":"d07e55a6-6e03-11e7-87a0-e40f3d09665d"
        },
        {
            "username":"d07e54e8-6e03-11e7-a7e3-d5820985e5f6",
            "url":"turns:s2.xirsys.com:443?transport=tcp",
            "credential":"d07e55a6-6e03-11e7-87a0-e40f3d09665d"
        },
        {
            "username":"d07e54e8-6e03-11e7-a7e3-d5820985e5f6",
            "url":"turns:s2.xirsys.com:5349?transport=tcp",
            "credential":"d07e55a6-6e03-11e7-87a0-e40f3d09665d"
        }
    ]
};

var iceServers = [];

iceServers.push({
    url: 'stun:stun.l.google.com:19302'
});

iceServers.push({
    url: 'stun:stun.anyfirewall.com:3478'
});

iceServers.push({
    url: 'turn:turn.bistri.com:80',
    credential: 'homeo',
    username: 'homeo'
});

iceServers.push({
    url: 'turn:turn.anyfirewall.com:443?transport=tcp',
    credential: 'webrtc',
    username: 'webrtc'
});

var iceServersObject = {
    iceServers: iceServers
};
peerConnection = iceServersObject

function pageReady() {
    uuid = uuid();

    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    serverConnection = new WebSocket('wss://' + window.location.hostname + ':4000');
    serverConnection.onmessage = gotMessageFromServer;

    var constraints = {
        video: true,
        audio: true,
    };

    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
    } else {
        alert('Your browser does not support getUserMedia API');
    }
}

function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideo.src = window.URL.createObjectURL(stream);
}

function start(isCaller) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig,{
        optional: [{
            DtlsSrtpKeyAgreement: true
        }]
    });
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.onaddstream = gotRemoteStream;
    peerConnection.addStream(localStream);

    if(isCaller) {
        peerConnection.createOffer().then(createdDescription).catch(errorHandler);
    }
}

function gotMessageFromServer(message) {
    if(!peerConnection) start(false);

    var signal = JSON.parse(message.data);

    // Ignore messages from ourself
    if(signal.uuid == uuid) return;

    if(signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
            // Only create answers in response to offers
            if(signal.sdp.type == 'offer') {
                peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
            }
        }).catch(errorHandler);
    } else if(signal.ice) {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    }
}

function gotIceCandidate(event) {
    if(event.candidate != null) {
        serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
    }
}

function createdDescription(description) {
    console.log('got description');

    peerConnection.setLocalDescription(description).then(function() {
        serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch(errorHandler);
}

function gotRemoteStream(event) {
    console.log('got remote stream');
    remoteVideo.src = window.URL.createObjectURL(event.stream);
}

function errorHandler(error) {
    console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function uuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
