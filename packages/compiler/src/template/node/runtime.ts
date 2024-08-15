export default `
  const PROCESS_STATUS = {
    RUNING: 'running',
    ERROR: 'error',
  };

  const run = () => {
    console.log('forked chil process run');

    try {
      const { logger } = middleware;
      const { Flow } = Core;
      const flow = new Flow({});
      const nodeMap = {};

      {% for node in nodeList %}
      const {{ node.nodeId }}_bizData = {{ node.bizData }};
      const {{ node.nodeId }} = new {{ node.id }}({
        nodeId: "{{ node.nodeId }}",
        flowId: {{ flowId }},
        env: 'prod',
        middleware,
        config: {{ node.nodeId }}_bizData
      });
      nodeMap.{{ node.nodeId }} = {{ node.nodeId }};
      {% endfor %}

      {% for connection in connections %}
      {{ connection.Output.nodeId }}.O("{{ connection.Output.portConf.id }}").connect({{ connection.Input.nodeId }}.I("{{ connection.Input.portConf.id }}"));
      {% endfor %}

      {% for read in ReadableNodes %}
      flow.run({{ read.nodeId }});
      {% endfor %}

      send(PROCESS_STATUS.RUNNING);

    } catch(e) {
      middleware.logger('frun occur error', e.message, e.stack);

      send(PROCESS_STATUS.ERROR, {
        message: e.toString()
      });

      throw e;
    }
  }

  run();
`;
