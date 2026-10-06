import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socket';

export function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(() => getSocket());

  useEffect(() => {
    const s = getSocket();
    setSocket(s);
  }, []);

  return socket;
}

export { getSocket };
