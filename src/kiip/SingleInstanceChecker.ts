const LOCALSTORAGE_KEY_CHECK = "LOCALSTORAGE_KEY_CHECK";
const LOCALSTORAGE_KEY_RESPONSE = "LOCALSTORAGE_KEY_RESPONSE";

const randomId = (size: number) => {
  return ("0".repeat(size) + Math.floor(Math.random() * Math.pow(16, size)).toString(16)).slice(
    -size
  );
};

export class SingleInstanceChecker {
  private readonly instanceKey = randomId(6);

  constructor() {
    window.addEventListener("storage", this.storageChanged);
    document.addEventListener("visibilitychange", this.visibilityChanged);
    console.log("set key");
    this.setKey(LOCALSTORAGE_KEY_CHECK, this.instanceKey);
  }

  storageChanged = (e: StorageEvent) => {
    console.log(e);
    if (!e.newValue) {
      return;
    }
    if (e.key === LOCALSTORAGE_KEY_CHECK) {
      if (e.newValue !== this.instanceKey) {
        this.setKey(LOCALSTORAGE_KEY_RESPONSE, this.instanceKey);
      }
      return;
    }
    if (e.key === LOCALSTORAGE_KEY_RESPONSE) {
      console.log("response", e.newValue);
      if (e.newValue === this.instanceKey) {
        console.log("=> Master");
      } else {
        console.log("=> Slave");
      }
      return;
    }
  };

  visibilityChanged = () => {
    console.log({ hidden: document.hidden });
  };

  setKey(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
      // setTimeout(() => {
      //   window.localStorage.removeItem(key);
      // }, 100);
    } catch (e) {}
  }
}
