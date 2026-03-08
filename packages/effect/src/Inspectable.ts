import { format } from 'effect/Formatter';
import { NodeInspectSymbol } from 'effect/Inspectable';

export abstract class Inspectable {
  abstract toJSON(): unknown;

  toString(): string {
    return format(this.toJSON(), { ignoreToString: true, space: 2 });
  }

  [NodeInspectSymbol](): unknown {
    return this.toJSON();
  }
}
