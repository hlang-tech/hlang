import chalk from 'chalk'
import debugFactory from 'debug'
import is from 'is-type-of'

const cliDebug = debugFactory('HLANG-CLI')

export default {
  info: (...args) => console.log(chalk.green(args)),
  error: (...args) => console.log(chalk.red(args)),
  tag: (...args) => console.log(chalk.blue(args)),
  warning: (...args) => console.log(chalk.yellow(args)),
  debug: (...args) => cliDebug(`debug info: ${chalk.gray(args.map(el => is.primitive(el) ? el : JSON.stringify(el)))}`),
}