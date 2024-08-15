export default `
const IPC_COMMANDS = {
  MIDDEWARE_CALL: 'middleware_call',
  EXIT: 'exit'
};

const IPC_SIGNAL = {
  CLOSE: 'close',
  MIDDEWARE_CALLBACK: 'middleware_callback',
  Trigger: 'trigger'
};

const triggerQueue = new Map();
const middlewareIPCQueue = new Map();
const send = (messageType, payload = {}) => {
  postMessage({
    type: messageType,
    message: JSON.stringify(payload)
  });
};

const middleware = {
  {% for name in middleware %}
  {{ name }}: middlewareCall('{{ name }}'),
  {% endfor %}
  onFlowCall: function (params, callback) {
    const { topic } = params;
    triggerQueue.set(topic, callback);
  },
  logger: console.log
}

const middlewareCall = mw => (...arg) => {
  const messageId = mw + _.uniqueId();
  const promise = new Promise((resolve, reject) => {
    send(IPC_COMMANDS.MIDDEWARE_CALL, {
      flowId: {{ flowId }},
      middlewareName: mw,
      arg,
      messageId
    });

    middlewareIPCQueue.set(messageId, { resolve, reject });
  });

  return promise;
}

onmessage = function (data) {
  const { id, message, type, error, topic } = data;
  console.log('Message received from main script', data);
  let parsed;
  
  try {
    parsed = JSON.parse(message);
  } catch (e) {
    parsed = message;
  }

  switch (type) {
    case IPC_SIGNAL.MIDDEWARE_CALLBACK:
      if (!middlewareIPCQueue.has(id)) console.warn('MIDDEWARE_CALLBACK recall occur error', msg);
      const { resolve, reject } = middlewareIPCQueue.get(id);
      if (error) reject(error);
      resolve(parsed);
      middlewareIPCQueue.delete(id);
      break;
    case IPC_SIGNAL.Trigger:
      const { topic } = data;
      const invokeCallback = triggerQueue.get(topic);
      invokeCallback && invokeCallback(parsed);
      break;
    case IPC_SIGNAL.CLOSE:
      triggerQueue.forEach((_, key) => {
        triggerQueue.delete(key);
      });
      middlewareIPCQueue.forEach((_, key) => {
        middlewareIPCQueue.delete(key);
      });
      send(IPC_COMMANDS.EXIT);
      self.close();
      break;
  }
}
`;
