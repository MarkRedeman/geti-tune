import { CSSProperties, ReactNode, useId } from 'react';

import { AnnotationShape } from './annotation-shape';
import { Annotation } from './types';

function MaskAnnotations({
    annotations,
    children,
    width,
    height,
    isEnabled,
}: {
    annotations: Array<Annotation>;
    children: ReactNode;
    width: number;
    height: number;
    isEnabled: boolean;
}) {
    const id = useId();
    const maskOpacity = isEnabled ? 0.8 : 0.0;

    return (
        <>
            <mask id={`mask-${id}`}>
                <rect x='0' y='0' width={width} height={height} style={{ fill: 'white', fillOpacity: 1.0 }} />
                {annotations.map((annotation, idx) => (
                    <g
                        key={idx}
                        style={{
                            fill: 'black',
                            fillOpacity: isEnabled ? 1.0 : 0.0,
                            transitionProperty: 'fill-opacity',
                            transitionTimingFunction: 'ease-in-out',
                            transitionDuration: isEnabled ? '0.2s' : '0.1s',
                            transitionDelay: isEnabled ? '0s' : '.25s',
                        }}
                    >
                        <AnnotationShape annotation={annotation} />
                    </g>
                ))}
            </mask>
            <rect
                x={0}
                y={0}
                width={width}
                height={height}
                mask={`url(#mask-${id})`}
                style={{
                    fillOpacity: maskOpacity,
                    fill: 'black',
                    strokeWidth: 0,
                    transition: 'fill-opacity 0.1s ease-in-out',
                    transitionDelay: isEnabled ? '0s' : '.25s',
                    transitionDuration: isEnabled ? '0.2s' : '0.1s',
                }}
            />
            <g>{children}</g>
        </>
    );
}

const DEFAULT_ANNOTATION_STYLES = {
    //fillOpacity: 'var(--annotation-fill-opacity, 0.1)',
    fill: 'var(--annotation-fill)',
    fillOpacity: 0.4,
    stroke: 'var(--annotation-stroke)',
    strokeLinecap: 'round',
    strokeWidth: 'calc(1px / var(--zoom-scale))',
    strokeDashoffset: 0,
    strokeDasharray: 0,
    strokeOpacity: 'var(--annotation-border-opacity, 1)',
} satisfies CSSProperties;

export function Annotations({
    annotations,
    width,
    height,
    isFocussed,
}: {
    annotations: Array<Annotation>;
    width: number;
    height: number;
    isFocussed: boolean;
}) {
    return (
        <svg width={width} height={height} style={DEFAULT_ANNOTATION_STYLES}>
            <MaskAnnotations annotations={annotations} width={width} height={height} isEnabled={isFocussed}>
                {annotations.map((annotation, idx) => {
                    return <AnnotationShape key={idx} annotation={annotation} />;
                })}
            </MaskAnnotations>
        </svg>
    );
}
