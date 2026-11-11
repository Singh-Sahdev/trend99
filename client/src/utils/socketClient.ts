import { io } from 'socket.io-client';

export async function initializeSocket() {

    const socket = io('http://127.0.0.1:8000', {
        transports: ['websocket'],
    });

    console.log('function heree');
    

    socket.on('connect', () => {
        console.log('socket connected');
    });

    socket.on('disconnect', () => {
        console.log('socket disconnected');
    });

    return socket;
}
