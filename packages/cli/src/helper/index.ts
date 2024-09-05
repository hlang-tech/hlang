import path from 'path'
import fs from 'fs'
import self from './self'
import log from './log'

export {
  self,
  log
};

const XLANG_CONFIG_FILE_NAME = 'conf.json'

export const getRootPath = ()=>{
  const current = process.cwd()
  const isRoot = fs.existsSync(path.join(current, XLANG_CONFIG_FILE_NAME))
  const rootPath = isRoot ? current : path.resolve(current, '../')

  return rootPath
}