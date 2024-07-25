/*	CHANGE THIS TO FIT YOUR NEEDS	*/
const conFile = "../console.log"; // path relative to autodemo
const demosPathPrefix = "demos/"; // path relative to game folder
const magicSequencesRecord = ["Start recording", "recording Start"] // start recording a demo if the game dev console output has this text
const magicSequencesStop = ["Stop recording", "recording Stop"] // stop recording a demo if the game dev console output has this text
const magicSequencesSpecial = ["Mark demo", "demo Mark"] // mark a demo as special if the game dev console output has this text
const demoNameFormat = "YYYY-MM-DD HH-mm-ss";
const deleteBoringDemos = false; // delete demos that weren't marked as special
/*==================================*/

const Rcon = require('srcds-rcon');
let rcon = Rcon({
	address: '192.168.88.132:27019',
	password: 'VeRF2x5N5OmhUTeCvOdD',
});
const moment = require('moment');
const fs = require('fs');
const colors = require('colors');

const sleep = milliseconds => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)

let demoName = ""
let isSpecialDemo = false;
let isRecordingDemo = false;
let timestampStart = null;

let connected = false;
let monitorFileInterval = null;
let startRecordingDebounce = false;

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
	if(err.code != "ECONNRESET" || !connected) {
		console.error(`[-] Uncaught exception! ${err}`.red);
		return;
	}
	
	console.log(`[?] Connection dropped!`.yellow);

	connected = false;
	rcon.disconnect();
	clearInterval(monitorFileInterval);
	
	stopRecordingDemo();
	
	rconConnect();
});

function resetStartRecordingDebounce() {
	startRecordingDebounce = false;
}

function stopRecordingDemo() {
	if(!isRecordingDemo) {
		console.log(`[?] Tried to stop recording while not recording`.cyan);
		//if(connected)
		//	rcon.command(`stop`);
		return;
	}
	
	console.log(`[=] Stopping recording...`.yellow);
	//if(connected)
	//	rcon.command(`stop`);
	isRecordingDemo = false;
	if(deleteBoringDemos && !isSpecialDemo) {
		fs.unlinkSync(demoName + ".dem");
		console.log(`[+] Deleted ${demoName}.dem`.green);
	} else {
		console.log(`[+] Saved ${demoName}.dem`.green);
	}
}

function startRecordingDemo() {
	if(isRecordingDemo) {
		console.log(`[?] Tried to start recording while still recording`.cyan);
		return;
	}
	if(!connected) {
		console.log(`[?] Tried to start recording while not connected`.cyan);
		return;
	}
	
	isSpecialDemo = false;
	demoName = demosPathPrefix + moment().format(demoNameFormat);
	timestampStart = currentTime();
	rcon.command(`record "${demoName}"`, 500).then(response => {
		console.log(`[+] Started recording to ${demoName}.dem`.green);
		isRecordingDemo = true;
		sleep(3000);
		requestServerStatus();
	}).catch(err => {
		console.error(`[-] Couldn't start recording: ${err}`.red);
		startRecordingDemo();
	});
}

function requestServerStatus() {
	if(!connected)
		return;
	
	rcon.command(`status`, 4000).then(response => {
		console.log(`[+] Received status`.green);
	}).catch(err => {
		console.error(`[-] Couldn't fetch server status: ${err}`.red);
		requestServerStatus();
	});
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
		
		for(i = 0; i < magicSequencesRecord.length; i++) {
			magicSequenceRecord = magicSequencesRecord[i];
			if(line == magicSequenceRecord) {
				if(startRecordingDebounce) {
					startRecordingDebounce = false;
					continue;
				} else {
					startRecordingDebounce = true;
					setTimeout(resetStartRecordingDebounce, 500);
				}
				console.log(`[=] Starting recording...`.yellow);
				startRecordingDemo();
			}
		}
		
		for(i = 0; i < magicSequencesStop.length; i++) {
			magicSequenceStop = magicSequencesStop[i];
			if(line == magicSequenceStop) {
				stopRecordingDemo();
			}
		}
		
		for(i = 0; i < magicSequencesSpecial.length; i++) {
			magicSequenceSpecial = magicSequencesSpecial[i];
			if(line == magicSequenceSpecial) {
				if(!isRecordingDemo)
					continue;
				
				let isFirstSpecialMoment = false;
				
				if(!isSpecialDemo) {
					isFirstSpecialMoment = true;
					console.log(`[+] Current demo marked as special`.green);
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
				console.log(`[+] Marked time: ${strMarkedTime}`.green);
				
				if(isFirstSpecialMoment) {
					const newData = new Uint8Array(Buffer.from(`Special moments:\n${strMarkedTime}\n`));
					fs.writeFile("../" + demoName + ".txt", newData, function() {});
				} else {
					fs.appendFile("../" + demoName + ".txt", `${strMarkedTime}\n`, function() {});
				}
			}
		}
	}
}

function rconConnect() {
	rcon.connect().then(() => {
		console.log(`[+] Connected to client rcon`.green);
			connected = true;
		
		if(monitorFileInterval != null)
			clearInterval(monitorFileInterval);
		
		monitorFileInterval = setInterval(monitorFile, 100);
		eraseConLog();
	}).catch((err) => {
		sleep(3000);
		rconConnect();
	});
}

rconConnect();