

import { readFileSync } from 'fs'
import { resolve } from 'path'
import inquirer from 'inquirer'
import Log from '../../helper/log'
import semver from 'semver'
import { BC } from '@atools/cf'
import Builder from '../build/builder'
import Publisher from './publish'


const VERSION_LIST = [{
  name: 'major',
  value: 'major'
}, {
  name: 'minor',
  value: 'minor'
}, {
  name: 'patch',
  value: 'patch'
}, {
  name: 'prerelease',
  value: 'prerelease',  
}]


export default class PublishCommand extends BC {
  command: string;
  context: any;
  static command = 'publish'
  static alias = 'p'
  static description = '发布 Hlang Node Component'

  init(command) {
    this.command = command

    // TODO
  }

  private async build(){
    const builder = new Builder({}, {
      cwd: this.context.cwd,
      env: this.context.env
    })

    try{
      await builder.run(this.context.cwd)
    }catch(e){
      Log.error('构建出错!')
      throw e
    }
    Log.tag('构建完成!')
  }

  private getCurrentVersion() {
    const packageJSON = JSON.parse(readFileSync(resolve(this.context.cwd, '@runtime', 'package.json'), 'utf-8'))
    return packageJSON.version
  }

  private async publish(){
    const currentVersion = this.getCurrentVersion();
    const versionList = VERSION_LIST.map(el => {
      const { name, value } = el;
      
      switch (name) {
        case 'prerelease':
          return {
            ...el,
            name: `${name}(${semver.inc(currentVersion, value, 'beta')})`
          }     
        default:
          return {
            ...el,
            name: `${name}(${semver.inc(currentVersion, value)})`, 
          }     
      }
    })
    const { commitMsg, versionTag } = await inquirer.prompt([{
      type: 'input',
      name: 'commitMsg',
      message: '本次变更内容',
    }, {
      type: 'list',
      name: 'versionTag',
      message: '发布版本策略',
      choices: versionList
    }])
    const publisher = new Publisher({},{
      cwd: this.context.cwd,
    })
    
    Log.debug('正在发布中...')
    try{
      await publisher.run(versionTag, commitMsg)
    }catch(e){
      Log.error('发布出错！')
      throw e
    }
    Log.info('节点发布成功')
  }

  async do () {
    // ------ 执行客户端入口构建 ------
    await this.build()
    await this.publish()
  }
}
