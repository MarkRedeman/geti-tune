import { useSelectedData, useSetMediaState } from "../../routes/data-collection/provider";

export function useHandlers() {
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

    return {
        onDelete,
        onDecline,
        onAccept,
    };
}
