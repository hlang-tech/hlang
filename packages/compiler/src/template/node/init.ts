export default `
  async function init () {
    const setupMiddleware = require('@hset/xlang-runtime-middleware');
    const _hlang_buildInMiddleware = await (setupMiddleware.default || setupMiddleware)();

    return _hlang_buildInMiddleware;
  }
`;
