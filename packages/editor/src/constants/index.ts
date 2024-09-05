export enum FLOW_RUNNING_STATUS {
  RUNNING = 'running',
  EXCETION = 'exception',
  STOPING = 'stoping',
  UNUSED = 'unused'
};

export enum FLOW_DEPLOY_STATUS {
  FAILED = 'deployFail',
  SUCCESS = 'deploySuccess',
  UNDEPLOY = 'undeploy',
  DEPLOYING = 'deploying'
};

export enum FLOW_ONLINE_STATUS {
  ONLINE = 'online',
  OFFLINE = 'offline'
};

export const FLOW_DEPLOY_STATUS_DESC = {
  [FLOW_DEPLOY_STATUS.UNDEPLOY]: '未部署',
  [FLOW_DEPLOY_STATUS.DEPLOYING]: '部署中',
  [FLOW_DEPLOY_STATUS.SUCCESS]: '部署成功',
  [FLOW_DEPLOY_STATUS.FAILED]: '部署失败'
};

export const FLOW_RUNNING_STATUS_DESC = {
  [FLOW_RUNNING_STATUS.UNUSED]: '未使用',
  [FLOW_RUNNING_STATUS.RUNNING]: '运行中',
  [FLOW_RUNNING_STATUS.EXCETION]: '运行异常',
  [FLOW_RUNNING_STATUS.STOPING]: '暂停中',
};
export const CONTAINER_DOM_ID = 'zoom-container';
export const FLOW_ONLINE_STATUS_DESC = {
  [FLOW_ONLINE_STATUS.ONLINE]: '在线',
  [FLOW_ONLINE_STATUS.OFFLINE]: '离线',
};


export const FLOW_DESC = {
  ...FLOW_DEPLOY_STATUS_DESC,
  ...FLOW_RUNNING_STATUS_DESC,
  ...FLOW_ONLINE_STATUS_DESC
};
// node节点拖拽的计量单位，复制节点的偏移量，新增节点的初始位置的最小单位
export const GRID_WIDTH = 20;
export const STYLE = {
  STATUS_COLOR_MAP: {
    [FLOW_DEPLOY_STATUS.UNDEPLOY]: '#ff9800',
    [FLOW_DEPLOY_STATUS.DEPLOYING]: '#2196f3',
    [FLOW_DEPLOY_STATUS.SUCCESS]: '#4caf50',
    [FLOW_DEPLOY_STATUS.FAILED]: '#f44336',
    [FLOW_RUNNING_STATUS.UNUSED]: '#808fad',
    [FLOW_RUNNING_STATUS.RUNNING]: '#4caf50',
    [FLOW_RUNNING_STATUS.EXCETION]: '#ccc',
    [FLOW_RUNNING_STATUS.STOPING]: '#2196f3',
    [FLOW_ONLINE_STATUS.ONLINE]: '#4caf50',
    [FLOW_ONLINE_STATUS.OFFLINE]: '#ff9800',
  }
};
