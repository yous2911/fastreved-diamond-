declare module 'react' {
  export interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: Key | null;
  }

  export type ReactNode = ReactElement | string | number | boolean | null | undefined;
  export type Key = string | number;

  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;

  export interface FC<P = {}> {
    (props: P): ReactElement | null;
  }

  export interface ChangeEvent<T = Element> {
    target: T;
  }

  const React: {
    useState: typeof useState;
    useMemo: typeof useMemo;
    useEffect: typeof useEffect;
    useCallback: typeof useCallback;
    FC: typeof FC;
    ChangeEvent: typeof ChangeEvent;
  };
  
  export default React;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function Fragment(props: any): any;
}

declare namespace React {
  interface FC<P = {}> {
    (props: P): any;
  }
}

declare namespace JSX {
  interface Element {
    type: any;
    props: any;
    key: any;
  }

  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
