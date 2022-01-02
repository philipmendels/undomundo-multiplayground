import { Endomorphism } from "fp-ts/Endomorphism";
import { RelativePayloadConfig, AbsolutePayloadConfig } from "undomundo";

export type ID = string;

export type ObjWithId = {
  id: ID;
  [key: string]: unknown;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StringMap<T = any> = Record<string, T>;

export type Evolver<T> = {
  [K in keyof T]?: Endomorphism<T[K]>;
};

export type Shape = "square" | "circle";

export type Vector = [number, number];

export type Block = {
  shape: Shape;
  position: Vector;
  id: ID;
};

export type State = {
  blocks: Record<ID, Block>;
};

export type PBT = {
  add: RelativePayloadConfig<Record<ID, Block | null>>;
  remove: RelativePayloadConfig<Record<ID, Block | null>>;
  setShape: AbsolutePayloadConfig<Record<ID, Shape>>;
  setPosition: AbsolutePayloadConfig<Record<ID, Vector>>;
  setPositionRelative: RelativePayloadConfig<Record<ID, Vector>>;
};

export type CustomBranchData = {
  name: string;
  color: string;
};
