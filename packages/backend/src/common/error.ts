class EcmError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}


export class ParamValidateError extends EcmError {
  constructor(message: string) {
    super(VALIDATE_ERR.CLIENT_PARAM_VALIDATE_ERROR, message);
  }
}

export class JsonParseError extends EcmError {
  constructor(message: string) {
    super(JSON_ERR.JSON_PARSE_ERR, message);
  }
}

export class TransactionError extends EcmError {
  constructor(message: string) {
    super(DAO_ERR.TRANSACTION_ERROR, message);
  }
}

export class SendError extends EcmError {
  constructor(message: string) {
    super(NoticeError.SEND_FAIL, message);
  }
}

export class ChannelAuthError extends EcmError {
  constructor(message: string) {
    super(AUTHENTICATION_ERR.CHANNEL_AUTH_FAIL, message);
  }
}
export class NotFoundError extends EcmError {
  constructor(message: string) {
    super(CommonError.NOT_FOUND, message);
  }
}

export class StrategyError extends EcmError {
  constructor(message: string) {
    super(StrategyRuntimeError.STRATEGY_RUN_FAIL, message);
  }
}
export class GetUserError extends EcmError {
  constructor(message: string) {
    super(UserPostError.GET_USER_ERR, message);
  }
}


export enum AUTHENTICATION_ERR {
  CHANNEL_AUTH_FAIL = 'CHANNEL_AUTH_FAIL'
}


export enum VALIDATE_ERR {
  CLIENT_PARAM_VALIDATE_ERROR = 'CLIENT_PARAM_VALIDATE_ERROR'
}

export enum JSON_ERR {
  JSON_PARSE_ERR = 'JSON_PARSE_ERR'
}

export enum DAO_ERR {
  TRANSACTION_ERROR = 'TRANSACTION_ERROR'
}

export enum UserPostError {
  SEARCH_USER_POST = 'ERR_SEARCH_USER_POST',
  GET_USER_BY_POST = 'ERR_GET_USER_BY_POST',
  GET_DETAIL_POST_BY_POST_ID = 'ERR_GET_DETAIL_POST_BY_POST_ID',
  GET_USER_ERR = 'ERR_GET_USER',
}

export enum StrategyRuntimeError {
  STRATEGY_RUN_FAIL = 'STRATEGY_RUN_FAIL',
}

export enum CommonError {
  NOT_FOUND = 'NOT_FOUND',
}

export enum NoticeError {
  NOT_REGISTERED = 'NOT_REGISTERED',
  SCENE_NOT_FOUND = 'SCENE_NOT_FOUND',
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  CONTENT_TEMPLATE_NOT_FOUND = 'CONTENT_TEMPLATE_NOT_FOUND',
  PRODUCE_MSG_CONTENT_FAIL = 'PRODUCE_MSG_CONTENT_FAIL',
  SCHEDULE_EXPRESSION_NOT_REGISTERED = 'SCHEDULE_EXPRESSION_NOT_REGISTERED',
  SCHEDULE_RUN_EXPRESSION_ERR = 'SCHEDULE_RUN_EXPRESSION_ERR',
  SERIALIZ_FAIL = 'SERIALIZ_FAIL',
  RECEIVER_PARSE_ERR = 'ERR_PARSE_RECEIVER',
  CREATE_JOB_FAIL = 'CREATE_JOB_FAIL',
  GET_JOB_FAIL = 'GET_JOB_FAIL',
  SEND_FAIL = 'SEND_FAIL',
  UPDATE_JOB_FAIL = 'UPDATE_JOB_FAIL',
  VALIDATE_ERR = 'VALIDATE_ERR',
  TERMINAL_AUTHORITY_FAIL = 'TERMINAL_AUTHORITY_FAIL',
}

export enum ApiError {
  AUTHENTICATION_FAIL = 'AUTHENTICATION_FAIL',
}

export enum ToolError {
  SHORTEN_URL_ERR = 'ERR_SHORTEN_URL',
  DING_GROUP_TOOL_ERR = 'ERR_DING_GROUP',
}

export enum AclError {
  ACCESS_CONTROL_ERR = 'AccessControlServiceError',
}


