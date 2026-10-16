'use strict';
// Native OPC UA read-only via optional node-opcua-client; no writes or method calls.
async function opcua(action,body){
  const endpoint=body?.endpoint;
  if(typeof endpoint!=='string'||!/^opc\.tcp:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/.test(endpoint))throw Object.assign(new Error('Only loopback OPC UA endpoints accepted by default. Use a secured local gateway.'),{status:400});
  let lib;try{lib=require('node-opcua-client');}catch {throw Object.assign(new Error('OPC UA driver unavailable. Install backend optional dependency: npm install node-opcua-client'),{status:503});}
  const client=lib.OPCUAClient.create({endpointMustExist:false,connectionStrategy:{maxRetry:0},requestedSessionTimeout:15000});
  try{
    await client.connect(endpoint);const session=await client.createSession();
    try{
      if(action==='browse'){
        const root=String(body.nodeId||'ns=0;i=85');
        const b=await session.browse(root);return (b.references||[]).slice(0,100).map(v=>({nodeId:v.nodeId.toString(),name:v.displayName?.text||'',browseName:v.browseName?.name||''}));
      }
      if(action==='read') {
        const id=String(body.nodeId||'');if(!/^ns=\d+;(?:i=\d+|s=[-\w./:]{1,120})$/.test(id))throw Object.assign(new Error('Invalid nodeId'),{status:400});
        const v=await session.read({nodeId:id,attributeId:13});return {nodeId:id,status:v.statusCode?.toString(),value:v.value?.value,dataType:v.value?.dataType};
      }
      throw Object.assign(new Error('Unsupported OPC UA operation'),{status:400});
    } finally {await session.close();}
  } finally {await client.disconnect();}
}
module.exports={opcua};
