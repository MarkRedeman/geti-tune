import { Button, ButtonGroup, Content, Dialog, Divider, Form, Heading } from '@geti/ui';

import { API_BASE_URL } from '../../api/client';
import { SchemaMediaItem } from '../../api/openapi-spec';
import { ZoomProvider } from '../../components/zoom/zoom';
import { ZoomTransform } from '../../components/zoom/zoom-transform';

export const InspectDialog = ({ mediaItem, close }: { mediaItem: SchemaMediaItem; close: () => void }) => {
    const size = { width: mediaItem.width, height: mediaItem.height };
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
                            <img
                                src={`${API_BASE_URL}/api/data-collection/${mediaItem.image}/prediction`}
                                width={mediaItem.width}
                                height={mediaItem.height}
                                alt='Collected data'
                            />
                        </ZoomTransform>
                    </Form>
                </ZoomProvider>
            </Content>
        </Dialog>
    );
};
