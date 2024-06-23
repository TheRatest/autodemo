/*	CHANGE THIS TO FIT YOUR NEEDS	*/
const addressLAN = "192.168.0.101:27015";
const rconPassword = "";
const conFile = "../console.log"; // path relative to autodemo
const demosPathPrefix = "demos/"; // path relative to game folder
const magicSequenceRecord = "Start recording" // start recording a demo if the game dev console output has this text
const magicSequenceStop = "Stop recording" // stop recording a demo if the game dev console output has this text
const magicSequenceSpecial = "Mark demo" // mark a demo as special if the game dev console output has this text
const demoNameFormat = "YYYY-MM-DD HH-mm-ss";
const deleteBoringDemos = false; // delete demos that weren't marked as special
/*==================================*/

const Rcon = require('srcds-rcon');
let rcon = Rcon({
	address: addressLAN,
	password: rconPassword,
});
const moment = require('moment');
const fs = require('fs');

const sleep = milliseconds => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)

let demoName = ""
let isSpecialDemo = false;
let isRecordingDemo = false;
let timestampStart = null;

let connected = false;
let monitorFileInterval = null;

function quit() {
	clearInterval(monitorFileInterval);
	connected = false;
	rcon.command(`stop`).then(() => {
		rcon.disconnect();
	});
}

function eraseConLog() {
	const newData = new Uint8Array(Buffer.from(''));
	fs.writeFile(conFile, newData, function() {});
}

function currentTime() {
	return Math.floor(Date.now() / 1000);
}

process.on('uncaughtException', function (err) {
	if(err.code != "ECONNRESET" || !connected)
		return;
	
	console.log(`[-] Connection dropped!`);

	connected = false;
	rcon.disconnect();
	clearInterval(monitorFileInterval);
	
	stopRecordingDemo();
	
	rconConnect();
});

function stopRecordingDemo() {
	if(!isRecordingDemo)
		return;
	
	console.log(`[=] Stopping recording...`);
	if(connected)
		rcon.command(`stop`);
	isRecordingDemo = false;
	if(deleteBoringDemos && !isSpecialDemo) {
		fs.unlinkSync(demoName + ".dem");
		console.log(`[-] Deleted ${demoName}.dem`);
	} else {
		console.log(`[+] Saved ${demoName}.dem`);
	}
}

function startRecordingDemo() {
	if(!connected || isRecordingDemo)
		return;
	
	isSpecialDemo = false;
	demoName = demosPathPrefix + moment().format(demoNameFormat);
	timestampStart = currentTime();
	rcon.command(`record "${demoName}"`);
	console.log(`[+] Started recording to ${demoName}.dem`);
	isRecordingDemo = true;
	sleep(3000);
	rcon.command(`status`);
}

function monitorFile() {
	if(!connected)
		return;
	
	let lines = fs.readFileSync(conFile).toString().split("\n");
	eraseConLog();
	
	for(i in lines) {
		const line = lines[i].trim();
		if(line === "")
			continue;

		if(line == magicSequenceRecord && !isRecordingDemo) {
			console.log(`[=] Starting recording...`);
			startRecordingDemo();
		}
		if(line == magicSequenceStop) {
			stopRecordingDemo();
		}
		if(line == magicSequenceSpecial) {
			if(!isRecordingDemo)
				continue;
			
			let isFirstSpecialMoment = false;
			
			if(!isSpecialDemo) {
				isFirstSpecialMoment = true;
				console.log(`[+] Current demo marked as special`);
			}
			
			isSpecialDemo = true;
			
			let markedTime = currentTime() - timestampStart;
			let hours = Math.floor(markedTime / 60 / 60);
			let minutes = Math.floor(markedTime / 60 % 60);
			let seconds = Math.floor(markedTime % 60);
			let strHours = hours > 9 ? hours : "0" + hours;
			let strMinutes = minutes > 9 ? minutes : "0" + minutes;
			let strSeconds = seconds > 9 ? seconds : "0" + seconds;
			let strMarkedTime = `${strHours}:${strMinutes}:${strSeconds}`;
			console.log(`[+] Marked time: ${strMarkedTime}`);
			
			if(isFirstSpecialMoment) {
				const newData = new Uint8Array(Buffer.from(`Special moments:\n${strMarkedTime}\n`));
				fs.writeFile("../" + demoName + ".txt", newData, function() {});
			} else {
				fs.appendFile("../" + demoName + ".txt", `${strMarkedTime}\n`, function() {});
			}
		}
	}
}

function rconConnect() {
	rcon.connect().then(() => {
		console.log(`[+] Connected to client rcon`);
			connected = true;
		
		if(monitorFileInterval != null)
			clearInterval(monitorFileInterval);
		
		monitorFileInterval = setInterval(monitorFile, 500);
		eraseConLog();
	}).catch((err) => {
		sleep(4000);
		rconConnect();
	});
}

rconConnect();