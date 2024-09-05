import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';


const YAML_CONFIG_FILENAME = (env) => `${env}.yaml`;
const env = process.env.NODE_ENV?.toLowerCase() || 'local';
export default () => yaml.load(
  readFileSync(join(__dirname, YAML_CONFIG_FILENAME(env)), 'utf8'),
) as Record<string, any>;