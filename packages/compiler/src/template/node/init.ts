export default `
  async function init () {
    const setupMiddleware = require('@hset/xlang-runtime-middleware');
    const _xlang_buildInMiddleware = await (setupMiddleware.default || setupMiddleware)();

    return _xlang_buildInMiddleware;
  }
`;
