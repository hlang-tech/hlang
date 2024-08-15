import Parser from "../complier";
import * as runScript from "runscript";
import nunjucks = require("nunjucks");
import { debug } from "../utils";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_DIR_NAME = "HLANG_BUILD";

const packageJSONTpl = `
  {
    "name": "test",
    "version": "0.0.0",
    "description": "",
    "main": "lib/index.js",
    "type": "lib/index.d.ts",
    "scripts": {},
    "author": "",
    "license": "MIT",
    "dependencies": {
      "@hset/xlang-runtime-middleware": "latest",
      {% for item in deps %}
      "{{ item.name }}": "{{ item.version }}"{%if loop.index < loop.length %},{% endif %}
      {% endfor %}
    },
    "devDependencies": {}
  }
`;

export default async function build(graph): Promise<string> {
  const { graphInfo, id, options = {} } = graph;
  const { dirName = DEFAULT_DIR_NAME } = options;
  const tmpDir = os.tmpdir();
  const baseDir = path.join(tmpDir, dirName);

  debug("parser product baseDir", baseDir);
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }
  const { target, deps } = Parser(graphInfo, id, options);

  debug("parser output target", target);
  debug("parser output deps", deps);
  const packageJSON = nunjucks.renderString(packageJSONTpl, { deps: deps });
  const entry = path.resolve(baseDir, "index.js");
  fs.writeFileSync(path.resolve(baseDir, "package.json"), packageJSON);
  fs.writeFileSync(entry, target);
  await runScript("npm install --registry=https://registry.npmmirror.com", {
    cwd: baseDir,
  });

  return entry;
}
