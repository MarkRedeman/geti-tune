import { Suspense } from 'react';

import {
    ButtonGroup,
    Checkbox,
    Content,
    DateRangePicker,
    Dialog,
    DialogTrigger,
    Form,
    Heading,
    Icon,
    Item,
    Menu,
    MenuTrigger,
    RangeSlider,
} from '@adobe/react-spectrum';
import { ActionButton, Button, Divider, Flex, Text, View } from '@geti/ui';
import { Delete, Filter } from '@geti/ui/icons';
import { parseZonedDateTime } from '@internationalized/date';

import { $api } from '../../api/client';
import { useFilteredItems } from './gallery';
import { useSelectedData, useSetMediaState } from './provider';

const DatasetFilters = () => {
    const { filters, setFilters } = useSelectedData();

    return (
        <Flex gap='size-200' alignItems='center'>
            <MenuTrigger>
                <ActionButton isQuiet>
                    <Icon>
                        <Filter />
                    </Icon>
                </ActionButton>
                <Menu
                    selectionMode='multiple'
                    selectedKeys={[
                        filters.hideAccepted ? 'hide-accepted' : null,
                        filters.hideRejected ? 'hide-rejected' : null,
                        filters.hidePending ? 'hide-pending' : null,
                    ].filter((x) => x !== null)}
                    onSelectionChange={(keys) => {
                        if (keys === 'all') {
                            setFilters({ hideAccepted: true, hideRejected: true, hidePending: true });
                            return;
                        }

                        setFilters({
                            hideAccepted: keys.has('hide-accepted'),
                            hideRejected: keys.has('hide-rejected'),
                            hidePending: keys.has('hide-pending'),
                        });
                    }}
                >
                    <Item key='hide-accepted'>Hide accepted</Item>
                    <Item key='hide-rejected'>Hide rejected</Item>
                    <Item key='hide-pending'>Hide pending</Item>
                </Menu>
            </MenuTrigger>

            <DateRangePicker
                width='size-6000'
                aria-label='Date range'
                defaultValue={{
                    start: parseZonedDateTime('2022-11-07T00:45[America/Los_Angeles]'),
                    end: parseZonedDateTime('2022-11-08T11:15[America/Los_Angeles]'),
                }}
            />
        </Flex>
    );
};
const DatasetInfo = () => {
    const data = $api.useSuspenseQuery('get', '/api/data-collection');
    const { selectedKeys } = useSelectedData();
    const selected = selectedKeys === 'all' ? data.data.items.length : selectedKeys.size;

    return (
        <Flex gap='size-200' alignItems='center'>
            {selected > 0 && (
                <>
                    <Text
                        UNSAFE_style={{
                            color: 'var(--spectrum-global-color-gray-700)',
                        }}
                    >
                        {selected} selected
                    </Text>

                    <Divider orientation='vertical' size='S' />
                </>
            )}

            <Text
                UNSAFE_style={{
                    color: 'var(--spectrum-global-color-gray-700)',
                }}
            >
                {data.data.total_items} images
            </Text>
        </Flex>
    );
};

const ExportButton = () => {
    const items = useFilteredItems();

    const { selectedKeys } = useSelectedData();
    const isSelected = selectedKeys === 'all' || selectedKeys.size > 0;

    return (
        <View>
            <DialogTrigger>
                <Button>{isSelected ? 'Export selected' : 'Export'}</Button>
                {(close) => (
                    <Dialog>
                        <Heading>Export data collection</Heading>

                        <Divider />

                        <Content>
                            <Form>
                                <Flex direction='column' gap='size-200' width='100%'>
                                    <RangeSlider
                                        isDisabled
                                        width='100%'
                                        label='Model confidence'
                                        defaultValue={{ start: 0, end: 33 }}
                                    />
                                    <Text>Do you want to export {items.length} images</Text>
                                </Flex>

                                <Checkbox isSelected>Include predictions</Checkbox>
                                <Checkbox isSelected>Include ground truth</Checkbox>
                            </Form>
                        </Content>
                        <ButtonGroup>
                            <Button variant='secondary' onPress={close}>
                                Cancel
                            </Button>
                            <Button variant='accent' onPress={close}>
                                Confirm
                            </Button>
                        </ButtonGroup>
                    </Dialog>
                )}
            </DialogTrigger>
        </View>
    );
};

