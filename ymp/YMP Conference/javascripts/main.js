var chatlog = document.getElementById("chatlog");
var message = document.getElementById("message");
var connection_num = document.getElementById("connection_num");
var room_link = document.getElementById("room_link");
var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
function uuid () {
	var s4 = function() {
		return Math.floor(Math.random() * 0x10000).toString(16);
	};
	return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}
var ROOM = location.hash.substr(1);

if (!ROOM) {
	ROOM = uuid();
}
room_link.innerHTML = "<a href='#"+ROOM+"'>Link to the room</a>";

var ME = uuid();
// Указываем, что при закрытии сообщения нужно отправить серверу оповещение об этом
var socket = io.connect("", {"sync disconnect on unload": true});
socket.on("webrtc", socketReceived);
socket.on("new", socketNewPeer);
// Сразу отправляем запрос на вход в комнату
socket.emit("room", JSON.stringify({id: ME, room: ROOM}));

// Вспомогательная функция для отправки адресных сообщений, связанных с WebRTC
function sendViaSocket(type, message, to) {
	socket.emit("webrtc", JSON.stringify({id: ME, to: to, type: type, data: message}));
}
var server = {
	iceServers: [
		{url: "stun:23.21.150.121"},
		{url: "stun:stun.l.google.com:19302"},
		{url: "turn:numb.viagenie.ca", credential: "your password goes here", username: "example@example.com"}
	]
};
var options = {
	optional: [
		{DtlsSrtpKeyAgreement: true}, // требуется для соединения между Chrome и Firefox
		{RtpDataChannels: true} // требуется в Firefox для использования DataChannels API
	]
}
var peers = {};

function socketNewPeer(data) {
	peers[data] = {
		candidateCache: []
	};

	// Создаем новое подключение
	var pc = new PeerConnection(server, options);
	// Инициализирууем его
	initConnection(pc, data, "offer");

	// Сохраняем пира в списке пиров
	peers[data].connection = pc;

	// Создаем DataChannel по которому и будет происходить обмен сообщениями
	var channel = pc.createDataChannel("mychannel", {});
	channel.owner = data;
	peers[data].channel = channel;

	// Устанавливаем обработчики событий канала
	bindEvents(channel);

	// Создаем SDP offer
	pc.createOffer(function(offer) {
		pc.setLocalDescription(offer);
	});
}

function initConnection(pc, id, sdpType) {
	pc.onicecandidate = function (event) {
		if (event.candidate) {
			// При обнаружении нового ICE кандидата добавляем его в список для дальнейшей отправки
			peers[id].candidateCache.push(event.candidate);
		} else {
			// Когда обнаружение кандидатов завершено, обработчик будет вызван еще раз, но без кандидата
			// В этом случае мы отправялем пиру сначала SDP offer или SDP answer (в зависимости от параметра функции)...
			sendViaSocket(sdpType, pc.localDescription, id);
			// ...а затем все найденные ранее ICE кандидаты
			for (var i = 0; i < peers[id].candidateCache.length; i++) {
				sendViaSocket("candidate", peers[id].candidateCache[i], id);
			}
		}
	}
	pc.oniceconnectionstatechange = function (event) {
		if (pc.iceConnectionState == "disconnected") {
			connection_num.innerText = parseInt(connection_num.innerText) - 1;
			delete peers[id];
		}
	}
}

function bindEvents (channel) {
	channel.onopen = function () {
		connection_num.innerText = parseInt(connection_num.innerText) + 1;
	};
	channel.onmessage = function (e) {
		chatlog.innerHTML += "<div>Peer says: " + e.data + "</div>";
	};
}
function socketReceived(data) {
	var json = JSON.parse(data);
	switch (json.type) {
		case "candidate": 
			remoteCandidateReceived(json.id, json.data);
			break;
		case "offer":
			remoteOfferReceived(json.id, json.data);
			break;
		case "answer":
			remoteAnswerReceived(json.id, json.data);
			break;
	}
}
function remoteOfferReceived(id, data) {
	createConnection(id);
	var pc = peers[id].connection;

	pc.setRemoteDescription(new SessionDescription(data));
	pc.createAnswer(function(answer) {
		pc.setLocalDescription(answer);
	});
}
function createConnection(id) {
	if (peers[id] === undefined) {
		peers[id] = {
			candidateCache: []
		};
		var pc = new PeerConnection(server, options);
		initConnection(pc, id, "answer");

		peers[id].connection = pc;
		pc.ondatachannel = function(e) {
			peers[id].channel = e.channel;
			peers[id].channel.owner = id;
			bindEvents(peers[id].channel);
		}
	}
}
function remoteAnswerReceived(id, data) {
	var pc = peers[id].connection;
	pc.setRemoteDescription(new SessionDescription(data));
}
function remoteCandidateReceived(id, data) {
	createConnection(id);
	var pc = peers[id].connection;
	pc.addIceCandidate(new IceCandidate(data));
}
function sendMessage () {
	var msg = message.value;
	for (var peer in peers) {
		if (peers.hasOwnProperty(peer)) {
			if (peers[peer].channel !== undefined) {
				try {
					peers[peer].channel.send(msg);
				} catch (e) {}
			}
		}
	}
	chatlog.innerHTML += "<div>Peer says: " + msg + "</div>";
	message.value = "";
}
window.addEventListener("beforeunload", onBeforeUnload);

function onBeforeUnload(e) {
	for (var peer in peers) {
		if (peers.hasOwnProperty(peer)) {
			if (peers[peer].channel !== undefined) {
				try {
					peers[peer].channel.close();
				} catch (e) {}
			}
		}
	}
