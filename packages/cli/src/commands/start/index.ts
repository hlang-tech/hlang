// import open from 'open'
import { BC } from '@atools/cf'
// import DevServer from '@alife/hspider-devtools'
// import { log } from '../../helper'

class DevCommand extends BC {
  command: any;
  static command = 'start'
  static alias = 's'
  static description = '启动'

  init(command) {
    // TODO
    command.option('-d,--dev','is dev mode')
    command.option('-p,--port <port>', 'port default 7799')
    this.command = command
  }

  // async start(devMode,port=7799) {
    // const devServer = new DevServer({ context: this.context,devMode,devServer:{port:parseInt(port)} })
    // await devServer.start({
    //   waitUntilValid: (app, devServer) => {
    //     log.info(
    //       `🌍 HSpider-Dev-Server now listen at: 0.0.0.0:${devServer.port}, watching...`
    //     )
    //     open(`http://0.0.0.0:${devServer.port}`)
    //   },
    // })
  // }
  
  async do() {
    // const { dev, port } = this.command.opts()
    // this.start(dev,port)
  }
}

export default DevCommand