const DataFilter = () => {
    const { selectedKeys, setSelectedKeys } = useSelectedData();
    const setMediaState = useSetMediaState();

    const onAccept = () => {
        setMediaState((map) => {
            const newMap = new Map(map.entries());

            if (selectedKeys === 'all') {
                //
                return newMap;
            }

            selectedKeys.forEach((mediaId) => {
                newMap.set(mediaId.toString(), 'accepted');
            });

            return newMap;
        });
        setSelectedKeys(new Set());
    };

    const onDecline = () => {
        setMediaState((map) => {
            const newMap = new Map(map.entries());

            if (selectedKeys === 'all') {
                //
                return newMap;
            }

            selectedKeys.forEach((mediaId) => {
                newMap.set(mediaId.toString(), 'rejected');
            });

            return newMap;
        });
        setSelectedKeys(new Set());
    };

    const onDelete = () => {
        setMediaState((map) => {
            const newMap = new Map(map.entries());

            if (selectedKeys === 'all') {
                //
                return newMap;
            }

            selectedKeys.forEach((mediaId) => {
                newMap.set(mediaId.toString(), 'deleted');
            });

            return newMap;
        });
        setSelectedKeys(new Set());
    };

    const isDisabled = selectedKeys !== 'all' && selectedKeys.size === 0;
    const isSelected = selectedKeys === 'all' || selectedKeys.size > 0;
    return (
        <View
            //backgroundColor={'gray-100'}
            //padding='size-400'
            UNSAFE_style={{
                fontSize: '12px',
                color: 'var(--spectrum-global-color-gray-800)',
            }}
        >
            <Flex height='100%' gap='size-100' alignItems={'center'}>
                <Checkbox
                    isSelected={isSelected}
                    onChange={(value) => {
                        if (value === false) {
                            setSelectedKeys(new Set());
                        } else {
                            setSelectedKeys('all');
                        }
                    }}
                />

                {isSelected && (
                    <>
                        <Divider orientation='vertical' size='S' />
                        <ButtonGroup>
                            <Button
                                variant='secondary'
                                onPress={onDelete}
                                isDisabled={isDisabled}
                                style='fill'
                                staticColor='white'
                            >
                                <Icon>
                                    <Delete />
                                </Icon>
                            </Button>

                            <Button variant='secondary' onPress={onDecline} isDisabled={isDisabled}>
                                Decline
                            </Button>

                            <Button variant='secondary' onPress={onAccept} isDisabled={isDisabled}>
                                Accept
                            </Button>
                        </ButtonGroup>
                    </>
                )}

                <View marginStart='auto'>
                    <Flex height='100%' gap='size-200' alignItems={'center'}>
                        <Suspense fallback={'Model: ...'}>
                            <DatasetInfo />
                        </Suspense>

                        <Divider orientation='vertical' size='S' />

                        {isSelected == false && <DatasetFilters />}

                        <ExportButton />
                    </Flex>
                </View>
            </Flex>
        </View>
    );
};

const CollectionCriteria = () => {
    return (
        <View>
            <Flex justifyContent={'space-between'} alignItems={'center'}>
                <View>
                    <Heading level={4} marginY='size-100'>
                        Confidence Threshold
                    </Heading>
                    <Text>Below 0.1</Text>
                </View>
                <View>
                    <Heading level={4} marginY='size-100'>
                        Drift score
                    </Heading>
                    <Text>Lorem ipsum</Text>
                </View>

                <View>
                    <Heading level={4} marginY='size-100'>
                        Test Rate
                    </Heading>
                    <Text>Check one frame every 10 seconds</Text>
                </View>

                <View>
                    <Heading level={4} marginY='size-100'>
                        Max Frames to Collect
                    </Heading>
                    <Text>5,000</Text>
                </View>
                <Flex height='100%' alignItems={'center'}>
                    <Button variant='secondary'>Edit collection criteria</Button>
                </Flex>
            </Flex>
        </View>
    );
};

export const Toolbar = () => {
    return (
        <View gridArea='toolbar' backgroundColor={'gray-50'} padding='size-200' paddingX='size-400'>
            <Flex direction='column' gap='size-200'>
                <CollectionCriteria />

                <Divider size='S' />

                <DataFilter />
            </Flex>
        </View>
    );
};
