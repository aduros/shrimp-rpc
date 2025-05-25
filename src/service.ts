type IsValidParams<T> = T extends object | unknown[] | undefined ? true : false

type ValidateMethod<T> = T extends (params: infer P) => unknown
  ? IsValidParams<P> extends true
    ? T
    : (params: object | unknown[]) => unknown
  : (params: object | unknown[]) => unknown

/**
 * Type definition for RPC service methods.
 *
 * @template Methods - Object type defining service methods with proper parameter validation
 */
export type Service<
  Methods extends {
    [K in keyof Methods]: ValidateMethod<Methods[K]>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = Record<string, (params: any) => unknown>,
> = Methods
