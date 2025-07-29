import { useState } from 'react';

import { Button, ButtonGroup, Content, Dialog, Divider, Flex, Form, Grid, Heading, ToggleButton, View } from '@geti/ui';
import { ChevronDownLight, ChevronUpLight } from '@geti/ui/icons';

import { API_BASE_URL } from '../../api/client';
import { SchemaMediaItem } from '../../api/openapi-spec';
import { Annotations } from '../../components/stream/annotations-canvas';
import { Annotation } from '../../components/stream/types';
import { ZoomProvider } from '../../components/zoom/zoom';
import { ZoomTransform } from '../../components/zoom/zoom-transform';
import { useFilteredItems } from './gallery';

export const ImageAnnotations = ({
    mediaItem,
    isFocussed = false,
    asThumbnail = false,
    scale = 0.9,
}: {
    mediaItem: SchemaMediaItem;
    isFocussed?: boolean;
    asThumbnail?: boolean;
    scale?: number;
}) => {
    const size = { width: mediaItem.width, height: mediaItem.height };
    const annotations: Array<Annotation> = mediaItem.predictions.annotations;
    const src = asThumbnail
        ? `${API_BASE_URL}/api/data-collection/${mediaItem.image}/image-thumbnail`
        : `${API_BASE_URL}/api/data-collection/${mediaItem.image}/image`;

    return (
        <ZoomProvider initialScale={1.0}>
            <ZoomTransform target={size}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateAreas: 'innercanvas',
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <div style={{ gridArea: 'innercanvas' }}>
                        <img src={src} width={mediaItem.width} height={mediaItem.height} alt='Collected data' />
                    </div>
                    <div style={{ gridArea: 'innercanvas' }}>
                        <Annotations
                            annotations={annotations}
                            width={size.width}
                            height={size.height}
                            isFocussed={isFocussed}
                        />
                    </div>
                </div>
            </ZoomTransform>
        </ZoomProvider>
    );
};

export const InspectDialog = ({
    mediaItem,
    close,
    onSelectMedia,
    onNext,
    onPrevious,
}: {
    mediaItem: SchemaMediaItem;
    close: () => void;

    onSelectMedia: (media: SchemaMediaItem) => void;
    onNext: () => void;
    onPrevious: () => void;
    onAccept: () => void;
    onDecline: () => void;
    onDelete: () => void;
}) => {
    const size = { width: mediaItem.width, height: mediaItem.height };
    const annotations: Array<Annotation> = mediaItem.predictions.annotations;
    const items = useFilteredItems();
    const [isFocussed, setIsFocussed] = useState(false);

    return (
        <Dialog
            size='L'
            UNSAFE_className='hoi'
            UNSAFE_style={{
                width: '95vw',
                height: '95vh',
                //'--spectrum-dialog-padding': '0',
            }}
        >
            <Heading>Preview</Heading>
            <Divider />
            <Content>
                <View height='100%'>
                    <Grid
                        areas={['toolbar aside', 'canvas aside', 'footer aside']}
                        width={'100%'}
                        height='100%'
                        UNSAFE_style={{
                            backgroundColor: 'var(--spectrum-global-color-gray-50)',
                            border: 'thin solid var(--spectrum-global-color-gray-50)',
                            boxSizing: 'border-box',
                            gridTemplateRows: 'auto 1fr auto',
                            gridTemplateColumns: '1fr auto',
                        }}
                    >
                        <View gridArea={'aside'} backgroundColor={'gray-200'} padding='size-200' width={'size-1600'}>
                            <Flex direction='column' justifyContent={'space-between'} height='100%' gap='size-200'>
                                <Button onPress={onPrevious} style='fill' staticColor='white'>
                                    <ChevronUpLight />
                                </Button>
                                <View UNSAFE_style={{ overflowY: 'scroll' }}>
                                    {items.map((item) => {
                                        return (
                                            <img
                                                key={item.image}
                                                src={`${API_BASE_URL}/api/data-collection/${item.image}/prediction-thumbnail`}
                                                width='96px'
                                                height='96px'
                                                style={{
                                                    objectFit: 'cover',
                                                    border:
                                                        item.image === mediaItem.image
                                                            ? '3px solid var(--energy-blue)'
                                                            : undefined,
                                                    boxSizing: 'border-box',
                                                }}
                                                onClick={() => onSelectMedia(item)}
                                            />
                                        );
                                    })}
                                </View>
                                <Button onPress={onNext} style='fill' staticColor='white'>
                                    <ChevronDownLight />
                                </Button>
                            </Flex>
                        </View>
                        <View
                            gridArea={'footer'}
                            backgroundColor={'gray-100'}
                            padding='size-100'
                            UNSAFE_style={{ textAlign: 'right' }}
                        >
                            {mediaItem.width}px x {mediaItem.height}px
                        </View>
                        <View gridArea={'toolbar'} backgroundColor={'gray-100'} padding='size-200'>
                            <Flex height={'100%'} alignItems={'center'} justifyContent={'space-between'}>
                                <ButtonGroup>
                                    <Button variant='secondary' onPress={close}>
                                        Decline
                                    </Button>
                                    <Button variant='secondary' onPress={close}>
                                        Accept
                                    </Button>
                                </ButtonGroup>

                                <ButtonGroup>
                                    <ToggleButton isEmphasized isSelected={isFocussed} onChange={setIsFocussed}>
                                        Focus
                                    </ToggleButton>
                                </ButtonGroup>
                            </Flex>
                        </View>
                        <View gridArea={'canvas'} backgroundColor={'gray-50'}>
                            <ImageAnnotations mediaItem={mediaItem} isFocussed={isFocussed} />
                        </View>
                    </Grid>
                </View>
            </Content>
        </Dialog>
    );
};
