declare global {
  interface Window {
    electron: {
      ipc: {
        invoke: (channel: string, data?: any) => Promise<any>;
        on: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
        off: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
        once: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
      };
    };
  }
}

export {};
