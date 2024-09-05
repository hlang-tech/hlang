import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import runScript from 'runscript'
import { getWriteInFilePath, compileFile, handleTmpFile, cloneDir } from './utils';
import Log from '../../helper/log';

import { TEMPLATE_PATH, NODE_TYPE_LIST, DEFAULT_NODE_GROUP } from './constant';

const { resolve } = path
const { writeFileSync, mkdirSync } = fs

const ANSWER_CONF = [{
  type:'input',
  name: 'nodeName',
  message: '请输入当前节点包名',
}, {
  type:'input',
  name: 'nodeId',
  message: '请输入当前节点Id',
}, {
  type:'list',
  name: 'nodeType',
  message: '请选择当前节点类型',
  dataSource: () => NODE_TYPE_LIST,
}, {
  type:'list',
  name: 'nodeGroup',
  message: '请选择当前节点归属分组',
  dataSource: () => DEFAULT_NODE_GROUP
}]

const readDirAndComplieFile = (targetDirPath, renderParams) => {
  const tmpFilehandler = (tmpFilePath) => {
    const writeInPath = getWriteInFilePath(tmpFilePath)
    const compileResult = compileFile(tmpFilePath, renderParams)

    writeFileSync(writeInPath, compileResult)
  }

  handleTmpFile(targetDirPath, tmpFilehandler)
}

const formatterName = (name) => {
  const nameSet = name.split('-')

  if(nameSet.length > 1){
    return nameSet.slice(1).reduce((string, splitedName)=>{
      string+=splitedName.slice(0,1).toUpperCase()+splitedName.slice(1)
      return string
    }, nameSet[0])
  }else{
    return name
  }
}

const dependencesPrepare = async(nodeId, type) => {
  Log.info('开始安装节点'+type+'依赖')

  Log.debug('path', path.join(process.cwd(), nodeId+'/@'+type))

  await runScript('npm i --registry https://registry.npmmirror.com/', { cwd: path.join(process.cwd(), nodeId+'/@'+type)})
  Log.info('节点'+type+'依赖安装完成')
}

const installNPM = async(nodeId) => {
  Log.info('辅助安装 node_modules...')
  await dependencesPrepare(nodeId, 'editor')
  await dependencesPrepare(nodeId, 'runtime')
  Log.info('node_modules 安装完成')
}

const loadAnswer = async() => {
  const answer = {}
  for (let index in ANSWER_CONF) {
    const { type, name, message, dataSource } = ANSWER_CONF[index]

    const choices = dataSource? (await dataSource()): []

    const result = await inquirer.prompt([{
      type,
      name,
      message,
      choices
    }])

    answer[name] = result[name]
  }

  return answer
}

async function run() {
  const opts = await loadAnswer() as any

  Object.assign(opts,{
    upperCaseNodeName: opts.nodeId && formatterName(opts.nodeId),
    npmGroupName: opts.nodeGroup === 'base'? 'component': opts.nodeGroup + '-component'
  })

  const targetDirPath = resolve(process.cwd(), opts.nodeId)

  mkdirSync(targetDirPath)

  await cloneDir(path.resolve(TEMPLATE_PATH, `${opts.nodeType}_NODE`), targetDirPath)

  readDirAndComplieFile(targetDirPath, opts)

  Log.info('模版安装完毕')

  await installNPM(opts.nodeId)

}


export default run

