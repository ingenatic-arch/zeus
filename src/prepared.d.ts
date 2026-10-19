/** The demos' prepared towns (scripts/prepared.ts): each demo's save text, loaded when that demo is opened. */
declare module 'virtual:prepared' {
  export const PREPARED: Record<string, () => Promise<{ default: string | null }>>;
}
