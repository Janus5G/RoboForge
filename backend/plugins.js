'use strict';
const PLUGINS=[
{id:'ros2',name:'ROS 2',category:'production',experimental:false,capabilities:['topic-monitor','node-graph','command-center']},
{id:'opcua',name:'OPC UA',category:'production',experimental:false,capabilities:['address-space','live-values','method-caller']},
{id:'mqtt',name:'MQTT / EMQX',category:'production',experimental:false,capabilities:['broker-explorer','live-feed','publish-console']},
{id:'isaac-sim',name:'NVIDIA Isaac Sim',category:'experimental',experimental:true,capabilities:['sim-control','scene-viewer']},
{id:'siemens-xcelerator',name:'Siemens Xcelerator',category:'experimental',experimental:true,capabilities:['asset-browser','work-orders']},
{id:'arduino',name:'Arduino',category:'experimental',experimental:true,capabilities:['serial-monitor','firmware-upload']},
{id:'home-assistant',name:'Home Assistant',category:'experimental',experimental:true,capabilities:['entity-grid','automation']},
{id:'rea',name:'REA Analysis',category:'experimental',experimental:true,capabilities:['static-analysis','cli-status']},
{id:'refract',name:'Refract Studio',category:'experimental',experimental:true,capabilities:['compiler-preview']},
{id:'janus',name:'DeepSeek Janus',category:'experimental',experimental:true,capabilities:['runtime-status']}
];
module.exports={PLUGINS};
