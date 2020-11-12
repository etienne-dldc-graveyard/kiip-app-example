import { DownMessage, UpMessage } from '@kiip/server-types';
import cuid from 'cuid';
import { EmitEvents, StateMachine } from 'stachine';
import { ResilientWebSocket } from '../kiip/ResilientWebsocket';

export type States =
  | { type: 'Error'; error: string }
  | { type: 'Void' }
  | { type: 'LoginMailRequested'; email: string }
  | { type: 'WaitingForLoginCode'; email: string; error?: string }
  | { type: 'ValidatingLoginCode'; email: string }
  | { type: 'LoggedIn' };

export type Events =
  | { type: 'RequestLoginMail'; email: string }
  | { type: 'LoginMailSend' }
  | { type: 'SetError'; error: string }
  | { type: 'SendLoginCode'; code: string }
  | { type: 'LoggedIn'; token: string }
  | { type: 'LoginCodeError' };

export type ConnectedMachine = StateMachine<States, Events>;

const { create, handle, compose, handleEvent, withEffect } = StateMachine.typed<States, Events>();

export function createConnectedMachine(
  socket: ResilientWebSocket<UpMessage, DownMessage>
): ConnectedMachine {
  function requestLoginMail(email: string, emit: EmitEvents<Events>) {
    const requestId = cuid();
    socket.send({ type: 'RequestLoginMail', email, requestId });
    return socket.on.MESSAGE((msg) => {
      if (msg.type === 'LoginEmailSend' && msg.requestId === requestId) {
        emit({ type: 'LoginMailSend' });
        return;
      }
      if (msg.type === 'UnauthorizedEmail' && msg.requestId === requestId) {
        emit({ type: 'SetError', error: 'UnauthorizedEmail' });
        return;
      }
      console.log(`Todo: Handle ${msg.type} ?`);
    });
  }

  return create(
    { type: 'Void' },
    compose(
      handleEvent('SetError', (event) => ({ type: 'Error', error: event.error })),
      handle('Void', 'RequestLoginMail', (event, state) => {
        return withEffect({ type: 'LoginMailRequested', email: event.email }, (emit) =>
          requestLoginMail(event.email, emit)
        );
      }),
      handle('Error', 'RequestLoginMail', (event, state) => {
        return withEffect({ type: 'LoginMailRequested', email: event.email }, (emit) =>
          requestLoginMail(event.email, emit)
        );
      }),
      handle('LoginMailRequested', 'LoginMailSend', (event, state) => ({
        type: 'WaitingForLoginCode',
        email: state.email,
      })),
      handle(['WaitingForLoginCode', 'LoginMailRequested'], 'RequestLoginMail', (event, state) => {
        if (state.email === event.email) {
          return null;
        }
        return withEffect({ type: 'LoginMailRequested', email: event.email }, (emit) =>
          requestLoginMail(event.email, emit)
        );
      }),
      handle('WaitingForLoginCode', 'SendLoginCode', (event, state, effect) => {
        return withEffect({ type: 'ValidatingLoginCode', email: state.email }, (emit) => {
          const requestId = cuid();
          socket.send({ type: 'LoginCode', requestId, code: event.code });
          return socket.on.MESSAGE((msg) => {
            if (msg.type === 'LoggedIn' && msg.requestId === requestId) {
              emit({ type: 'LoggedIn', token: msg.token });
            }
            if (msg.type === 'InvalidLoginCode' && msg.requestId === requestId) {
              emit({ type: 'LoginCodeError' });
            }
          });
        });
      })
    ),
    { debug: true }
  );
}
