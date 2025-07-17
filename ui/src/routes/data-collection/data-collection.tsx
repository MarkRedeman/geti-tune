import { Grid, View } from '@geti/ui';

import { Gallery } from './gallery';
import { Toolbar } from './toolbar';

export const DataCollection = () => {
    return (
        <Grid
            areas={['toolbar', 'canvas']}
            UNSAFE_style={{
                gridTemplateRows: 'auto 1fr',
                gridTemplateColumns: 'auto min-content',
            }}
            height={'100%'}
            gap='1px'
        >
            <Toolbar />

            <View gridArea={'canvas'} paddingX='size-400'>
                <Gallery />
            </View>
        </Grid>
    );
};
