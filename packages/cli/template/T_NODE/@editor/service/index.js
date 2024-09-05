import { batchCreateServices } from '@alife/legion';

import Mock from './mock';

import domainGenerator from './host';

const mockSwitch = false;

/**
 * 盒马前端应用 Service 规范：https://hippod.alibaba-inc.com/develop/fw9hqu
 * 在应用中对 Service 进行格式化：https://hippod.alibaba-inc.com/develop/im9m7c
 */
export default ({ env }) => {
  const domain = domainGenerator(env);

  return mockSwitch ? Mock : batchCreateServices({
    queryMerchantList: {
        url: `${domain.REX}/monitor/org/rpc.do?target=org&action=get&functionCode=pos_manager_pos`,
    },
  });
};
