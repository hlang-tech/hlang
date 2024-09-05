import path from 'path'
import ora from 'ora'
import updateNotifier from 'update-notifier'
import inquirer from 'inquirer'
import {execSync} from 'child_process'

const pkg = require(path.resolve(__dirname,'../package.json'))
const sleep = (t)=>{
  return new Promise((r,j)=>{
    setTimeout(()=>r(),t)
  })
}
  
async function checkVersion() {
  const notifier = updateNotifier({ pkg,updateCheckInterval: 0})
  let update = await Promise.race([notifier.fetchInfo(),sleep(3000)])
  // let update = await notifier.fetchInfo()
  notifier.config.set('update', update)
  if(update && update.type!=='latest'){
    notifier.notify({ defer:false,isGlobal:true })
    const answer = await inquirer.prompt([{
      type: 'list',
      message: '监测到 xlang-cli 有最新版本，是否需要更新:',
      name: 'shouldUpdate',
      choices: [
        'yes',
        'no',
      ],
    }])
    if(answer.shouldUpdate==='yes'){
      const spinnerInstall = ora('正在更新本地 hlang-cli...').start()
      execSync('npm i @hlang-org/cli -g',{stdio:'inherit'})
      spinnerInstall.succeed('xlang cli已更新完成， 请重新执行命令')
      process.exit()
    }
  }
}

module.exports = checkVersion

