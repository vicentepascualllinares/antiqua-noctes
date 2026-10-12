import { rooms, type Room, type RoomId } from '@/config/site';
import { getPhotographs, getProducts, getReadings } from './collections';
import { getFilms } from './films';

export interface RoomState extends Room {
  count: number;
  /** Una estancia se abre sola en cuanto tiene algo dentro. */
  open: boolean;
}

export async function getRoomStates(): Promise<RoomState[]> {
  const counts: Record<RoomId, number> = {
    films: (await getFilms()).length,
    literature: (await getReadings()).length,
    photographs: (await getPhotographs()).length,
    shop: (await getProducts()).length,
  };
  return rooms.map((room) => ({ ...room, count: counts[room.id], open: counts[room.id] > 0 }));
}
