import * as React from 'react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Outlet} from 'react-router';
import {
    Alert,
    AlertTitle,
    Autocomplete,
    Box,
    Breadcrumbs,
    Button,
    CircularProgress,
    LinearProgress,
    Link,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {DebugEntry, useLazyGetCollectorInfoQuery, useLazyGetDebugQuery} from '../API/Debug';
import format from 'date-fns/format';
import {fromUnixTime} from 'date-fns';
import {useDispatch} from 'react-redux';
import {changeEntryAction, useDebugEntry} from '../Context/Context';
import {ErrorBoundary} from 'react-error-boundary';
import InboxIcon from '@mui/icons-material/Inbox';
import MailIcon from '@mui/icons-material/Mail';
import {useSearchParams} from 'react-router-dom';
import {DumpPage} from './DumpPage';
import {ErrorFallback} from '../../../Component/ErrorFallback';
import {FullScreenCircularProgress} from '../../../Component/FullScreenCircularProgress';
import {LinkProps, MenuPanel} from '../../../Component/MenuPanel';
import {InfoBox} from '../../../Component/InfoBox';
import {Check, EmojiObjects, Error, HelpOutline} from '@mui/icons-material';
import {useDoRequestMutation} from '../../Inspector/API/Inspector';
import {MiddlewarePanel} from '../Component/Panel/MiddlewarePanel';
import {EventPanel} from '../Component/Panel/EventPanel';
import {LogPanel} from '../Component/Panel/LogPanel';

function formatDate(unixTimeStamp: number) {
    return format(fromUnixTime(unixTimeStamp), 'do MMM hh:mm:ss');
}

function isDebugEntryAboutConsole(entry: any) {
    return entry && 'console' in entry;
}

function isDebugEntryAboutWeb(entry: any) {
    return entry && 'web' in entry;
}

function getEntryTarget(entry: any) {
    return isDebugEntryAboutWeb(entry) ? 'web' : isDebugEntryAboutConsole(entry) ? 'console' : 'unknown';
}

function parseCollectorName(text: string) {
    return text.replace('Yiisoft\\Yii\\Debug\\Collector\\', '');
}

type CollectorDataProps = {
    collectorData: any;
    selectedCollector: string;
};

function CollectorData({collectorData, selectedCollector}: CollectorDataProps) {
    const pages = {
        'Yiisoft\\Yii\\Debug\\Collector\\LogCollector': (data: any) => <LogPanel data={data} />,
        'Yiisoft\\Yii\\Debug\\Collector\\MiddlewareCollector': (data: any) => <MiddlewarePanel {...data} />,
        'Yiisoft\\Yii\\Debug\\Collector\\EventCollector': (data: any) => <EventPanel events={data} />,
        default: (data: any) => <DumpPage data={data} />,
    };

    if (selectedCollector === '') {
        return <Outlet />;
    }

    // @ts-ignore
    return (pages[selectedCollector] ?? pages['default'])(collectorData);
}

function HttpRequestError({error}: {error: any}) {
    console.error(error);
    return (
        <Box m={2}>
            <Alert severity="error">
                <AlertTitle>Something went wrong:</AlertTitle>
                <pre>{error?.toString() || 'unknown'}</pre>
            </Alert>
        </Box>
    );
}

function DebugEntryAutocomplete({data}: {data: DebugEntry[] | undefined}) {
    const dispatch = useDispatch();
    const debugEntry = useDebugEntry();

    const getOptions = useCallback(
        (entry: any) => {
            if (isDebugEntryAboutConsole(entry)) {
                return [
                    '[' + getEntryTarget(debugEntry) + ']',
                    formatDate(entry.console.request.startTime),
                    entry.command.input,
                ].join(' ');
            }
            if (isDebugEntryAboutWeb(entry)) {
                return [
                    '[' + getEntryTarget(debugEntry) + ']',
                    formatDate(entry.web.request.startTime),
                    entry.request.method,
                    entry.request.path,
                ].join(' ');
            }
            return entry.id;
        },
        [debugEntry],
    );

    return (
        <Autocomplete
            freeSolo
            value={debugEntry}
            options={(data || []) as DebugEntry[]}
            getOptionLabel={getOptions}
            renderOption={(props, option) => (
                <li {...props} key={option.id}>
                    {getOptions(option)}
                </li>
            )}
            renderInput={(params) => <TextField {...params} key={params.id} label="Record" />}
            onChange={(event, value) => {
                if (typeof value === 'object') {
                    dispatch(changeEntryAction(value));
                }
            }}
            sx={{my: 1}}
        />
    );
}

const Layout = () => {
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const [getDebugQuery, {data, isLoading, isSuccess}] = useLazyGetDebugQuery();
    const debugEntry = useDebugEntry();
    const [selectedCollector, setSelectedCollector] = useState<string>(searchParams.get('collector') || '');
    const [collectorData, setCollectorData] = useState<any>(undefined);

    const [collectorInfo, collectorQueryInfo] = useLazyGetCollectorInfoQuery();

    useEffect(() => {
        getDebugQuery();
    }, []);

    useEffect(() => {
        if (isSuccess && data && data.length) {
            const entry = data[0];
            dispatch(changeEntryAction(entry));
        }
    }, [isSuccess, data, dispatch]);

    useEffect(() => {
        const collector = searchParams.get('collector') || '';
        if (collector.trim() === '') {
            setSelectedCollector('');
            setCollectorData(null);
            return;
        }
        if (!debugEntry) {
            return;
        }
        collectorInfo({id: debugEntry.id, collector}).then(({data, isError}) => {
            if (isError) {
                dispatch(changeEntryAction(null));
                return;
            }
            setSelectedCollector(collector);
            setCollectorData(data);
        });
    }, [searchParams, debugEntry]);

    const collectorName = useMemo(() => selectedCollector.split('\\').pop(), [selectedCollector]);

    const links: LinkProps[] = useMemo(
        () =>
            !debugEntry
                ? []
                : debugEntry.collectors.map((collector, index) => ({
                      text: parseCollectorName(collector),
                      href: '/debug/?collector=' + collector,
                      icon: index % 2 === 0 ? <InboxIcon /> : <MailIcon />,
                  })),
        [debugEntry],
    );

    const [doRequest, doRequestInfo] = useDoRequestMutation();
    const repeatRequestHandler = useCallback(async () => {
        if (!debugEntry) {
            return;
        }
        try {
            await doRequest({id: debugEntry.id});
        } catch (e) {
            console.error(e);
        }
        getDebugQuery();
    }, [debugEntry]);

    if (isLoading) {
        return <FullScreenCircularProgress />;
    }

    if (data && data.length === 0) {
        return (
            <InfoBox
                title="No debug entries found"
                text={
                    <>
                        <Typography>Make sure you have enabled debugger and run your application.</Typography>
                        <Typography>
                            Check the "yiisoft/yii-debug" in the "params.php" on the backend or with{' '}
                            <Link href="/inspector/parameters?filter=yiisoft/yii-debug">Inspector</Link>.
                        </Typography>
                        <Typography>
                            See more information on the link{' '}
                            <Link target="_blank" href="https://github.com/yiisoft/yii-debug">
                                https://github.com/yiisoft/yii-debug
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
            <Breadcrumbs sx={{my: 2}}>
                <Link underline="hover" color="inherit" href="/debug">
                    Debug
                </Link>
                {!!collectorName && <Typography color="text.primary">{collectorName}</Typography>}
            </Breadcrumbs>
            <Tooltip title="Runs the request again">
                <Button
                    onClick={repeatRequestHandler}
                    disabled={!debugEntry || doRequestInfo.isLoading}
                    endIcon={
                        doRequestInfo.isLoading ? (
                            <CircularProgress size={24} color="info" />
                        ) : doRequestInfo.isUninitialized ? null : doRequestInfo.isSuccess ? (
                            <Check color="success" />
                        ) : (
                            <Error color="error" />
                        )
                    }
                >
                    Repeat Request
                </Button>
            </Tooltip>
            <DebugEntryAutocomplete data={data} />

            <MenuPanel links={links} open={!selectedCollector} activeLink={collectorName}>
                {selectedCollector ? (
                    <>
                        {collectorQueryInfo.isFetching && <LinearProgress />}
                        {collectorQueryInfo.isError && (
                            <HttpRequestError
                                error={(collectorQueryInfo.error as any)?.error || (collectorQueryInfo.error as any)}
                            />
                        )}
                        {collectorQueryInfo.isSuccess && (
                            <ErrorBoundary
                                FallbackComponent={ErrorFallback}
                                resetKeys={[window.location.pathname, window.location.search, debugEntry]}
                            >
                                <CollectorData selectedCollector={selectedCollector} collectorData={collectorData} />
                            </ErrorBoundary>
                        )}
                    </>
                ) : (
                    <InfoBox
                        title="No one collector is chosen"
                        text="Select a collector from the left side panel to see more options"
                        severity="info"
                        icon={<HelpOutline />}
                    />
                )}
            </MenuPanel>
        </>
    );
};
export {Layout};
