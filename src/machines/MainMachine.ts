import { UpMessage, DownMessage } from "@kiip/server-types";
import { StateMachine } from "stachine";
import { ResilientWebSocket } from "../kiip/ResilientWebsocket";
import {
  ConnectedMachine,
  createConnectedMachine,
  Events as ConnectedMachineEvents,
} from "./ConnectedMachine";

export type States =
  | { type: "Void" }
  | { type: "Connecting" }
  | { type: "Connected"; machine: ConnectedMachine };

export type Events =
  | { type: "Disconnected" }
  | { type: "Connecting" }
  | { type: "Connected"; socket: ResilientWebSocket<UpMessage, DownMessage> }
  | { type: "ConnectedMachine"; event: ConnectedMachineEvents };

export type MainMachine = StateMachine<States, Events>;

export function createMainMachine(): MainMachine {
  return new StateMachine<States, Events>({
    initialState: { type: "Void" },
    debug: true,
    config: {
      Void: {
        on: {
          Connecting: () => ({ type: "Connecting" }),
          Connected: (event) => {
            const machine = createConnectedMachine(event.socket);
            return { type: "Connected", machine };
          },
        },
      },
      Connecting: {
        on: {
          Disconnected: () => ({ type: "Void" }),
          Connected: (event) => {
            const machine = createConnectedMachine(event.socket);
            return { type: "Connected", machine };
          },
        },
      },
      Connected: {
        effect: (state) => {
          return () => {
            state.machine.destroy();
          };
        },
        on: {
          Disconnected: () => ({ type: "Void" }),
          ConnectedMachine: (event, state) => {
            state.machine.emit(event.event);
            return state;
          },
          Connected: (event) => {
            const machine = createConnectedMachine(event.socket);
            return { type: "Connected", machine };
          },
        },
      },
    },

    // transitions: transition.compose(
    //   transition.on(
    //     { states: ['Void', 'Connecting', 'Connected'], event: 'Connected' },
    // (event) => {
    //   const machine = createConnectedMachine(event.socket);
    //   return { type: 'Connected', machine };
    // }
    //   ),
    //   transition.switchByStates({
    // Void: {
    //   Connecting: () => ({ type: 'Connecting' }),
    // },
    // Connecting: {
    //   Disconnected: () => ({ type: 'Void' }),
    // },
    // Connected: {
    //   Disconnected: () => ({ type: 'Void' }),
    //   ConnectedMachine: (event, state) => {
    //     state.machine.emit(event.event);
    //     return state;
    //   },
    // },
    //   })
    // ),
    // effects: {
    //   Connected: (state) => {
    //     return () => state.machine.destroy();
    //   },
    // },
  });
}
