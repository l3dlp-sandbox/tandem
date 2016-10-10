
import { Metadata } from "@tandem/common/metadata";
import { IASTNode } from "@tandem/common/lang";
import { EntityFactoryDependency } from "@tandem/common/dependencies";
import { IInjectable, Dependencies } from "@tandem/common/dependencies";
import { IDisposable, IOwnable, IValued, IRemovable, INamed, IPatchable, IComparable } from "@tandem/common/object";

import {
  ITreeNode
} from "@tandem/common/tree";

export class EntityMetadata extends Metadata implements IOwnable {
  constructor(readonly owner: IEntity, data?: any) {
    super(data);
  }
}

export class EntityContext {
  constructor(readonly document: IEntityDocument, readonly dependencies: Dependencies) {

  }
}

export interface IEntityDocument extends IOwnable {
}

export interface IEntity extends ITreeNode<IEntity>, IDisposable, IInjectable, IComparable {
  document: IEntityDocument;
  readonly parent: IEntity;
  readonly metadata: EntityMetadata;
  readonly source: IASTNode;
  context: any;

  /**
   */

  evaluate(context: any): any;

  /**
   */

  flatten(): Array<IEntity>;
}
