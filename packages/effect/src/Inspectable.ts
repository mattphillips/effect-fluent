import { format } from 'effect/Formatter';
import { NodeInspectSymbol } from 'effect/Inspectable';
import { Class as PipeableClass } from 'effect/Pipeable';

export abstract class Inspectable extends PipeableClass {
  abstract toJSON(): unknown;

  override toString(): string {
    return format(this.toJSON(), { ignoreToString: true, space: 2 });
  }

  [NodeInspectSymbol](): unknown {
    return this.toJSON();
  }
}
