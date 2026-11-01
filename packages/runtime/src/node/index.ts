import Node from './node';
import ReadableNode from './readable';
import WriteableNode from './writeable';
import TransformNode from './transform';

/** A node of one of the three kinds, told apart by its `type`. */
export type AnyNode = ReadableNode<object> | TransformNode<object> | WriteableNode<object>;

export type { NodeOptions, PortAccessor, Teardown } from './node';
export default Node;
export { ReadableNode, WriteableNode, TransformNode };
