import { useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '../../api/client';
import { Annotation } from './types';

export function usePredictions(webrtcId: string, isActive: boolean) {
    const [predictions, setPredictions] = useState<Array<Annotation>>([]);
    const eventSourceRef = useRef<EventSource>(undefined);

    useEffect(() => {
        if (isActive) {
            return;
        }

        eventSourceRef.current = new EventSource(`${API_BASE_URL}/api/inference?webrtc_id=${webrtcId}`);

        const eventSource = eventSourceRef.current;
        const onEvent = function (event: MessageEvent) {
            try {
                const newPedictions = JSON.parse(event.data);
                setPredictions(newPedictions.annotations);
            } catch (e) {
                console.error(e);
            }
        };
        const onError = (e: Event) => {
            console.error(e);
        };

        eventSource.addEventListener('message', onEvent);
        eventSource.addEventListener('error', onError);

        return () => {
            eventSource.removeEventListener('message', onEvent);
            eventSource.removeEventListener('error', onError);
            eventSource.close();
        };
    }, [isActive, webrtcId]);

    return predictions;
}
