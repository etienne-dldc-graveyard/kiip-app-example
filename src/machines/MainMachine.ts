import { UpMessage, DownMessage } from '@kiip/server-types';
import { StateMachine } from 'stachine';
import { ResilientWebSocket } from '../kiip/ResilientWebsocket';
import {
  ConnectedMachine,
  createConnectedMachine,
  Events as ConnectedMachineEvents,
} from './ConnectedMachine';

export type States =
  | { type: 'Void' }
  | { type: 'Connecting' }
  | { type: 'Connected'; machine: ConnectedMachine };

export type Events =
  | { type: 'Disconnected' }
  | { type: 'Connecting' }
  | { type: 'Connected'; socket: ResilientWebSocket<UpMessage, DownMessage> }
  | { type: 'ConnectedMachine'; event: ConnectedMachineEvents };

export type MainMachine = StateMachine<States, Events>;

export function createMainMachine(): MainMachine {
  return new StateMachine<States, Events>(
    { type: 'Void' },
    {
      onState: {
        Void: {
          Connecting: () => ({ type: 'Connecting' }),
          Connected: (event) => ({
            type: 'Connected',
            machine: createConnectedMachine(event.socket),
          }),
        },
        Connecting: {
          Connected: (event) => ({
            type: 'Connected',
            machine: createConnectedMachine(event.socket),
          }),
          Disconnected: () => ({ type: 'Void' }),
        },
        Connected: {
          Disconnected: () => ({ type: 'Void' }),
          ConnectedMachine: (event, state, effect) => {
            state.machine.emit(event.event);
            return state;
          },
        },
      },
    },
    { debug: true }
  );
}
