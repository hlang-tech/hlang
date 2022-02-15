# Hlang


<br />
<br />

<p align="center">
  <img src="https://gw.alicdn.com/tfs/TB1FPEjVHY1gK0jSZTEXXXDQVXa-400-400.png" width="128" height="128" />
</p>

<br />
<br />

<br />
<br />

<p align="center">
<b style="font-size: 32px;line-height: 32px;">A Flow-based programming language for universal applications.</b>
<br />
<br />
<br />
<em>Hlang aims to make programming easier, faster and more comfortable. It avoids coding, repetition and frustration.</em>
<br />
<br />
</p>

<br />
<br />

---


### Feature

* 😊 基于 `Rxjs`，遵循 `FBP` 范式，因此可以获得强大的逻辑流编排能力，支持 `sub flow` 抽象，支持多 `Readable` 节点构成的 `Flow` 进行拓扑执行，支持循环节点等复杂逻辑节点，可以无缝对接 `Rxjs Operator` 进行复杂`网关逻辑`节点的开发
* 🚀 丰富的 `Node` 生态，`Node` 节点开发流程丝滑顺畅，配套成熟的开发者工具
* 👬 `Readable` | `Writable` | `Transform` 三种核心的 `Node` 类型，对熟悉 `Node.js Stream` 的开发者心智友好
* ✊ 生产环境配套支持，支持裸进程 `flow` 部署，配套 Node.js 服务端运行时 `Parser`，可以支持逼近 `AKKA` 的高可用特性

### 😊 How To Use

```javascript
const {
  Flow,
  ReadableNode,
  WriteableNode,
  TransformNode,
  Port,
} = require("@hspider/runtime");

const flowIns = new Flow();

class OneReadableNode extends ReadableNode {
  constructor() {
    super();
    Port.O("out").attach(this);
  }

  _read($o) {
    $o("out").send({ payload: "hello, world" });
  }
}

class OneTransformNode extends TransformNode {
  constructor() {
    super();

    Port.I("in").attach(this);
    Port.O("out").attach(this);
  }

  _transform($i, $o) {
    $i("in").on((payload) => {
      $o("out").send(payload);
    });
  }
}

class OneWriteableNode extends WriteableNode {
  constructor() {
    super();
    Port.I("in").attach(this);
  }

  _write($i) {
    $i("in").on(console.log);
  }
}

const $R = new OneReadableNode();
const $T = new OneTransformNode();
const $W = new OneWriteableNode();

$R.O("out").connect($T.I("in"));
$T.O("out").connect($W.I("in"));

flowIns.run($R);
```

