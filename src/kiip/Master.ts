import { Subscription } from "suub";

function randomId(size: number) {
  const num = Math.floor(Math.random() * Math.pow(16, size));
  return ("0".repeat(size) + num.toString(16)).slice(-size);
}

const STORAGE_KEY_REQUEST = "MASTER_TAB_REQUEST";
const STORAGE_KEY_ELECT = "MASTER_TAB_ELECT";
const WIN_MASTER_TIMEOUT = 100;
const ELECT_MASTER_TIMEOUT = 100;

export type TabStateType = typeof TabState[keyof typeof TabState];
const TabState = { ACTIVE: 0, PASSIVE: 1, HIDDEN: 2 } as const;

export class Master {
  private readonly subscription = Subscription<boolean>();
  private state = this.getTabState();
  private requestTimer: null | number = null;
  private electTimer: null | number = null;
  private isMaster = false;

  readonly id = randomId(5);

  constructor() {
    window.addEventListener("storage", this.handleStorage);
    window.addEventListener("pageshow", this.handleStateChanged);
    window.addEventListener("focus", this.handleStateChanged);
    window.addEventListener("blur", this.handleStateChanged);
    window.addEventListener("visibilitychange", this.handleStateChanged);
    window.addEventListener("unload", this.handleUnload);
    this.request();
  }

  public subscribe = this.subscription.subscribe;

  getState = () => this.isMaster;

  private get fullId(): string {
    return this.state + "-" + this.id;
  }

  private readonly handleUnload = () => {
    if (this.isMaster) {
      this.setNotMaster();
      const currentMaster = window.localStorage.getItem(STORAGE_KEY_ELECT);
      if (currentMaster === this.fullId) {
        window.localStorage.removeItem(STORAGE_KEY_ELECT);
      }
    }
    window.removeEventListener("storage", this.handleStorage);
    window.removeEventListener("pageshow", this.handleStateChanged);
    window.removeEventListener("focus", this.handleStateChanged);
    window.removeEventListener("blur", this.handleStateChanged);
    window.removeEventListener("visibilitychange", this.handleStateChanged);
    window.removeEventListener("unload", this.handleUnload);
  };

  private readonly handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_REQUEST) {
      this.handleRequest(e.newValue);
    }
    if (e.key === STORAGE_KEY_ELECT) {
      this.handleResponse(e.newValue);
    }
  };

  private readonly handleRequest = (request: string | null) => {
    if (request === null) {
      return;
    }
    if (this.isMasterOf(request)) {
      const currentMaster = window.localStorage.getItem(STORAGE_KEY_ELECT);
      if (currentMaster === null || this.isMasterOf(currentMaster)) {
        this.setMaster();
        return;
      }
      // current is master we need to check it's not dead
      this.request();
    } else {
      this.setNotMaster();
    }
  };

  private readonly handleResponse = (response: string | null) => {
    this.setNotMaster();
    if (response === null) {
      this.request();
      return;
    }
  };

  private readonly handleStateChanged = () => {
    const nextState = this.getTabState();
    if (nextState === this.state) {
      return;
    }
    this.cancelRequestTimer();
    this.cancelWin();
    this.state = nextState;
    this.request();
  };

  private readonly request = () => {
    this.cancelRequestTimer();
    window.localStorage.setItem(STORAGE_KEY_REQUEST, this.fullId);
    this.requestTimer = window.setTimeout(() => {
      this.requestTimer = null;
      this.setMaster();
    }, ELECT_MASTER_TIMEOUT);
  };

  private readonly cancelRequestTimer = () => {
    if (this.requestTimer !== null) {
      window.clearTimeout(this.requestTimer);
      this.requestTimer = null;
    }
  };

  private readonly setMaster = () => {
    window.localStorage.setItem(STORAGE_KEY_ELECT, this.fullId);
    // wait X time before emit isMaster
    this.electTimer = window.setTimeout(() => {
      this.electTimer = null;
      const currentMaster = window.localStorage.getItem(STORAGE_KEY_ELECT);
      const nextIsMaster = currentMaster === this.fullId;
      if (nextIsMaster && this.isMaster !== nextIsMaster) {
        this.isMaster = nextIsMaster;
        this.subscription.emit(nextIsMaster);
      }
    }, WIN_MASTER_TIMEOUT);
  };

  private getTabState(): TabStateType {
    if (document.visibilityState === "hidden") {
      return TabState.HIDDEN;
    } else if (document.hasFocus()) {
      return TabState.ACTIVE;
    }
    return TabState.PASSIVE;
  }

  private isMasterOf(id: string): boolean {
    // the first in the list is win !
    return this.fullId.localeCompare(id) === -1;
  }

  private cancelWin() {
    if (this.electTimer !== null) {
      window.clearTimeout(this.electTimer);
      this.electTimer = null;
    }
  }

  private setNotMaster() {
    this.cancelWin();
    this.cancelRequestTimer();
    const nextIsMaster = false;
    if (this.isMaster !== nextIsMaster) {
      this.isMaster = nextIsMaster;
      this.subscription.emit(nextIsMaster);
    }
  }
}
