const host = {
  daily: {
    portal: '//portal.hemaos.com',
    // REX: '//midway.hemaos.com'
    REX: 'http://127.0.0.1:6001'

  },
  pre: {
    portal: '//portal.hemaos.com',
    REX: '//midway.hemaos.com'
  },
  prod: {
    portal: '//portal.hemaos.com',
    REX: '//pre-midway.hemaos.com'
  }
};

export default (env) => host[env];
