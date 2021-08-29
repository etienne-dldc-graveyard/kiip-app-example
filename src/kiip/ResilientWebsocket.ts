import { Subscription } from "suub";

export interface OnCallback {
  (arg: any): void;
}

export interface ResilientWebSocketOptions {
  // stringify/parse message, invalid json messages are ignored
  autoJsonify?: boolean;
  autoConnect?: boolean;
  reconnectInterval?: number;
  reconnectOnError?: boolean;
  wsFactory?: WebSocketFactory;
}

const DEFAULT_WS_FACTORY: WebSocketFactory = (url: string) => new WebSocket(url);

export const DEFAULT_OPTIONS: Required<ResilientWebSocketOptions> = {
  autoJsonify: false,
  autoConnect: true,
  reconnectInterval: 1000,
  reconnectOnError: true,
  wsFactory: DEFAULT_WS_FACTORY,
};

export enum WebSocketEvent {
  CONNECTED = "connected",
  MESSAGE = "message",
  CONNECTING = "connecting",
  CLOSE = "close",
  ERROR = "error",
}

export enum WebSocketState {
  Void = "Void",
  Connecting = "Connecting",
  Connected = "Connected",
}

export interface WebSocketFactory {
  (url: string): WebSocket;
}

export type UnionBase = { type: string };

export type MessagesHandlers<DownMessage extends UnionBase> = {
  [K in DownMessage["type"]]?: (message: Extract<DownMessage, { type: K }>) => void;
};

export class ResilientWebSocket<UpMessage extends UnionBase, DownMessage extends UnionBase> {
  private socket: WebSocket | null = null;
  private _state: WebSocketState = WebSocketState.Void;

  private readonly url: string;
  private readonly options: Required<ResilientWebSocketOptions>;

  private readonly stateSub = Subscription<WebSocketState>() as Subscription<WebSocketState>;
  private readonly subs = {
    CONNECTED: Subscription(),
    MESSAGE: Subscription<DownMessage>() as Subscription<DownMessage>,
    CONNECTING: Subscription(),
    CLOSE: Subscription() as Subscription<CloseEvent | undefined>,
    ERROR: Subscription(),
  } as const;

  private onMessage = (handlers: MessagesHandlers<DownMessage>) => {
    return this.subs.MESSAGE.subscribe((msg) => {
      const handler = handlers[msg.type as DownMessage["type"]];
      if (handler) {
        handler(msg as any);
      }
    });
  };

  readonly onState = this.stateSub.subscribe;
  readonly on = {
    CONNECTED: this.subs.CONNECTED.subscribe,
    ANY_MESSAGE: this.subs.MESSAGE.subscribe,
    MESSAGE: this.onMessage,
    CONNECTING: this.subs.CONNECTING.subscribe,
    CLOSE: this.subs.CLOSE.subscribe,
    ERROR: this.subs.ERROR.subscribe,
  } as const;

  constructor(url: string, options: ResilientWebSocketOptions = {}) {
    this.url = url;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  get state() {
    return this._state;
  }

  connect() {
    if (this.socket) {
      return this.socket;
    }
    this.socket = this.options.wsFactory(this.url);
    this.setState(WebSocketState.Connecting);
    this.subs.CONNECTING.emit();
    this.socket.addEventListener("open", this.onOpen);
    this.socket.addEventListener("message", this.onMessageEvent);
    this.socket.addEventListener("close", this.onClose);
    this.socket.addEventListener("error", this.onError);

    return this.socket;
  }

  send(data: UpMessage) {
    if (!this.socket) {
      // should we trhow here ?
      return;
    }
    if (!this.options.autoJsonify) {
      this.socket.send(data as any);
      return;
    }
    const jsonMessage = (() => {
      try {
        return JSON.stringify(data);
      } catch {
        return null;
      }
    })();
    if (jsonMessage === null) {
      // throw invalid json ?
      return;
    }
    this.socket.send(jsonMessage);
  }

  close() {
    if (this.socket) {
      this.socket.close();
      this.subs.CLOSE.emit(undefined);
      this.cleanup();
    }
  }

  private cleanup() {
    if (this.socket) {
      this.socket.removeEventListener("error", this.onError);
      this.socket.removeEventListener("message", this.onMessageEvent);
      this.socket.removeEventListener("open", this.onOpen);
      this.socket.removeEventListener("close", this.onClose);
      this.socket = null;
    }
  }

  private onOpen = () => {
    this.setState(WebSocketState.Connected);
    this.subs.CONNECTED.emit();
  };

  private onMessageEvent = (event: MessageEvent) => {
    if (!this.options.autoJsonify) {
      this.subs.MESSAGE.emit(event.data);
      return;
    }
    const jsonMessage = (() => {
      try {
        return JSON.parse(event.data);
      } catch {
        return undefined;
      }
    })();
    if (jsonMessage === undefined) {
      // throw invalid json ?
      return;
    }
    this.subs.MESSAGE.emit(jsonMessage);
  };

  private onClose = (event?: CloseEvent) => {
    this.cleanup();
    this.setState(WebSocketState.Void);
    this.subs.CLOSE.emit(event);
    setTimeout(() => {
      this.socket = this.connect();
    }, this.options.reconnectInterval);
  };

  private onError = () => {
    this.setState(WebSocketState.Void);
    this.subs.ERROR.emit();
    if (this.options.reconnectOnError) {
      this.onClose();
    }
  };

  private setState(nextState: WebSocketState) {
    if (this._state === nextState) {
      return;
    }
    this._state = nextState;
    this.stateSub.emit(this._state);
  }
}
