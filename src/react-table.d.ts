declare module 'react-table' {
  export const useTable: any;
  export const useSortBy: any;
  export const useFilters: any;
  export const useGlobalFilter: any;
  export const usePagination: any;
  export const useRowSelect: any;
  export const useColumnOrder: any;
  export const useExpanded: any;
  export interface Column {
    Header: string | React.ReactNode;
    accessor: string | Function;
    id?: string;
    Cell?: any;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
  }
} 