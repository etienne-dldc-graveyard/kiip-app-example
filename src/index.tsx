import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { StateMachine } from 'stachine';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// ==========
// ==========
// ==========
// ==========
// ==========
// ==========

type States =
  | { type: 'Void' }
  | { type: 'Pending'; reqId: string }
  | { type: 'Resolved'; data: string }
  | { type: 'Rejected'; error: string };

type Events =
  | { type: 'Request' }
  | { type: 'Resolved'; data: string }
  | { type: 'Rejected'; error: string }
  | { type: 'Reset' }
  | { type: 'FatalError'; error: string };

const machine = new StateMachine<States, Events>(
  { type: 'Void' },
  {
    onEvent: {
      Request: {
        Void: (event, state, effect) => {
          effect((emit) => {
            let canceled = false;
            wait(3000).then(() => {
              if (!canceled) {
                emit({ type: 'Resolved', data: 'Hello' });
              }
            });
            return () => {
              canceled = true;
            };
          });
          return { type: 'Pending', reqId: '1234' };
        },
      },
      Resolved: {
        Pending: (event) => {
          return { type: 'Resolved', data: event.data };
        },
      },
      FatalError: (event) => {
        return { type: 'Rejected', error: event.error };
      },
    },
  },
  { debug: true }
);

console.log(machine.state);

machine.subscribe((state) => {
  console.log(state);
});

machine.emit({ type: 'Request' });
machine.emit({ type: 'FatalError', error: 'Oops' });

function wait(duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, duration);
  });
}
