import { Suspense } from 'react';

import { Content, Dialog, DialogTrigger } from '@adobe/react-spectrum';
import { ActionButton, Button, Divider, Flex, Item, Picker } from '@geti/ui';

import { $api } from '../../api/client';
import { useWebRTCConnection } from '../../components/stream/web-rtc-connection-provider';
import { PipelineButtons } from '../pipeline';

const DebugTooltip = () => {
    const modelsQuery = $api.useSuspenseQuery('get', '/api/models');
    const inputMutation = $api.useMutation('post', '/api/inputs');
    const activeModelMutation = $api.useMutation('post', '/api/models/{model_name}:activate');

    const { start, stop } = useWebRTCConnection();

    return (
        <Flex gap='size-200' direction='column'>
            <Flex gap='size-200'>
                <Button onPress={start}>Start</Button>
                <Button onPress={stop}>Stop</Button>
            </Flex>

            <Divider size='S' />

            <Picker
                label='Select model for inference'
                selectedKey={modelsQuery.data.active_models}
                onSelectionChange={(model) => {
                    // if (model === null || !modelsQuery.data.available_models.some((name) => name === model)) {
                    //     return;
                    // }

                    activeModelMutation.mutate({
                        params: {
                            path: { model_name: String(model) },
                        },
                    });
                }}
            >
                {modelsQuery.data.available_models.map((model) => {
                    return (
                        <Item key={model.id} textValue={model.name}>
                            {model.name}
                        </Item>
                    );
                })}
            </Picker>

            <Divider size='S' />

            <Flex gap='size-200'>
                <Button
                    onPress={() => {
                        inputMutation.mutateAsync({
                            body: {
                                source_type: 'webcam',
                                device_id: 0,
                            },
                        });
                    }}
                >
                    Cam 0
                </Button>
                <Button
                    onPress={() => {
                        inputMutation.mutateAsync({
                            body: {
                                source_type: 'video_file',
                                video_path: 'data/media/video.mp4',
                            },
                        });
                    }}
                >
                    Video 1
                </Button>

                <Button
                    onPress={() => {
                        inputMutation.mutateAsync({
                            body: {
                                source_type: 'video_file',
                                video_path: 'data/media/video_long.mp4',
                            },
                        });
                    }}
                >
                    Video 2
                </Button>
            </Flex>
        </Flex>
    );
};

export const DebugTrigger = () => {
    return (
        <Suspense fallback={'Loading'}>
            <PipelineButtons />
            <DialogTrigger type='popover'>
                <ActionButton marginStart={'auto'}>Debug</ActionButton>
                <Dialog>
                    <Content>
                        <DebugTooltip />
                    </Content>
                </Dialog>
            </DialogTrigger>
        </Suspense>
    );
};
