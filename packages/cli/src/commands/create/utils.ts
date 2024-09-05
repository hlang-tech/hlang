import Hogan from 'hogan.js';
import fs from 'fs';
import path from 'path';
import Log from '../../helper/log';

const { readFileSync, readdirSync, unlinkSync } = fs

export const getFileExtensionName = filePath => filePath.split('.').slice(1)

export const getWriteInFilePath = filePath => filePath.split('.').slice(0, -1).join('.')

export const isTmpFile = (filePath) => {
  const extensionNames = getFileExtensionName(filePath)

  return extensionNames.includes('mustache')
}

export const handleTmpFile = (filePath, tmpFilehandler) => {
  const files = readdirSync(filePath)
  files.forEach((filename) => {
    const filedir = path.join(filePath, filename)
    // 根据文件路径获取文件信息，返回一个fs.Stats对象
    const st = fs.statSync(filedir)
    const isFile = st.isFile()// 是文件
    const isDir = st.isDirectory()// 是文件夹


    if (isFile && isTmpFile(filedir)) {
      Log.debug(`检测到${filedir}是模版文件,正在生成`)
      tmpFilehandler(filedir)
      Log.debug('完成mustache2js转换,删除mustache文件')
      unlinkSync(filedir)
    } else if (isDir) {
      handleTmpFile(filedir, tmpFilehandler)
    }
  })
}


export const compileFile = (filePath, renderParams) => {
  const tpl = readFileSync(filePath, 'utf-8')
  const compiler = Hogan.compile(tpl)

  return compiler.render(renderParams)
}

export const cloneDir = async (src, dst) => {
  // 读取目录
  const files = fs.readdirSync(src)

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i]
    const _src = `${src}/${fileName}`
    const _dst = `${dst}/${fileName}`
    const st = fs.statSync(_src)

    if (st.isFile()) {
      fs.copyFileSync(_src, _dst)
      Log.debug(`正在写入文件${_src}`)
    } else if (st.isDirectory()) {
      const exist = fs.existsSync(_dst)
      if (!exist) {
        fs.mkdirSync(_dst)
      }
      await cloneDir(_src, _dst)
    }
  }
}
