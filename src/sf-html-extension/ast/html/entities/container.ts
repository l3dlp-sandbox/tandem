import { inject } from "sf-core/decorators";
import { BubbleBus } from "sf-core/busses";
import { DocumentFile } from "sf-front-end/models";
import { disposeEntity } from "./utils";
import { ContainerNode, INode } from "sf-core/markup";
import { PropertyChangeAction } from "sf-core/actions";
import { diffArray, patchArray } from "sf-core/utils/array";
import { IHTMLEntity, IHTMLContainerEntity } from "./base";
import { IHTMLContainerExpression, HTMLExpression } from "sf-html-extension/ast";
import { IDOMSection, NodeSection, GroupNodeSection } from "sf-html-extension/dom";
import { IInjectable, DEPENDENCIES_NS, Dependencies, EntityFactoryDependency, Injector } from "sf-core/dependencies";
import { IEntity, IContainerNodeEntity, EntityMetadata, IContainerNodeEntitySource, IEntityDocument } from "sf-core/ast/entities";

export abstract class BaseHTMLContainerEntity<T> extends ContainerNode implements IHTMLContainerEntity {

  readonly parent: IContainerNodeEntity;
  readonly root: IContainerNodeEntity;
  readonly children: Array<IHTMLEntity>;
  readonly metadata: EntityMetadata;
  readonly section: IDOMSection;

  private _document: DocumentFile<any>;

  @inject(DEPENDENCIES_NS)
  protected _dependencies: Dependencies;

  constructor(name: string, protected _source: T) {
    super(name);
    this.willSourceChange(_source);
    this.metadata = new EntityMetadata(this, this.getInitialMetadata());
    this.metadata.observe(new BubbleBus(this));
    this.section = this.createSection();
  }

  protected getInitialMetadata(): Object {

    // TODO - scan additional dependencies for metadata
    return {};
  }


  abstract load();
  protected abstract createSection();

  update() {
    for (const child of this.children) {
      (<IEntity>child).update();
    }
  }

  protected didUpdate() {

  }

  get document(): DocumentFile<any> {
    return this._document;
  }

  set document(value: DocumentFile<any>) {
    this._document = value;
    for (const child of this.children) {
      child.document = value;
    }
  }

  get source(): T {
    return this._source;
  }

  protected willSourceChange(value: T) {
    // override me
  }

  flatten(): Array<IEntity> {
    const flattened: Array<IEntity> = [this];
    for (const child of this.children) {
      flattened.push(...child.flatten());
    }
    return flattened;
  }

  dispose() {

  }

  patch(entity: BaseHTMLContainerEntity<T>) {
    this.willSourceChange(entity.source);
    this._source = entity._source;
    this._dependencies = entity._dependencies;
    const changes = diffArray(this.children, entity.children, (a, b) => a.constructor === b.constructor && a.name === b.name);
    for (const entity of changes.remove) {
      this.removeChild(entity);
    }
    for (const [currentChild, patchChild] of changes.update) {
      currentChild.patch(patchChild);
      const patchIndex = entity.children.indexOf(patchChild);
      const currentIndex = this.children.indexOf(currentChild);
      if (currentIndex !== patchIndex) {
        const beforeChild = this.children[patchIndex];
        if (beforeChild) {
          this.insertBefore(currentChild, beforeChild);
        } else {
          this.appendChild(currentChild);
        }
      }
    }

    for (const addition of changes.add) {
      const beforeChild = this.children[addition.index];
      if (beforeChild) {
        this.insertBefore(addition.value, beforeChild);
      } else {
        this.appendChild(addition.value);
      }
    }
  }

  insertDOMChildBefore(newChild: Node, beforeChild: Node) {
    this.section.targetNode.insertBefore(newChild, beforeChild);
  }

  appendDOMChild(newChild: Node) {
    this.section.appendChild(newChild);
  }

  _unlink(child: IHTMLEntity) {
    super._unlink(child);
    child.section.remove();
  }

  _link(child: IHTMLEntity) {
    child.document = this.document;
    super._link(child);
    if (child.section) {
      let nextHTMLEntitySibling: IHTMLEntity;
      do {
        nextHTMLEntitySibling = <IHTMLEntity>child.nextSibling;
      } while (nextHTMLEntitySibling && !nextHTMLEntitySibling.section);

      if (nextHTMLEntitySibling) {
        // TODO - this assumes that the next sibling has a section property - it
        // might not. Need to traverse the next sibling for a node that actually has a section
        const ppSection = (<IHTMLEntity>child.nextSibling).section;

        if (nextHTMLEntitySibling.section instanceof NodeSection) {
          this.insertDOMChildBefore(child.section.toFragment(), (<NodeSection>ppSection).targetNode);
        } else {
          this.insertDOMChildBefore(child.section.toFragment(), (<GroupNodeSection>ppSection).startNode);
        }
      } else {
        this.appendDOMChild(child.section.toFragment());
      }
    }
  }

  clone() {
    return Injector.inject(this._clone(), this._dependencies);
  }

  abstract _clone();
}

export abstract class HTMLContainerEntity<T extends IHTMLContainerExpression> extends BaseHTMLContainerEntity<T> implements IHTMLContainerEntity, IInjectable {

  readonly type: string = null;
  readonly name: string;
  readonly section: IDOMSection;

  constructor(source: T) {
    super(source.name.toUpperCase(), source);
    this.section = this.createSection();
    this.metadata.observe(new BubbleBus(this));
  }

  abstract createSection(): IDOMSection;

  async load() {
    for (const childExpression of await this.mapSourceChildNodes()) {
      const entity = EntityFactoryDependency.createEntityFromSource(childExpression, this._dependencies);
      this.appendChild(entity);
      await entity.load();
    }
  }

  protected mapSourceChildNodes() {
    return this.source.children;
  }

  static mapSourceChildren(source: IHTMLContainerExpression) {
    return source.children;
  }

  dispose() {
    disposeEntity(this);
  }
}