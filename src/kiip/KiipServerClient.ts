import { ResilientWebSocket, WebSocketState } from './ResilientWebsocket';
import { SubscribeMethod } from 'suub';
import { DownMessage, UpMessage } from '@kiip/server-types';
import {
  createMainMachine,
  MainMachine,
  States as MainMachineStates,
} from '../machines/MainMachine';

export type Documents = Array<{ id: string; title: string; access: Access }>;

export type Access = 'Owner' | 'Editor';

export type Document = {
  id: string;
  title: string;
  access: { [email: string]: Access };
};

export class KiipServerClient {
  private socket: ResilientWebSocket<UpMessage, DownMessage>;
  private machine: MainMachine;

  subscribe: SubscribeMethod<MainMachineStates>;
  getState: () => MainMachineStates;

  constructor(url: string) {
    this.socket = new ResilientWebSocket<UpMessage, DownMessage>(url, {
      autoConnect: true,
      autoJsonify: true,
      reconnectInterval: 3000,
    });
    this.socket.onState(this.handleSocketStateChange);

    this.machine = createMainMachine();

    this.subscribe = this.machine.subscribe;
    this.getState = this.machine.getState;
  }

  private handleSocketStateChange = (state: WebSocketState) => {
    console.log(state);
    if (state === WebSocketState.Void) {
      this.machine.emit({ type: 'Disconnected' });
      return;
    }
    if (state === WebSocketState.Connecting) {
      this.machine.emit({ type: 'Connecting' });
      return;
    }
    if (state === WebSocketState.Connected) {
      this.machine.emit({ type: 'Connected', socket: this.socket });
      return;
    }
  };

  login(email: string) {
    this.machine.emit({ type: 'ConnectedMachine', event: { type: 'RequestLoginMail', email } });
  }
}

// export class KiipServerClient {
//   readonly url: string;

//   constructor(url: string) {
//     this.url = url.endsWith('/') ? url.slice(0, -1) : url;
//   }

//   async home(): Promise<void> {
//     const res = await fetch(`${this.url}/`);
//     if (res.status !== 200) {
//       throw new Error('Fail');
//     }
//     return;
//   }

//   async requestLogin(email: string): Promise<string> {
//     const res = await fetch(`${this.url}/request-login`, {
//       method: 'post',
//       body: JSON.stringify({ email }),
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });
//     if (res.status !== 200) {
//       throw new Error('Fail');
//     }
//     const data: { loginId: string } = await res.json();
//     return data.loginId;
//   }

//   async validateLogin(email: string, loginId: string, loginCode: string): Promise<string> {
//     const res = await fetch(`${this.url}/validate-login`, {
//       method: 'post',
//       body: JSON.stringify({ email, loginId, loginCode }),
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });
//     if (res.status !== 200) {
//       throw new Error('Fail');
//     }
//     const data: { token: string } = await res.json();
//     return data.token;
//   }

//   async getDocuments(token: string): Promise<Documents> {
//     const res = await fetch(`${this.url}`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     if (res.status !== 200) {
//       throw new Error('Fail');
//     }
//     return await res.json();
//   }

//   async getDocument(token: string, docId: string): Promise<Document> {
//     const res = await fetch(`${this.url}/document/${docId}`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     if (res.status !== 200) {
//       throw new Error('Fail');
//     }
//     return await res.json();
//   }

//   async createDocument(token: string, title: string): Promise<void> {
//     const res = await fetch(`${this.url}/create-document`, {
//       method: 'post',
//       body: JSON.stringify({ title }),
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     console.log(res.status);
//   }
// }
