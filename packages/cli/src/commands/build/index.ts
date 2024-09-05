import { BC } from '@atools/cf'
import Builder from './builder'

export default class BuildCommand extends BC {
  context: any;
  command: any;
  static command = 'build'
  static alias = 'b'
  static description = '编译构建 Hlang Node Component'

  init(command) {
    this.command = command
  }

  async do () {
    // ------ 执行客户端入口构建 ------
    const builder = new Builder({}, {
      cwd: this.context.cwd,
      env: this.context.env
    })

    try {
      await builder.run(this.context.cwd)
    } catch (error) {
      throw error
    }
  }
}
