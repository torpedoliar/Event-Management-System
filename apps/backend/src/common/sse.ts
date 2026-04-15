import { EventEmitter } from 'events';

export type ServerEvent =
  | { type: 'checkin'; data: any }
  | { type: 'uncheckin'; data: any }
  | { type: 'config'; data: any }
  | { type: 'preview'; data: any | null }
  | { type: 'prize_draw'; data: any }
  | { type: 'prize_reset'; data: any }
  | { type: 'guest-update'; data: any }
  | { type: 'souvenir_given'; data: any }
  | { type: 'souvenir_removed'; data: any }
  | { type: 'souvenir_reset'; data: any }
  | { type: 'prize_collected'; data: any }
  | { type: 'prize_uncollected'; data: any }
  | { type: 'guest_created_souvenir'; data: any }
  | { type: 'event_change'; data: any }
  | { type: 'sync_complete'; data: any };

const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

export function emitEvent(ev: ServerEvent) {
  emitter.emit('event', ev);
}

export function onEvent(listener: (ev: ServerEvent) => void) {
  const wrapped = (ev: ServerEvent) => listener(ev);
  emitter.on('event', wrapped);
  return () => emitter.off('event', wrapped);
}
