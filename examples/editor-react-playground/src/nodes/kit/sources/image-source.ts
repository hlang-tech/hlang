/**
 * Image Source (R): a media asset. To the runtime it is a plain source — it
 * emits its image reference (params.imageUrl) on its Output. editor-ui dresses
 * it as a framed photograph (AssetNode) purely from these params; the runtime
 * contract is unchanged (an R with an output port).
 */

import { defineNode } from '../../define-node';
import { rt, paramsOf, asCtor } from '../../runtime-boundary';
import type { INodeConstructionOptions, RuntimePortLike } from '../../runtime-boundary';

class ImageSource extends rt.ReadableNode {
  constructor(opts: INodeConstructionOptions) {
    super(opts);
    rt.Port.O('Output').attach(this);
  }
  _read(o: (name: string) => RuntimePortLike): void {
    const params = paramsOf(this);
    const url = typeof params.imageUrl === 'string' ? params.imageUrl : '';
    // Emit the asset reference; downstream transforms consume it as a stream.
    o('Output').send(url);
  }
}

export const imageSource = defineNode({
  code: 'image-source',
  kind: 'R',
  displayName: 'Image',
  group: 'sources',
  defaultParams: { imageUrl: '', caption: 'Image', role: '' },
  ctor: asCtor(ImageSource),
});
