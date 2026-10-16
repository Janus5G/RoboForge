'use strict';
// Model weights and inference runtimes are never bundled or downloaded.
// There is deliberately no generic HTTP relay or unauthorised model execution.
function status(){return {enabled:process.env.JANUS_ENABLED==='1',readiness:'Standalone inference adapter is not yet verified or connected',runtime:'not configured',modelWeightsBundled:false,externalVerified:false,capabilityStatus:'planned; no inference tools exposed'};}
module.exports={status};
