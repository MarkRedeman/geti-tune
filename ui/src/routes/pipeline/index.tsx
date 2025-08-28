import { Button, ButtonGroup, Divider, Flex, Grid, Heading, repeat, Text, View } from '@geti/ui';
import { capitalize, isArray, startsWith } from 'lodash-es';

import { $api } from '../../api/client';
import { paths } from '../../router';
import Background from './../../assets/background.png';

type FieldProps = {
    field: string;
    value: unknown;
};
const Field = ({ field, value }: FieldProps) => {
    if (!value) {
        return null;
    }

    // 'source_type' => 'Source type'
    const formattedField = capitalize(field.replace(/_/g, ' '));
    const isArrayType = startsWith(`${value}`, '[');

    return (
        <Flex direction={'column'}>
            <Heading level={4}>{formattedField}</Heading>
            <Text>{isArrayType ? `${value}`.replace(/[\[\]']+/g, '') : `${value}`}</Text>
        </Flex>
    );
};

export const Index = () => {
    // TODO: Replace this by /pipeline once available and maybe extract it to a hook
    const sources = $api.useQuery('get', '/api/sources');
    const sinks = $api.useQuery('get', '/api/sinks');
    const models = $api.useQuery('get', '/api/models');

    const pipelines = $api.useQuery('get', '/api/pipelines');
    const memory = $api.useQuery('get', '/api/system/metrics/memory');
    const health = $api.useQuery('get', '/health');

    const addPipeline = $api.useMutation('post', '/api/pipelines');
    const enablePipeline = $api.useMutation('post', '/api/pipelines/{pipeline_id}:enable');

    console.log({
        sources: sources.data,
        models: models.data,
        sinks: sinks.data,
        pipelines: pipelines.data,
        memory: memory.data,
        health: health.data,
    });

    return (
        <View
            backgroundColor={'gray-100'}
            UNSAFE_style={{
                backgroundImage: `url(${Background})`,
                backgroundBlendMode: 'luminosity',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
            }}
            gridArea={'content'}
            height='100%'
            width='100%'
        >
            <Button
                onPress={async () => {
                    const pipeline = await addPipeline.mutateAsync({
                        body: {
                            id: 'b2cd6575-c278-43ef-a49d-3fed7659871e',
                            name: 'Card detection',
                            status: 'idle',
                            model_id: '86845a3c-5f98-4aa1-ada5-fd111fad2d36',
                            sink_id: '3262eb47-1915-4e3a-8d7b-da60c1d24d7a',
                            //source_id: 'be5c5bb7-9fe6-4b0f-a2e8-29cc575c0202',
                            source_id: 'a0bab648-d4c9-442b-b517-5c23d346e699',
                        },
                    });

                    if (pipeline.id) {
                        enablePipeline.mutateAsync({
                            params: {
                                path: { pipeline_id: pipeline.id },
                            },
                        });
                    }
                }}
            >
                Submit pipeline
            </Button>
            <View maxWidth={'1048px'} marginX='auto' paddingY='size-800'>
                <View>
                    <Flex direction='column' gap='size-400'>
                        <Grid columns={repeat(3, '1fr')} rows={repeat(5, 'auto')} gap='size-400'>
                            <View>
                                <Heading level={1} marginBottom={'size-300'}>
                                    Source
                                </Heading>
                                <Flex direction={'column'} gap={'size-300'}>
                                    {sources.data?.map((item, idx) =>
                                        Object.entries(item).map(([field, value]) => (
                                            <Field key={field + idx} field={field} value={value} />
                                        ))
                                    )}
                                </Flex>
                            </View>
                            <View>
                                <Heading level={1} marginBottom={'size-300'}>
                                    Model
                                </Heading>
                                <Flex direction={'column'} gap={'size-300'}>
                                    {isArray(models.data) &&
                                        models.data.map((model) => (
                                            <Field key={model.id} field={model.name} value={model.format} />
                                        ))}
                                </Flex>
                            </View>
                            <View>
                                <Heading level={1} marginBottom={'size-300'}>
                                    Sink
                                </Heading>
                                <Flex direction={'column'} gap={'size-300'}>
                                    {sinks.data?.map((item, idx) =>
                                        Object.entries(item).map(([field, value]) => (
                                            <Field key={field + idx} field={field} value={value} />
                                        ))
                                    )}
                                </Flex>
                            </View>
                        </Grid>
                        <Divider size='S' />
                        <ButtonGroup>
                            <Button href={paths.pipeline.source({})} variant='secondary' marginStart='auto'>
                                Edit
                            </Button>
                        </ButtonGroup>
                    </Flex>
                </View>
            </View>
        </View>
    );
};
