// frontend/src/components/LottieAnimation.js
import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';

const LottieAnimation = ({ src, style }) => {
    if (!src) {
        return null;
    }

    return (
        <Player
            autoplay
            loop
            src={src}
            style={style || { height: '150px', width: '150px' }}
        />
    );
};

export default LottieAnimation;