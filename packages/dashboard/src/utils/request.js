import { useReducer, useRef } from 'react';
import axios from 'axios';
import { Message } from '@alifd/next';
import * as _ from 'lodash';
import domain from '../config/domain';

class RequestError extends Error {
  constructor(code, message) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Set baseURL when debugging production url in dev mode
// axios.defaults.baseURL = '//xxxx.taobao.com';
/**
 * Method to make ajax request
 *
 * @param {object} options - axios config (https://github.com/axios/axios#request-config)
 * @return {object} response data
 */
export async function request(options, plugin = d => d) {
  try {
    const response = await axios(options);
    const { success, data, message, code } = plugin(response.data);
    if (!success) throw new EcmRequestError(code, message);
    return data;
  } catch (error) {
    if (error.code !== 'NO_PERMISSION') {
      showError(error.message);
    }

    throw error;
  }
}
const resultPlugin = res => {
  const { 
    data,
    success,
    code,
    message,
   } = res;

  if (!success) {
    return { data, error: { code, message } };
  }

  return { data };
}
export const flowRequest = async options => await request(options, resultPlugin);
export const createService = apis => {
  return Object.keys(apis).reduce((ret, el) => {
    const apiOptions = apis[el];
    const { method = 'get', url, restful = false, plugin} = apiOptions;
    const finalUrl = /^\/\w+.*/.test(url) ? `//${domain}${url}` : url;
    let reqFunc;
    switch (method.toUpperCase()) {
      case 'POST':
        reqFunc = args => request({ ...apiOptions, url: finalUrl, data: args }, plugin);
        break;
      case 'PUT': 
        reqFunc = args => request({ ...apiOptions, url: `${finalUrl}/${args.id}`, data: args }, plugin);
        break;
      case 'DELETE':
        reqFunc = args => request({ ...apiOptions, url: `${finalUrl}/${args.id || args}` }, plugin);
        break;        
      case 'GET':
      default:
        reqFunc = args => request({ ...apiOptions, url: restful ? `${finalUrl}/${args}` : finalUrl, params: restful ? {} : args }, plugin);      
        break;
    }

    return {
      ...ret,
      [el]: reqFunc
    }
  }, {});
}

/**
 * Hooks to make ajax request
 *
 * @param {object} options - axios config (https://github.com/axios/axios#request-config)
 * @return {object}
 *   @param {object} response - response of axios (https://github.com/axios/axios#response-schema)
 *   @param {object} error - HTTP or use defined error
 *   @param {boolean} loading - loading status of the request
 *   @param {function} request - function to make the request manually
 */
export function useRequest(service, handler = d => d) {
  const initialState = {
    success: false,
    response: undefined,
    loading: false,
    error: null,
  };
  const [state, dispatch] = useReducer(requestReducer, initialState);
  const lastCallId = useRef(0);
  /**
   * Method to make request manually
   * @param {object} config - axios config to shallow merged with options before making request
   * @return {object}
   *   @param {object} response - response of axios (https://github.com/axios/axios#response-schema)
   *   @param {object} error - HTTP or use defined error
   *   @param {boolean} loading - loading status of the request
   */
  async function request(param) {
    const callId = ++lastCallId.current;

    try {
      dispatch({
        type: 'init',
      });
      const data = await service(param);
      const response = handler(data);
      if (callId === lastCallId.current) {
        dispatch({
          type: 'success',
          response,
        });
      } 

      return {
        response,
        error: null,
        success: true,
        loading: false,
      };
    } catch (error) {
      showError(error.message);

      if (callId === lastCallId.current) {
        dispatch({
          type: 'error',
          error,
        });
      } 

      throw error;
    }
  }

  return [
    state.response,
    request,
    state.loading,
    state
  ];
}

/**
 * Reducer to handle the status of the request
 * @param {object} state - original status
 * @param {object} action - action of dispatch
 * @return {object} new status
 */
function requestReducer(state, action) {
  switch (action.type) {
    case 'init':
      return {
        success: false,
        repsonse: undefined,
        error: null,
        loading: true,
      };
    case 'success':
      return {
        success: true,
        response: action.response,
        error: null,
        loading: false,
      };
    case 'error':
      return {
        success: false,
        response: undefined,
        error: action.error,
        loading: false,
      };
    default:
      return {
        success: false,
        repsonse: undefined,
        error: null,
        loading: false,
      };
  }
}
/**
 * Display error message
 *
 * @param {string} errorMessage - error message
 */
function showError(errorMessage) {
  Message.show({
    type: 'error',
    title: '错误消息',
    content: errorMessage,
  });
}

