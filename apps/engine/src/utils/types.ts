export interface BalanceAmt {
  balance: number,
  decimal: number
}
export interface UserI {
  id: string,
  email: string, 
  balance:  Map<string, BalanceAmt>
}
export interface OrderI{
  id: string, 
  asset: string,
  type: string,
  margin: number,
  leverage: number,
  slippage: number,
  liquidationPrice: number,
  quantity: number, 
  exposedQuantity : number,

}