import Box from '@mui/material/Box';
import React, {cloneElement} from 'react';
import {Alert, Typography} from '@mui/material';

type InfoBoxProps = {
    text: string;
    title: string;
    severity: 'error' | 'info';
    icon: React.ReactElement;
};
export const InfoBox = ({text, title, icon, severity}: InfoBoxProps) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <>
                {cloneElement(icon, {sx: {my: 3, fontSize: 150}, color: severity})}
                <Typography component="h5" variant="h5" my={3}>
                    {title}
                </Typography>
                <Alert severity={severity}>{text}</Alert>
            </>
        </Box>
    );
};
