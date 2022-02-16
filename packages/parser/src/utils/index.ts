export enum Env {
  BROWSER = 'BROWSER',
  NODE = 'NODE',
}

export const getEnv = function () {
  return typeof window === 'undefined' ? Env.NODE : Env.BROWSER;
};

export const camelize = function (name: string) {
  return name.replace(/\_|\-(\w{1})/g, (str, match) => {
    return match ? match.toUpperCase() : str;
  });
};
