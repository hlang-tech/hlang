import { createHash } from 'crypto';
import * as uid from 'uuid';
import * as _ from 'lodash';


export const uuid = () => {
  const md5 = createHash('md5');

  return md5.update(uid.v4()).digest('hex');
};

export const parseJSON = (json: string): {[key: string]: any}|string => {
  try { 
    if (!json) return {};
    return JSON.parse(json);
  } catch (e) {
    // throw new JsonParseError(e.message)
    return json;
  }
}
export const stringify = (json: {[key: string]: any} | string): string => {
  if (_.isString(json)) return json as string;
  return JSON.stringify(json)
}


export const diff = (last, next, key): {add: any, remove: any, update: any} => {
  const remove = _.differenceBy(last, next, key);
  const add = _.differenceBy(next, last, key);
  const update = _.intersectionBy(next, last, key);

  return {
    add, remove, update
  }
}