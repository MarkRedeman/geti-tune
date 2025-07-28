import { Button, ButtonGroup, Content, Dialog, Divider, Form, Heading } from '@geti/ui';

import { API_BASE_URL } from '../../api/client';
import { SchemaMediaItem } from '../../api/openapi-spec';
import { Annotations } from '../../components/stream/annotations-canvas';
import { ZoomProvider } from '../../components/zoom/zoom';
import { ZoomTransform } from '../../components/zoom/zoom-transform';

export const InspectDialog = ({ mediaItem, close }: { mediaItem: SchemaMediaItem; close: () => void }) => {
    const size = { width: mediaItem.width, height: mediaItem.height };
    const annotations = mediaItem.json_content.annotations.map((annotation) => {
        return {
            ...annotation,
            shape: {
                ...annotation.shape,
                type: annotation.shape.shape_type === 'rect' ? 'bounding-box' : annotation.shape.shape_type,
            },
        };
    });
    console.log(annotations);
    return (
        <Dialog
            size='L'
            UNSAFE_style={{
                width: '95vw',
                height: '95vh',
            }}
        >
            <Heading>Inspect inference</Heading>
            <Divider />
            <ButtonGroup>
                <Button variant='negative' onPress={close}>
                    Delete
                </Button>
                <Button variant='secondary' onPress={close}>
                    Cancel
                </Button>
                <Button variant='accent' onPress={close}>
                    Save
                </Button>
            </ButtonGroup>
            <Content>
                <ZoomProvider>
                    <Form maxHeight={'100%'}>
                        <ZoomTransform target={size}>
                            <div
                                className="grid [grid-template-areas:'innercanvas'] w-full h-full items-center justify-items-center overflow-hidden"
                                style={{
                                    display: 'grid',
                                    gridTemplateAreas: 'innercanvas',
                                    width: '100%',
                                    height: '100%',
                                }}
                            >
                                <div style={{ gridArea: 'innercanvas' }}>
                                    <img
                                        src={`${API_BASE_URL}/api/data-collection/${mediaItem.image}/prediction`}
                                        width={mediaItem.width}
                                        height={mediaItem.height}
                                        alt='Collected data'
                                    />
                                </div>
                                <div style={{ gridArea: 'innercanvas' }}>
                                    <Annotations
                                        annotations={annotations}
                                        width={size.width}
                                        height={size.height}
                                        isFocussed={true}
                                    />
                                </div>
                            </div>
                        </ZoomTransform>
                    </Form>
                </ZoomProvider>
            </Content>
        </Dialog>
    );
};
