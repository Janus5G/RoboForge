'use strict';
const net = require('node:net');
const host=process.env.HOST||'127.0.0.1';
const port=Number(process.env.PORT||3001);
if (!Number.isInteger(port)||port<1||port>65535) {console.error('RoboForge: invalid PORT.'); process.exit(1);}
const socket=net.createServer();
socket.once('error',e=>{console.error(`RoboForge cannot start at ${host}:${port}: ${e.code||e.message}. Close the previous RoboForge instance or set a different PORT.`);process.exit(1);});
socket.listen(port,host,()=>socket.close(()=>process.exit(0)));
