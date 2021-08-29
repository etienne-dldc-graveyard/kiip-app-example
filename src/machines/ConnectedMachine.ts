import { Documents, DownMessage, UpMessage } from "@kiip/server-types";
import { StateMachine } from "stachine";
import { ResilientWebSocket } from "../kiip/ResilientWebsocket";

const TOKEN_LOCALSTORAGE_KEY = "KIIP_TOKEN_V1";

export type States =
  | { type: "Error"; error: string }
  | { type: "Void" }
  | { type: "ValidatingToken"; token: string }
  | { type: "SendingLoginMail"; email: string }
  | { type: "WaitingForLoginCode"; email: string; loginId: string; error?: string }
  | { type: "ValidatingLoginCode"; email: string; loginId: string }
  | { type: "LoggedIn"; token: string; documents: Documents };

export type Events =
  | { type: "RequestLoginMail"; email: string }
  | { type: "SendLoginCode"; code: string };

export type ConnectedMachine = StateMachine<States, Events>;

export function createConnectedMachine(
  socket: ResilientWebSocket<UpMessage, DownMessage>
): ConnectedMachine {
  const machine = new StateMachine<States, Events>({
    initialState: { type: "Void" },
    config: {
      Void: {
        shortcuts: ["ValidatingToken"],
        effect: (_state, machine) => {
          const token = window.localStorage.getItem(TOKEN_LOCALSTORAGE_KEY);
          console.log({ token });
          if (token === null) {
            return;
          }
          socket.send({ type: "ValidateToken", token });
          machine.shortcut({ type: "ValidatingToken", token });
        },
        on: {
          RequestLoginMail: (event, state) => {
            socket.send({ type: "RequestLoginMail", email: event.email });
            return { type: "SendingLoginMail", email: event.email };
          },
        },
      },
      SendingLoginMail: {
        shortcuts: ["WaitingForLoginCode", "Error"],
        effect: (state, machine) => {
          return socket.on.MESSAGE({
            LoginEmailSend: (msg) => {
              machine.shortcut({
                type: "WaitingForLoginCode",
                email: state.email,
                loginId: msg.loginId,
              });
            },
            TooManyLogingAttempts: () => {
              machine.shortcut({ type: "Error", error: "TooManyLogingAttempts" });
            },
          });
        },
      },
      WaitingForLoginCode: {
        on: {
          SendLoginCode: (msg, state) => {
            socket.send({ type: "LoginCode", loginId: state.loginId, code: msg.code });
            return { type: "ValidatingLoginCode", email: state.email, loginId: state.loginId };
          },
        },
      },
      ValidatingLoginCode: {
        shortcuts: ["LoggedIn", "WaitingForLoginCode"],
        effect: (state, machine) => {
          return socket.on.MESSAGE({
            LoggedIn: ({ documents, token }) => {
              machine.shortcut({ type: "LoggedIn", documents, token });
            },
            InvalidToken: () => {
              machine.shortcut({
                type: "WaitingForLoginCode",
                email: state.email,
                loginId: state.loginId,
              });
            },
          });
        },
      },
      ValidatingToken: {
        shortcuts: ["LoggedIn"],
        effect: (_state, machine) => {
          return socket.on.MESSAGE({
            LoggedIn: ({ documents, token }) => {
              machine.shortcut({ type: "LoggedIn", documents, token });
            },
          });
        },
      },
      LoggedIn: {
        effect: (state) => {
          window.localStorage.setItem(TOKEN_LOCALSTORAGE_KEY, state.token);
        },
      },
    },

    // transitions: transition.compose(
    //   transition.on({ states: ['Void', 'Error'], event: 'RequestLoginMail' }, (event) => {
    //     const requestId = cuid();
    //     return { type: 'SendingLoginMail', email: event.email, requestId };
    //   }),
    //   transition.on(
    //     { states: ['WaitingForLoginCode', 'SendingLoginMail'], event: 'RequestLoginMail' },
    //     (event, state) => {
    //       if (state.email === event.email) {
    //         return null;
    //       }
    //       const requestId = cuid();
    //       return { type: 'SendingLoginMail', email: event.email, requestId };
    //     }
    //   ),
    //   transition.on({ state: 'SendingLoginMail', event: 'LoginEmailSend' }, (event, state) => {
    //     if (event.requestId !== state.requestId) {
    //       return null;
    //     }
    //     return { type: 'WaitingForLoginCode', email: state.email, loginId: event.loginId };
    //   }),
    //   transition.on({ state: 'WaitingForLoginCode', event: 'SendLoginCode' }, (event, state) => {
    //     const requestId = cuid();
    //     return {
    //       type: 'ValidatingLoginCode',
    //       email: state.email,
    //       loginId: state.loginId,
    //       code: event.code,
    //       requestId,
    //     };
    //   }),
    //   transition.on({ state: 'ValidatingLoginCode', event: 'InvalidLoginCode' }, (event, state) => {
    //     if (state.requestId !== event.requestId) {
    //       return null;
    //     }
    //     return {
    //       type: 'WaitingForLoginCode',
    //       email: state.email,
    //       loginId: state.loginId,
    //       error: 'Invalid Code',
    //     };
    //   }),
    //   transition.on({ state: 'ValidatingLoginCode', event: 'LoggedIn' }, (event, state) => {
    //     if (state.requestId !== event.requestId) {
    //       return null;
    //     }
    //     return {
    //       type: 'LoggedIn',
    //       email: state.email,
    //       token: event.token,
    //       documents: event.documents,
    //     };
    //   }),
    //   transition.onEvent('SetError', (event) => ({ type: 'Error', error: event.error }))
    // ),
    // effects: {
    //   ValidatingToken: (state) => {
    //     socket.send({ type: 'ValidateToken', requestId: state.requestId, token: state.token });
    //   },
    //   SendingLoginMail: (state) => {
    //     socket.send({ type: 'RequestLoginMail', email: state.email, requestId: state.requestId });
    //   },
    //   ValidatingLoginCode: (state) => {
    //     socket.send({
    //       type: 'LoginCode',
    //       requestId: state.requestId,
    //       code: state.code,
    //       loginId: state.loginId,
    //     });
    //   },
    //   LoggedIn: (state) => {
    //     window.localStorage.setItem(TOKEN_LOCALSTORAGE_KEY, state.token);
    //   },
    // },
    debug: true,
  });

  return machine;
}
