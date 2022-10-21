import * as React from 'react';
import {GridColDef, GridRenderCellParams, GridValidRowModel} from '@mui/x-data-grid';
import {useGetParametersQuery} from '../API/Inspector';
import {JsonRenderer} from '../../../Component/JsonRenderer';
import {DataTable} from '../../../Component/Grid';

const columns: GridColDef[] = [
    {field: '0', headerName: 'Name', width: 130},
    // { field: 'value', headerName: 'Value', width: 130 },
    {
        field: '1',
        headerName: 'Value',
        flex: 1,
        renderCell: (params: GridRenderCellParams) => <JsonRenderer key={params.id} value={params.value} />,
    },
];

export const ParametersPage = () => {
    const {data, isLoading} = useGetParametersQuery();

    if (isLoading) {
        return <>Loading..</>;
    }
    const isArray = Array.isArray(data);
    let rows = Object.entries(data || ([] as any));
    rows = rows.map((el) => ({0: el[0], 1: isArray ? Object.assign({}, el[1]) : el[1]})) as any;

    return (
        <>
            <h2>{'Parameters'}</h2>
            <div style={{height: 400, width: '100%'}}>
                <DataTable rows={rows as GridValidRowModel[]} getRowId={(row) => row[0]} columns={columns} />
            </div>
        </>
    );
};
