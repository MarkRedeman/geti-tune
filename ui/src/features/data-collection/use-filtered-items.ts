import { $api } from "../../api/client";
import { useSelectedData } from "../../routes/data-collection/provider";

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
