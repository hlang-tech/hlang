
const entrypoint = process.env.XLANG_SERVER_ENTRYPOINT

if (!entrypoint) throw new Error('请在环境变量中设置 XLANG_SERVER_ENTRYPOINT')

export const HOST = entrypoint;