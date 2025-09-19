// проект/frontend/src/components/LottieAnimation.js
import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';

const LottieAnimation = ({ src, animationData, style }) => {

    if (!src && !animationData) {
        return null;
    }

    const source = src ? src : animationData;

    return (
        <Player
            autoplay
            loop
            src={source}
            style={style || { height: '150px', width: '150px' }}
        />
    );
};

export default LottieAnimation;