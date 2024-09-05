import path from 'path'
import runScript from 'runscript'
import { log, getRootPath } from '../../helper'


class Builder {
  ctx: any;
  options: {[key: string]: any};
  constructor(options = {}, ctx = {}) {
    this.ctx = ctx
    this.options = options;
  }

  async dependencesPrepare () {
    log.debug('开始安装节点 editor 依赖')
    const root = getRootPath()
    await runScript('npm i', { cwd: path.join(root, '@editor')})
  }

  async run (cwd) {
    // await this.dependencesPrepare()
    log.debug('正在执行 editor 构建 ...')
    await runScript('npm run build', { cwd: path.join(cwd, '@editor')})
    log.debug('正在执行 runtime 构建 ...')
    await runScript('npm run build', { cwd: path.join(cwd, '@runtime')})
  }
}

export default Builder
