// @Warning: 使用 npm run cf-add 将自动使用本内容模板生成命令行模块
// @@ 因此，不要改动和删除此文件 @@

const BC = ${'pkg'};

export default class ${'name'} extends BC {
  static command = "${'command'}"
  static alias = "${'alias'}"
  static description = "${'description'}"

  init (commander) {

  }

  async do () {
    await console.log('Hello World.')
  }
}
