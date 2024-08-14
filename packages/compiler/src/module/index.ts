import { Env } from '../utils';
import loadModuleInNode from './node';
import loadModuleInBrowser from './browser';

export default function (deps, env) {
  switch (env) {
    case Env.NODE:
      return loadModuleInNode(deps);
    case Env.BROWSER:
      return loadModuleInBrowser(deps);
  }
}
