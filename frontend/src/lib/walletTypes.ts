export interface WalletProvider {
  connect(): Promise<string>;
  signTransaction(xdr: string): Promise<string>;
  isAvailable(): boolean;
  getPublicKey(): Promise<string>;
}

export type WalletType = 'local' | 'freighter' | 'xbull' | 'lobstr';
