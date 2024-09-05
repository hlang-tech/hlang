import path from 'path'
import fs from 'fs'
import cp from 'child_process'
import OSS from 'ali-oss'
import runScript from 'runscript';
import axios from 'axios'
import semver from 'semver'
import Log from '../../helper/log'


const { execSync } = cp

const { readFileSync, writeFileSync } = fs
export interface INodeConf {
  name: string; 
  code: string; 
  type: string;
  group: string, 
  desc: string;
  metaData: {
    portConf: {[key: string]: any}
  }
}

class Publisher {
  ctx: any;
  runtimePath: string;
  editorPath: string;
  nodeConfFilePath: string;
  docFilePath: string;
  runtimePackagePath: string;
  editorPackagePath: string;
  ossDirPrefix: string;
  uploader: OSS;
  
  constructor(_options = {}, ctx = {}){
    this.ctx = ctx
    this.runtimePath =  path.resolve(this.ctx.cwd,'@runtime')
    this.editorPath = path.resolve(this.ctx.cwd, '@editor')
    this.docFilePath = path.resolve(this.runtimePath, 'doc.json')
    this.nodeConfFilePath = path.resolve(this.ctx.cwd, 'conf.json')
    this.runtimePackagePath = path.resolve(this.runtimePath, 'package.json')
    this.editorPackagePath = path.resolve(this.editorPath, 'package.json')

    const accessKey = process.env.HLANG_ALIYUN_ACCESS_KEY_ID
    const accessSecret = process.env.HLANG_ALIYUN_ACCESS_KEY_SECRET
    
    const endpoint = process.env.HLANG_ALIYUN_OSS_ENDPOINT
    const bucket = process.env.HLANG_ALIYUN_OSS_BUCKET
    this.ossDirPrefix = process.env.HLANG_OSS_DIR_PREFIX || ''

    if (!accessKey) throw new Error('请在环境变量中设置 HLANG_ALIYUN_ACCESS_KEY_ID')
    if (!accessSecret) throw new Error('请在环境变量中设置 HLANG_ALIYUN_ACCESS_KEY_SECRET')
    if (!endpoint) throw new Error('请在环境变量中设置 HLANG_ALIYUN_OSS_ENDPOINT')
    if (!bucket) throw new Error('请在环境变量中设置 HLANG_ALIYUN_OSS_BUCKET')

    this.uploader = new OSS({
      region: endpoint,
      accessKeyId: accessKey,
      accessKeySecret: accessSecret,
      bucket
    })
    
  }

  upgradeVersion(versionTag: string) {
    const runtimeJSON = JSON.parse(readFileSync(this.runtimePackagePath, 'utf-8'))
    const editorJSON = JSON.parse(readFileSync(this.editorPackagePath, 'utf-8'))
    const currentVersion = runtimeJSON.version;
    let newVersion: string;
    if (versionTag === 'prerelease') {
      newVersion = semver.inc(currentVersion, versionTag, 'beta');
    } else {
      newVersion = semver.inc(currentVersion, versionTag);
    }
    runtimeJSON.version = newVersion;
    editorJSON.version = newVersion;

    writeFileSync(
      this.runtimePackagePath,
      JSON.stringify(runtimeJSON, null, 4),
      {
        encoding: 'utf-8'
      }
    )

    writeFileSync(
      this.editorPackagePath,
      JSON.stringify(editorJSON, null, 4),
      {
        encoding: 'utf-8'
      }
    )
    Log.tag(`升级版本号至 ${newVersion}`)
    return newVersion;
  }

  async publishNPM() {
    Log.debug('正在发布 runtime...')   
    await runScript('npm publish', {
      cwd: this.runtimePath,
    })
    Log.debug(`完成 runtime 发布!`)
  }

  async run(versionTag: string, commitMsg: string) {
    const newVersion = this.upgradeVersion(versionTag);
    // await this.publishNPM();
    const fileMap = await this.uploadAssets(newVersion)
    await this.syncToConsole({
      version: newVersion,
      attrAsset: fileMap,
      commitMsg
    });
  } 

  private getNodeInfo(): INodeConf {
    const nodeConfFilePath = path.resolve(this.ctx.cwd, 'conf.json')
    const nodeConf = JSON.parse(readFileSync(nodeConfFilePath, 'utf-8'))

    return {
      ...nodeConf,
      code: nodeConf.id
    }
  }

  private getCurrentUser(){
    const res = execSync('npm whoami')
    return typeof res === 'object'? res.toString(): res
  }

  // private attachMetaInfo({ attrAsset, npmInfo }, node_info ){
  //   Object.assign(node_info.metaData,{ attrAsset, npmInfo })
  // }

  async syncToConsole({ version, attrAsset, commitMsg }){
    Log.debug('正在同步控制台...')    
    const { name, code, type, group, metaData } = this.getNodeInfo()
    const { portConf } = metaData
    const modifier = this.getCurrentUser()

    const entrypoint = process.env.HLANG_SERVER_ENTRYPOINT;
    if (!entrypoint) throw new Error('请在环境变量中设置 HLANG_SERVER_ENTRYPOINT ')
 
    Log.debug(`当前发布者：${modifier}`)

    try{
      await axios.post(`${entrypoint}/node/publish`,{
        name, 
        code, 
        type, 
        editorResource: attrAsset, 
        groupCode: group, 
        runtimeResource: `${name}@${version}`, 
        portInfo: portConf,
        commitMsg
      })
    }catch(e) {
      Log.error('节点信息同步失败')
      throw e
    }
    Log.info('节点信息同步完成')
  }


  private listFilesRecursively(directoryPath) {
    let files: string[] = [];
  
    const readDirectory = (dir) => {
      const entries = fs.readdirSync(dir);
      for (let entry of entries) {
        const entryPath = path.join(dir, entry);
        if (fs.statSync(entryPath).isDirectory()) {
          readDirectory(entryPath);
        } else {
          files.push(entryPath);
        }
      }
    };
  
    readDirectory(directoryPath);
    return files;
  }


   async uploadAssets(version) {
    Log.debug('正在发布 editor 资源...')
    const editorJSON = JSON.parse(readFileSync(this.editorPackagePath, 'utf-8'))
    const { name } = editorJSON;
    const uploadedConf = {}
    const files = this.listFilesRecursively(path.resolve(this.editorPath, 'dist'))
    for(let filePath of files) {
      const fileName = path.basename(filePath)
      Log.debug(`正在发布 editor ${fileName}`)
      const result = await this.uploader.put(`${this.ossDirPrefix}${name}/${version}/${fileName}`, filePath)
  
      uploadedConf[fileName] = result.url
    }
  
    Log.debug(`完成 editor 发布!`)
    return uploadedConf
  }
}

export default Publisher