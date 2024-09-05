import { createService } from '../utils/request';

export default createService({
  getNode: {
    url: '/node',
    withCredentials: true,
  },
  getFlow: {
    url: '/flow/get',
  },
  getFlowList: {
    url: '/flow'
  },
  createFlow: {
    url: '/flow',
    method: 'POST',
  },
  saveFlow: {
    url: '/flow/arrange',
    method: 'POST',
  },
  deployFlow: {
    url: '/flow/deploy',
    method: 'POST',
  },
  updateNodeVersion: {
    url: 'flow/updateNodeVersion',
    method: 'POST',
  }
});