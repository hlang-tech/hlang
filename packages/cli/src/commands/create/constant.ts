import path from 'path';

const TEMPLATE_PATH = path.resolve(__dirname, '../../../template')

const NODE_TYPE_LIST = [{
  name:'R(Read)节点',
  value:'R'
},{
  name:'T(Transform)节点',
  value:'T'
},{
  name:'W(Write)节点',
  value:'W'
}]

const DEFAULT_NODE_GROUP = [{
  name: '基础节点',
  value: 'base'
}, {
  name: '高级节点',
  value: 'advanced'
}

]

const TEMPLATE_LIST = [{
  name:'基础R节点模版',
  value:'R_NODE'
}, {
  name:'基础T节点模版',
  value:'T_NODE'
}, {
  name:'基础W节点模版',
  value:'W_NODE'
}]

export {
  TEMPLATE_PATH,
  TEMPLATE_LIST,
  NODE_TYPE_LIST,
  DEFAULT_NODE_GROUP
}

