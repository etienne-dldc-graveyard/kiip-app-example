import { ResilientWebSocket, WebSocketState } from './ResilientWebsocket';
import { Subscription } from 'suub';
import { UpMessage } from '@kiip/server-types';

export type Documents = Array<{ id: string; title: string; access: Access }>;

export type Access = 'Owner' | 'Editor';

export type Document = {
  id: string;
  title: string;
  access: { [email: string]: Access };
};

type ClientState = { type: 'Void' } | { type: 'Connected' };

class ClientStateManager {
  private stateSub = Subscription<ClientState>();
  private internalState: ClientState = { type: 'Void' };

  onStateChange = this.stateSub.subscribe;
  set(state: ClientState) {
    this.internalState = state;
    this.stateSub.emit(this.internalState);
  }

  get state() {
    return this.internalState;
  }
}

export class KiipServerClient {
  private socket: ResilientWebSocket<UpMessage>;
  private _state: ClientStateManager = new ClientStateManager();

  onStateChange = this._state.onStateChange;

  constructor(url: string) {
    this.socket = new ResilientWebSocket<UpMessage>(url, {
      autoConnect: true,
      autoJsonify: true,
      reconnectInterval: 3000,
    });
    this.socket.onState(this.handleSocketStateChange);
  }

  get state() {
    return this._state.state;
  }

  private handleSocketStateChange = (state: WebSocketState) => {
    console.log(state);
    if (state === WebSocketState.Void) {
      this._state.set({ type: 'Void' });
      return;
    }
    if (state === WebSocketState.Connecting) {
      return;
    }
    if (state === WebSocketState.Connected) {
      this._state.set({ type: 'Connected' });
      return;
    }
  };

  login(email: string) {
    if (this._state.state.type === 'Void') {
      return;
    }
    this.socket.send({ type: 'RequestLoginMail', email, requestId: '12345' });
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
