import {
    Box,
    Button,
    ButtonGroup,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    ListSubheader,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import * as React from 'react';
import {useContext, useMemo, useState} from 'react';
import {StepProps} from './Step.types';
import {Context} from '../../Context/Context';
import {FieldValues, FormProvider, useForm, useFormContext} from 'react-hook-form';
import {mapErrorsToForm} from '../errorMapper';
import {GiiGenerator, usePostDiffMutation, usePostGenerateMutation} from '../../API/Gii';
import {yup} from '../../../../Adapter/yup';
import {FilePreviewDialog} from '../FilePreviewDialog';
import {FileOperationEnum, FileStateEnum, GiiFile} from '../../Types/FIle.types';
import {matchSeverityByFileState} from '../matchSeverity';
import {FileDiffDialog} from '../FileDiffDialog';

function getStateLabel(state: FileStateEnum) {
    let result = 'Unknown state';
    switch (state) {
        case FileStateEnum.PRESENT_SAME:
            result = 'Same';
            break;
        case FileStateEnum.PRESENT_DIFFERENT:
            result = 'Different';
            break;
        case FileStateEnum.NOT_EXIST:
            result = 'Not exist';
            break;
    }
    return result;
}

function createValidationSchema(files: GiiFile[]) {
    const rulesSet: Record<string, any> = {};
    files.map(({id}, index) => {
        rulesSet[id] = yup.number().required().oneOf([5, 6, 7]);
    });

    return yup.object(rulesSet);
}

type HandleClickOpenParams = (state: boolean) => void;

function FileAction({file, generator}: {file: GiiFile; generator: GiiGenerator}) {
    const context = useContext(Context);
    const form = useFormContext();
    const [value, setValue] = useState(form.getValues(file.id));
    const [openPreviewDialog, setOpenPreviewDialog] = React.useState(false);
    const [openDiffDialog, setOpenDiffDialog] = React.useState(false);
    const [diffQuery] = usePostDiffMutation();
    const [diff, setDiff] = useState('');

    const handlePreviewDialogOpen = () => {
        setOpenPreviewDialog(true);
    };
    const handlePreviewDialogClose = () => {
        setOpenPreviewDialog(false);
    };
    const handleDiffDialogOpen = () => {
        setOpenDiffDialog(true);
    };
    const handleDiffDialogClose = () => {
        setOpenDiffDialog(false);
    };

    const handleDiff = async () => {
        const response = await diffQuery({
            generator: generator.id,
            parameters: context.parameters,
            fileId: file.id,
        });
        console.log('response', response);
        // @ts-ignore
        setDiff(response.data.diff);
        handleDiffDialogOpen();
    };

    return (
        <>
            <ListItem>
                <ListItemText
                    primary={file.relativePath}
                    secondary={
                        <Typography component="span" color={matchSeverityByFileState(file.state) + '.main'}>
                            {getStateLabel(file.state)}
                        </Typography>
                    }
                />
                <ListItemSecondaryAction>
                    <Box mr={2} display="inline-block">
                        {file.state === FileStateEnum.NOT_EXIST ? (
                            <Button size="large" variant="contained" onClick={handlePreviewDialogOpen}>
                                Preview
                            </Button>
                        ) : file.state === FileStateEnum.PRESENT_DIFFERENT ? (
                            <Button size="large" variant="contained" onClick={handleDiff}>
                                Diff
                            </Button>
                        ) : null}
                    </Box>
                    <ToggleButtonGroup
                        value={value}
                        disabled={file.operation === FileOperationEnum.SKIP}
                        exclusive
                        onChange={(_, value) => {
                            setValue(value);
                            form.setValue(file.id, value);
                        }}
                    >
                        {Object.entries(context.operations).map(([index, operation]) => (
                            <ToggleButton key={index} value={index}>
                                {operation}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </ListItemSecondaryAction>
            </ListItem>
            <FilePreviewDialog file={file} open={openPreviewDialog} onClose={handlePreviewDialogClose} />
            <FileDiffDialog file={file} content={diff} open={openDiffDialog} onClose={handleDiffDialogClose} />
        </>
    );
}

export function GenerateStep({generator, onComplete}: StepProps) {
    const context = useContext(Context);
    // TODO: add validation
    // const validationSchema = createValidationSchema(context.files);

    console.log('context', context);
    const defaultValues = useMemo(() => {
        return Object.fromEntries(context.files.map((file) => [file.id, String(file.operation)]));
    }, [context.files]);

    const form = useForm({
        // mode: "onBlur",
        // resolver: yupResolver(validationSchema),
        defaultValues: defaultValues,
    });
    const [generateQuery] = usePostGenerateMutation();

    async function generateHandler(data: FieldValues) {
        console.log('generate', data, context.parameters);
        const response = await generateQuery({
            generator: generator.id,
            parameters: context.parameters,
            answers: data,
        });
        if ('error' in response) {
            console.log(response);
            mapErrorsToForm(response, form);
            return;
        }

        // @ts-ignore
        context.setResults(response.data);

        onComplete();
    }

    console.log(form);

    return (
        <>
            <FormProvider {...form}>
                <Box component="form" onReset={form.reset as any} onSubmit={form.handleSubmit(generateHandler)} my={2}>
                    <List subheader={<ListSubheader>Operations</ListSubheader>}>
                        {context.files.map((file, index) => (
                            <FileAction key={index} file={file} generator={generator} />
                        ))}
                    </List>

                    <Box my={2}>
                        <ButtonGroup>
                            <Button type="submit" name="generate" variant="contained">
                                Generate
                            </Button>
                            <Button type="reset" color="warning">
                                Reset
                            </Button>
                        </ButtonGroup>
                    </Box>
                </Box>
            </FormProvider>
        </>
    );
}
