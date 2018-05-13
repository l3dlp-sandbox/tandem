export type UIDGenerator = () => string;
// export type ChecksumGenerator<TObject> = (value: TObject) => string;

export const createUIDGenerator = <TObject>(seed: string, index: number = 0) => {
  return () => seed + index++;
};