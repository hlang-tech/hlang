const envMap = {
  local: '127.0.0.1:7001',
  dev: 'elang.ennew.com',
  fat: 'elang.ennew.com',
  uat: 'elang.ennew.com',
  prod: 'elang.ennew.com'
}

const aclMap = {

}
export const acl = aclMap[window.env || 'local'];
export default window.location?.host || envMap[window.env || 'local'];