import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from 'react';

import { Selection } from '@geti/ui';

type AnnotationState = 'pending' | 'rejected' | 'accepted' | 'deleted';
// auto vs manual rejectoin
type MediaState = Map<string, AnnotationState>;
type Filters = {
    hidePending: boolean;
    hideAccepted: boolean;
    hideRejected: boolean;
};

type SelectedDataState = null | {
    selectedKeys: Selection;
    setSelectedKeys: Dispatch<SetStateAction<Selection>>;

    mediaState: MediaState;
    setMediaState: Dispatch<SetStateAction<MediaState>>;

    filters: Filters;
    setFilters: Dispatch<SetStateAction<Filters>>;
};

export const SelectedDataContext = createContext<SelectedDataState>(null);

export const SelectedDataProvider = ({ children }: { children: ReactNode }) => {
    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
    const [mediaState, setMediaState] = useState<MediaState>(new Map());
    const [filters, setFilters] = useState<Filters>({
        hideAccepted: false,
        hidePending: false,
        hideRejected: false,
    });

    const value = { selectedKeys, setSelectedKeys, mediaState, setMediaState, filters, setFilters };

    return <SelectedDataContext.Provider value={value}>{children}</SelectedDataContext.Provider>;
};

export const useSelectedData = () => {
    const context = useContext(SelectedDataContext);

    if (context === null) {
        throw new Error('useSelectedData was used outside of SelectedDataProvider');
    }

    return context;
};

export const useMediaState = () => {
    const context = useContext(SelectedDataContext);

    if (context === null) {
        throw new Error('useSelectedData was used outside of SelectedDataProvider');
    }

    return context.mediaState;
};

export const useSetMediaState = () => {
    const context = useContext(SelectedDataContext);

    if (context === null) {
        throw new Error('useSelectedData was used outside of SelectedDataProvider');
    }

    return context.setMediaState;
};
