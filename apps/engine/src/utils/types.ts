
export interface BalanceAmt {
  balance: number,
  type: string
}
export interface UserI {
  id: string,
  email: string, 
  balance:  Map<string, BalanceAmt> // balance is map of asset and its value/quantity
}
export interface OrderI{
  id: string, 
  userId: string,
  asset: string,
  type: string,
  margin: number,
  leverage: number,
  slippage: number,
  liquidationPrice?: number,
  entryPrice: number,
  status: string,
  quantity: number
}

export type liqOrder = {
  orderId: string;
  liqPrice: number;
  userId: string;
  asset: string;
};

export interface BalanceAmtJSON {
  balance: number,
  type: string
}

export interface UserJSON {
  id: string,
  email: string,
  balance: [string, BalanceAmtJSON][] // Array of key-value pairs
}

export interface UsersJSON {
  users: [string, UserJSON][] // Array of key-value pairs
}

export interface OrderJSON {
  id: string, 
  userId: string,
  asset: string,
  type: string,
  margin: number,
  leverage: number,
  slippage: number,
  liquidationPrice?: number,
  entryPrice: number,
  status: string,
  quantity: number
}

export interface OpenPositionsJSON {
  open_positions: [string, OrderJSON][] // Array of key-value pairs
}

export interface LiqOrderJSON {
  orderId: string;
  liqPrice: number;
  userId: string;
  asset: string;
}

export interface ShortOrderHmJSON {
  shortOrderHm: [string, LiqOrderJSON[]][] // Array of [asset, orders[]] pairs
}

export interface UserBalanceJSON {
  user_balance: [string, number][] // Array of key-value pairs
}

export interface LongOrderHmJSON {
  longOrderHm: [string, LiqOrderJSON[]][]
}