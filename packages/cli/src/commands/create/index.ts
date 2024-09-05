import { BC } from '@atools/cf'
import run from './creator' 

export default class InitCommand extends BC {
  command: any;
  static command = 'create'
  static alias = 'c'
  static description = '创建 Xlang Node Component'

  init(command) {
    this.command = command
    this.command
      .option('-r, --readable', '快速创建 ReadableNode')
      .option('-t, --transform', '快速创建 TransformNode')
      .option('-w, --writable', '快速创建 WritableNode')
  }

  async do () {
    run()
  }
}
