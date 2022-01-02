import { when } from "fp-ts-std/Function";
import { Endomorphism } from "fp-ts/Endomorphism";
import { pipe } from "fp-ts/function";
import { map, mapWithIndex } from "fp-ts/Record";

import { StringMap, Evolver, ID, ObjWithId } from "./models";

// non-recursive version
export const evolve =
  <S extends StringMap, E extends Evolver<S>>(evolver: E): Endomorphism<S> =>
  (state) => ({
    ...state,
    ...pipe(
      evolver as StringMap,
      mapWithIndex((k, updater) => {
        return updater(state[k]);
      })
    ),
  });

export const isIdInSelection =
  (selection: Record<ID, unknown>) =>
  <T extends ObjWithId>(item: T) =>
    Object.prototype.hasOwnProperty.call(selection, item.id);

export const updateSelected = <T extends ObjWithId>(
  selection: Record<ID, unknown>,
  whenTrueFn: (a: T) => T
) => map<T, T>(when(isIdInSelection(selection))(whenTrueFn));

export const mapPayloadToProp = <T extends ObjWithId, K extends keyof T>(
  payload: Record<ID, T[K]>,
  prop: K
) => updateSelected<T>(payload, (obj) => ({ ...obj, [prop]: payload[obj.id] }));
