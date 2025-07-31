import { useEffect, useRef, useState } from 'react';

import {
    AriaComponentsListBox,
    DialogContainer,
    GridLayout,
    ListBoxItem,
    Size,
    ToggleButton,
    View,
    Virtualizer,
} from '@geti/ui';

import { $api, API_BASE_URL } from '../../api/client';
import { SchemaMediaItem } from '../../api/openapi-spec';
import { ImageAnnotations, InspectDialog } from './inspect-dialog';
import { useMediaState, useSelectedData } from './provider';
import { useHandlers } from './toolbar';

import classes from './media-items-list.module.scss';

const MediaItem = ({
    item,
    size,
    selectItem,
    isFocussed,
}: {
    item: SchemaMediaItem;
    size: Size;
    selectItem: () => void;
    isFocussed: boolean;
}) => {
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
                gridTemplateAreas: 'center',
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
                    gridArea: 'center',
                    display: 'none',
                }}
                onDoubleClick={selectItem}
            />
            <div
                onDoubleClick={selectItem}
                style={{
                    gridArea: 'center',
                    width: '365px',
                    height: '186px',
                    //width: item.width,
                    //maxWidth: '100%',
                    //maxHeight: `${size.height}px`,
                    //maxWidth: `${size.height}px`,
                }}
            >
                <ImageAnnotations mediaItem={item} asThumbnail isFocussed={isFocussed} />
            </div>
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

function Keybinding({
    onNext,
    onPrevious,
    onAccept,
    onDecline,
    onDelete,
}: {
    onNext: () => void;
    onPrevious: () => void;
    onAccept: () => void;
    onDecline: () => void;
    onDelete: () => void;
}) {
    // Create refs to always point to the latest callbacks
    const onNextRef = useRef(onNext);
    const onPreviousRef = useRef(onPrevious);
    const onAcceptRef = useRef(onAccept);
    const onDeclineRef = useRef(onDecline);
    const onDeleteRef = useRef(onDelete);

    // Update refs on every render
    onNextRef.current = onNext;
    onPreviousRef.current = onPrevious;
    onAcceptRef.current = onAccept;
    onDeclineRef.current = onDecline;
    onDeleteRef.current = onDelete;

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'ArrowLeft') {
                onPreviousRef.current();
            } else if (e.key === 'ArrowRight') {
                onNextRef.current();
            } else if (e.key === 'a' || e.key === 'A') {
                onAcceptRef.current();
            } else if (e.key === 'd' || e.key === 'D') {
                onDeclineRef.current();
            } else if (e.key === 'Delete') {
                onDeleteRef.current();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // Only run once on mount/unmount

    return null;
}

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
    const { selectedKeys, setSelectedKeys, setMediaState } = useSelectedData();

    const config = { minItemSize: 150, gap, maxColumns };
    const layoutOptions = {
        minSpace: new Size(config.gap, config.gap),
        minItemSize: size,
        maxColumns: config.maxColumns,
        preserveAspectRatio: true,
    };

    const items = useFilteredItems();
    const { onAccept, onDecline, onDelete } = useHandlers();
    const onNext = () => {
        const currentIndex = items.findIndex((item) => item.image === selectedMediaItem?.image);

        const nextMediaItem = items.find((_, idx) => {
            return idx > currentIndex;
        });

        if (nextMediaItem) {
            setSelectedMediaItem(nextMediaItem);
        }
    };
    const onPrevious = () => {
        const currentIndex = items.findIndex((item) => item.image === selectedMediaItem?.image);

        const previousMediaItem = items.findLast((_, idx) => {
            return idx < currentIndex;
        });

        if (previousMediaItem) {
            setSelectedMediaItem(previousMediaItem);
        }
    };

    const { isFocussed } = useSelectedData();

    return (
        <View UNSAFE_className={classes.mainContainer}>
            <Keybinding
                onAccept={onAccept}
                onDecline={onDecline}
                onDelete={onDelete}
                onNext={onNext}
                onPrevious={onPrevious}
            />
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
                                isFocussed={isFocussed}
                            />
                        );
                    })}
                </AriaComponentsListBox>
            </Virtualizer>

            <DialogContainer onDismiss={() => setSelectedMediaItem(null)}>
                {selectedMediaItem !== null && (
                    <InspectDialog
                        mediaItem={selectedMediaItem}
                        close={() => setSelectedMediaItem(null)}
                        onSelectMedia={setSelectedMediaItem}
                        onAccept={onAccept}
                        onDecline={onDecline}
                        onDelete={onDelete}
                        onNext={onNext}
                        onPrevious={onPrevious}
                    />
                )}
            </DialogContainer>
        </View>
    );
};
