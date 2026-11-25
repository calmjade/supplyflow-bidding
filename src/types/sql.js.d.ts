declare module 'sql.js' {
  export interface BindParams {
    [key: string]: number | string | Uint8Array | null;
  }

  export type SqlValue = number | string | Uint8Array | null;

  export interface Statement {
    bind(values?: SqlValue[] | BindParams): boolean;
    step(): boolean;
    get(params?: SqlValue[] | BindParams): SqlValue[];
    getAsObject(params?: SqlValue[] | BindParams): Record<string, SqlValue>;
    free(): boolean;
    reset(): void;
  }

  export interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
  }

  export interface Database {
    run(sql: string, params?: SqlValue[] | BindParams): Database;
    exec(sql: string, params?: SqlValue[] | BindParams): QueryExecResult[];
    prepare(sql: string, params?: SqlValue[] | BindParams): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: {
      new (data?: ArrayLike<number> | Buffer | null): Database;
    };
  }

  export interface InitSqlJsConfig {
    locateFile?: (file: string, prefix?: string) => string;
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
}
