import { Subscription } from 'suub';

export interface OnCallback {
  (arg: any): void;
}

export interface ResilientWebSocketOptions {
  autoJsonify?: boolean;
  autoConnect?: boolean;
  reconnectInterval?: number;
  reconnectOnError?: boolean;
}

export const DEFAULT_OPTIONS: Required<ResilientWebSocketOptions> = {
  autoJsonify: false,
  autoConnect: true,
  reconnectInterval: 1000,
  reconnectOnError: true,
};

export enum WebSocketEvent {
  CONNECTED = 'connected',
  MESSAGE = 'message',
  CONNECTING = 'connecting',
  CLOSE = 'close',
  ERROR = 'error',
}

export enum WebSocketState {
  Void = 'Void',
  Connecting = 'Connecting',
  Connected = 'Connected',
}

export interface WebSocketFactory {
  (url: string): WebSocket;
}

const DEFAULT_WS_FACTORY: WebSocketFactory = (url: string) => new WebSocket(url);

export class ResilientWebSocket<T> {
  private socket: WebSocket | null = null;
  private _state: WebSocketState = WebSocketState.Void;

  private readonly wsFactory: WebSocketFactory;
  private readonly url: string;
  private readonly options: Required<ResilientWebSocketOptions>;

  private readonly stateSub = Subscription<WebSocketState>() as Subscription<WebSocketState>;
  private readonly subs = {
    CONNECTED: Subscription(),
    MESSAGE: Subscription<T>() as Subscription<T>,
    CONNECTING: Subscription(),
    CLOSE: Subscription() as Subscription<CloseEvent | undefined>,
    ERROR: Subscription(),
  } as const;

  readonly onState = this.stateSub.subscribe;
  readonly on = {
    CONNECTED: this.subs.CONNECTED.subscribe,
    MESSAGE: this.subs.MESSAGE.subscribe,
    CONNECTING: this.subs.CONNECTING.subscribe,
    CLOSE: this.subs.CLOSE.subscribe,
    ERROR: this.subs.ERROR.subscribe,
  } as const;

  constructor(
    url: string,
    options: ResilientWebSocketOptions = {},
    wsFactory: WebSocketFactory = DEFAULT_WS_FACTORY
  ) {
    this.wsFactory = wsFactory;
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
    this.socket = this.wsFactory(this.url);

    this._state = WebSocketState.Connecting;
    this.stateSub.emit(this._state);
    this.subs.CONNECTING.emit();
    this.socket.addEventListener('open', this.onOpen);
    this.socket.addEventListener('message', this.onMessage);
    this.socket.addEventListener('close', this.onClose);
    this.socket.addEventListener('error', this.onError);

    return this.socket;
  }

  send(data: any) {
    if (this.socket) {
      this.socket.send(this.options.autoJsonify ? JSON.stringify(data) : data);
    }
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
      this.socket.removeEventListener('error', this.onError);
      this.socket.removeEventListener('message', this.onMessage);
      this.socket.removeEventListener('open', this.onOpen);
      this.socket.removeEventListener('close', this.onClose);
      this.socket = null;
    }
  }

  private onOpen = () => {
    this._state = WebSocketState.Connected;
    this.subs.CONNECTED.emit();
    this.stateSub.emit(this._state);
  };

  private onMessage = (event: MessageEvent) => {
    const message: T = this.options.autoJsonify ? JSON.parse(event.data) : event.data;
    this.subs.MESSAGE.emit(message);
  };

  private onClose = (event?: CloseEvent) => {
    this.cleanup();
    this._state = WebSocketState.Void;
    this.stateSub.emit(this._state);
    this.subs.CLOSE.emit(event);
    setTimeout(() => {
      this.socket = this.connect();
    }, this.options.reconnectInterval);
  };

  private onError = () => {
    this._state = WebSocketState.Void;
    this.stateSub.emit(this._state);
    this.subs.ERROR.emit();
    if (this.options.reconnectOnError) {
      this.onClose();
    }
  };
}
