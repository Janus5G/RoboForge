// backend/detector.js
const TECH_PATTERNS = {
  'ROS 2': /\b(ros2?|rclcpp|rclpy|topic|publisher|subscriber|lifecycle\s*node|node\s*graph|cmd_vel|scan|rosbridge)\b/i,
  'OPC UA': /\b(opc\s*ua|opcua|plc|industrial\s*automation|address\s*space|nodeid|siemens\s*s7)\b/i,
  'MQTT/EMQX': /\b(mqtt|emqx|broker|publish|subscribe|iot|device\s*fleet|telemetry|retained|qos)\b/i,
  'Isaac Sim ⚠️ EXPERIMENTAL': /\b(isaac\s*sim|omniverse|digital\s*twin|simulation|gpu|nvidia\s*isaac)\b/i,
  'Siemens Xcelerator ⚠️ EXPERIMENTAL': /\b(siemens\s*xcelerator|teamcenter|xcelerator|siemens\s*plm)\b/i,
  'Arduino ⚠️ EXPERIMENTAL': /\b(arduino|esp32|esp8266|microcontroller|web\s*serial|embedded\s*dev)\b/i,
  'Home Assistant ⚠️ EXPERIMENTAL': /\b(home\s*assistant|hass\.io|smart\s*home|entity|automation)\b/i,
};

function detectTechnologies(prompt) {
  const detected = [];
  for (const [tech, pattern] of Object.entries(TECH_PATTERNS)) {
    if (pattern.test(prompt)) {
      detected.push(tech);
    }
  }
  return detected.length > 0 ? detected : ['ROS 2'];
}

module.exports = { detectTechnologies };