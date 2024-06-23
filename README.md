# Autodemo
A small NodeJS that uses RCON app to automatically record in-game Open Fortress demos

### Requirements
- [NodeJS](https://nodejs.org/en)
- srcds-rcon (run install-srcds-rcon.bat)

### Installation
0. Get all the required stuff
1. Download the files from the repo...
2. Make a folder in your open fortress directory called "autodemo" and extract everything in that folder
3. In Steam, open Open Fortress' properties and add the following launch options: "-port 27019 -condebug -usercon +exec autoexec"
4. Make an autoexec.cfg (if you don't have one already) in your open_fortress/cfg directory and add an rcon password there (e.g. rcon_password "VeRF2DSVOdD")
5. Make a mercenary.cfg in open_fortress/cfg and write **echo "Start Recording"** in there
	- This can also be done for other class config files for autodemo to work with other classes
6. Open index.js with a text editor of your choice and fill in the first 2 fields (addressLAN & rconPassword) with your LAN address and the port 27019 (e.g "192.168.0.101:27019") and the RCON password you just made
7. Open the Fortress and make the following binds:
	- bind <key> "stop; echo Stop Recording"
	- bind <key> "echo Mark Demo"

### Usage
1. Launch start.bat before entering a match
2. Right after entering a match check your console, there should be a list of players (an output of 'status') in there
3. When the round is over, use the bind you made to stop recording
4. If you hit a sick clip feel free to use the bind for marking a demo you made, this will make a .txt file alongside the demo with the time of the clip
