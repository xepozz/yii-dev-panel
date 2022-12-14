import * as React from 'react';
import {useEffect, useState} from 'react';
import {CommandType, useLazyGetCommandsQuery, useLazyRunCommandQuery} from '../API/Inspector';
import {Button, CircularProgress, Link, Typography} from '@mui/material';
import Box from '@mui/material/Box';
import {InfoBox} from '../../../Component/InfoBox';
import {EmojiObjects} from '@mui/icons-material';

type GroupedCommands = Record<string, CommandType[]>;
type CommandStatusMap = Record<
    string,
    {
        isLoading: boolean;
        response: null | any;
    }
>;
export const CommandsPage = () => {
    const [groupedCommands, setGroupedCommands] = useState<GroupedCommands>({});
    const [commandStatus, setCommandStatus] = useState<CommandStatusMap>({});

    const [getCommandsQuery] = useLazyGetCommandsQuery();
    const [runCommandsQuery] = useLazyRunCommandQuery();

    useEffect(() => {
        void (async () => {
            const response = await getCommandsQuery();

            if (response.data) {
                const groupedCommands: GroupedCommands = {};
                const commandStatus: CommandStatusMap = {};
                response.data.forEach((command) => {
                    if (command.group in groupedCommands) {
                        groupedCommands[command.group].push(command);
                    } else {
                        groupedCommands[command.group] = [command];
                    }
                    commandStatus[command.name] = {
                        isLoading: false,
                        response: null,
                    };
                });
                setCommandStatus(commandStatus);
                setGroupedCommands(groupedCommands);
            }
        })();
    }, []);

    const runCommand = async (command: CommandType) => {
        setCommandStatus((prev) => ({...prev, [command.name]: {...prev[command.name], isLoading: true}}));
        const response = await runCommandsQuery(command.name);
        setCommandStatus((prev) => ({...prev, [command.name]: {...prev[command.name], isLoading: false}}));
        console.log(response);
    };
    const commandEntries = Object.entries(groupedCommands as GroupedCommands);

    if (commandEntries.length === 0) {
        return (
            <InfoBox
                title="No commands found"
                text={
                    <>
                        <Typography>
                            Add a command to the "yiisoft/yii-debug-api" section into "params.php" on the backend to be
                            able to run the command from the Yii Dev Panel.
                        </Typography>
                        <Typography>
                            You may inspect the section with{' '}
                            <Link href="/inspector/parameters?filter=yiisoft/yii-debug-api">Inspector</Link>.
                        </Typography>
                        <Typography>
                            See more information on the link{' '}
                            <Link target="_blank" href="https://github.com/yiisoft/yii-debug-api">
                                https://github.com/yiisoft/yii-debug-api
                            </Link>
                            .
                        </Typography>
                    </>
                }
                severity="info"
                icon={<EmojiObjects />}
            />
        );
    }

    return (
        <>
            {commandEntries.map(([groupName, commands], index) => (
                <Box key={index}>
                    <h2>{groupName}</h2>
                    {commands.map((command, index) => (
                        <Button
                            key={index}
                            onClick={() => runCommand(command)}
                            disabled={commandStatus[command.name].isLoading}
                            endIcon={
                                commandStatus[command.name].isLoading ? (
                                    <CircularProgress size={24} color="info" />
                                ) : null
                            }
                        >
                            Run {command.title}
                        </Button>
                    ))}
                </Box>
            ))}
        </>
    );
};
