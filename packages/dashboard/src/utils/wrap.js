import { useCallback } from 'react';
export const wrapCallBack = uiObj => {
  return Object.keys(uiObj)
    .filter(el => uiObj.hasOwnProperty(el))
    .reduce((ret, el) => {
      const func = uiObj[el];

      return {
        ...ret,
        [el]: useCallback(func, [])
      }
    }, {});
}