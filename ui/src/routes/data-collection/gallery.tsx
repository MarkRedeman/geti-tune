import { useState } from 'react';

import { AriaComponentsListBox, DialogContainer, GridLayout, ListBoxItem, Size, View, Virtualizer } from '@geti/ui';

import { $api, API_BASE_URL } from '../../api/client';
import { SchemaMediaItem } from '../../api/openapi-spec';
import { InspectDialog } from './inspect-dialog';
import { useMediaState, useSelectedData } from './provider';

import classes from './media-items-list.module.scss';

const MediaItem = ({ item, size, selectItem }: { item: SchemaMediaItem; size: Size; selectItem: () => void }) => {
    const annotationState = useMediaState().get(item.image);
    const isRejected = annotationState === 'rejected';
    const isAccepted = annotationState === 'accepted';
    const src = `${API_BASE_URL}/api/data-collection/${item.image}/prediction-thumbnail`;

    return (
        <ListBoxItem
            id={item.image}
            textValue={item.image}
            style={{
                display: 'grid',
                placeItems: 'center',
                height: '100%',
            }}
            className={[classes.mediaItem, isRejected ? classes.rejected : '', isAccepted ? classes.accepted : ''].join(
                ' '
            )}
        >
            <img
                key={src}
                src={src}
                alt={item.text_content}
                style={{
                    width: item.width,
                    maxWidth: '100%',
                    maxHeight: `${size.height}px`,
                }}
                onDoubleClick={selectItem}
            />
        </ListBoxItem>
    );
};

export const useFilteredItems = () => {
    const { mediaState, filters } = useSelectedData();
    const { data: data } = $api.useSuspenseQuery('get', '/api/data-collection');

    return data.items.filter((item) => {
        const state = mediaState.get(item.image);

        if (state === 'deleted') {
            return false;
        }

        if (filters.hidePending && (state === 'pending' || state === undefined)) {
            return false;
        }

        if (filters.hideAccepted && state === 'accepted') {
            return false;
        }

        if (filters.hideRejected && state === 'rejected') {
            return false;
        }
        return true;
    });
};

export const Gallery = ({
    maxColumns = 8,
    size = new Size(345 - 18, 198 - 12),
    gap = 8,
}: {
    maxColumns?: number;
    size?: Size;
    gap?: number;
}) => {
    const [selectedMediaItem, setSelectedMediaItem] = useState<null | SchemaMediaItem>(null);
    const { selectedKeys, setSelectedKeys } = useSelectedData();

    const config = { minItemSize: 150, gap, maxColumns };
    const layoutOptions = {
        minSpace: new Size(config.gap, config.gap),
        minItemSize: size,
        maxColumns: config.maxColumns,
        preserveAspectRatio: true,
    };

    const items = useFilteredItems();

    return (
        <View UNSAFE_className={classes.mainContainer}>
            <Virtualizer layout={GridLayout} layoutOptions={layoutOptions}>
                <AriaComponentsListBox
                    //ref={ref}
                    className={classes.container}
                    layout='grid'
                    selectionMode='multiple'
                    escapeKeyBehavior='clearSelection'
                    onSelectionChange={setSelectedKeys}
                    selectedKeys={selectedKeys}
                >
                    {items.map((item) => {
                        return (
                            <MediaItem
                                item={item}
                                key={item.image}
                                size={size}
                                selectItem={() => setSelectedMediaItem(item)}
                            />
                        );
                    })}
                </AriaComponentsListBox>
            </Virtualizer>

            <DialogContainer onDismiss={() => setSelectedMediaItem(null)}>
                {selectedMediaItem !== null && (
                    <InspectDialog mediaItem={selectedMediaItem} close={() => setSelectedMediaItem(null)} />
                )}
            </DialogContainer>
        </View>
    );
};
