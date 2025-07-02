import { Dispatch, RefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

import { useWebRTCConnection } from '../../components/stream/web-rtc-connection-provider';
import { ZoomTransform } from '../zoom/zoom-transform';
import { usePredictions } from './use-predictions';

const useSetTargetSizeBasedOnVideo = (
    setSize: Dispatch<SetStateAction<{ width: number; height: number }>>,
    videoRef: RefObject<HTMLVideoElement | null>
) => {
    useEffect(() => {
        const video = videoRef.current;

        const onsize = video?.addEventListener('loadedmetadata', (event) => {
            const target = event.currentTarget as HTMLVideoElement;

            if (target.videoWidth && target.videoHeight) {
                setSize({ width: target.videoWidth, height: target.videoHeight });
            }
        });

        const onresize = video?.addEventListener('resize', (event) => {
            const target = event.currentTarget as HTMLVideoElement;

            if (target.videoWidth && target.videoHeight) {
                setSize({ width: target.videoWidth, height: target.videoHeight });
            }
        });

        return () => {
            if (onsize) {
                video?.removeEventListener('loadedmetadata', onsize);
            }

            if (onresize) {
                video?.removeEventListener('resize', onresize);
            }
        };
    }, [setSize, videoRef]);
};

const useStreamToVideo = () => {
    const videoRef = useRef<HTMLVideoElement>(null);

    const { status, webRTCConnectionRef } = useWebRTCConnection();

    const connect = useCallback(async () => {
        const videoOutput = videoRef.current;
        const webrtcConnection = webRTCConnectionRef.current;
        const peerConnection = webrtcConnection?.getPeerConnection();

        if (!peerConnection) {
            return;
        }

        const receivers = peerConnection.getReceivers() ?? [];
        const stream = new MediaStream(receivers.map((receiver) => receiver.track));

        if (videoOutput && videoOutput.srcObject !== stream) {
            videoOutput.srcObject = stream;
        }
    }, [videoRef, webRTCConnectionRef]);

    useEffect(() => {
        if (status === 'connected') {
            connect();
        }
    }, [status, connect]);

    useEffect(() => {
        const webrtcConnection = webRTCConnectionRef.current;
        const peerConnection = webrtcConnection?.getPeerConnection();

        if (!peerConnection) {
            return;
        }

        peerConnection.addEventListener('track', connect);

        return () => {
            peerConnection.removeEventListener('track', connect);
        };
    }, [webRTCConnectionRef, connect]);

    return videoRef;
};

export const Stream = ({
    size,
    setSize,
}: {
    size: { width: number; height: number };
    setSize: Dispatch<SetStateAction<{ width: number; height: number }>>;
}) => {
    const videoRef = useStreamToVideo();

    useSetTargetSizeBasedOnVideo(setSize, videoRef);
    const { status, webrtcConnectionRef } = useWebRTCConnection();

    const [isFocussed, setIsFocussed] = useState(false);

    const webrtcId = webrtcConnectionRef.current?.getId();
    const predictions = usePredictions(webrtcId ?? '', status === 'idle');

    return (
        <ZoomTransform target={size}>
            <div style={{ gridArea: 'innercanvas' }}>
                {status === 'connected' && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        width={size.width}
                        height={size.height}
                        controls={false}
                        style={{
                            background: 'var(--spectrum-global-color-gray-200)',
                        }}
                    />
                )}
            </div>
            <div style={{ gridArea: 'innercanvas' }}>
                <Annotations annotations={predictions} width={width} height={height} isFocussed={isFocussed} />
            </div>
        </ZoomTransform>
    );
};
