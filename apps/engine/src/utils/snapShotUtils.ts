import {
  MaxPriorityQueue,
  MinPriorityQueue,
} from "@datastructures-js/priority-queue";
import type {
  BalanceAmt,
  BalanceAmtJSON,
  liqOrder,
  LiqOrderJSON,
  OpenPositionsJSON,
  OrderI,
  OrderJSON,
  ShortOrderHmJSON,
  UserBalanceJSON,
  UserI,
  UserJSON,
  UsersJSON,
} from "./types";

export function usersToJSON(users: Map<string, UserI>): string {
  const usersArray: [string, UserJSON][] = Array.from(users.entries()).map(
    ([userId, user]) => {
      const balanceArray: [string, BalanceAmtJSON][] = Array.from(
        user.balance.entries()
      );

      const userJSON: UserJSON = {
        id: user.id,
        email: user.email,
        balance: balanceArray,
      };

      return [userId, userJSON];
    }
  );

  const serializable: UsersJSON = {
    users: usersArray,
  };

  return JSON.stringify(serializable, null, 2);
}

export function JSONToUsers(jsonString: string): Map<string, UserI> {
  const parsed: UsersJSON = JSON.parse(jsonString);
  const users = new Map<string, UserI>();

  for (const [userId, userJSON] of parsed.users) {
    const balanceMap = new Map<string, BalanceAmt>();

    // Reconstruct the balance Map
    for (const [asset, balanceAmt] of userJSON.balance) {
      balanceMap.set(asset, balanceAmt);
    }

    const user: UserI = {
      id: userJSON.id,
      email: userJSON.email,
      balance: balanceMap,
    };

    users.set(userId, user);
  }

  return users;
}

export function openPositionsToJSON(
  openPositions: Map<string, OrderI>
): string {
  const positionsArray: [string, OrderJSON][] = Array.from(
    openPositions.entries()
  ).map(([orderId, order]) => {
    const orderJSON: OrderJSON = {
      id: order.id,
      userId: order.userId,
      asset: order.asset,
      type: order.type,
      margin: order.margin,
      leverage: order.leverage,
      slippage: order.slippage,
      liquidationPrice: order.liquidationPrice,
      entryPrice: order.entryPrice,
      status: order.status,
      quantity: order.quantity,
    };

    return [orderId, orderJSON];
  });

  const serializable: OpenPositionsJSON = {
    open_positions: positionsArray,
  };

  return JSON.stringify(serializable, null, 2);
}

export function JSONToOpenPositions(jsonString: string): Map<string, OrderI> {
  const parsed: OpenPositionsJSON = JSON.parse(jsonString);
  const openPositions = new Map<string, OrderI>();

  for (const [orderId, orderJSON] of parsed.open_positions) {
    const order: OrderI = {
      id: orderJSON.id,
      userId: orderJSON.userId,
      asset: orderJSON.asset,
      type: orderJSON.type,
      margin: orderJSON.margin,
      leverage: orderJSON.leverage,
      slippage: orderJSON.slippage,
      liquidationPrice: orderJSON.liquidationPrice,
      entryPrice: orderJSON.entryPrice,
      status: orderJSON.status,
      quantity: orderJSON.quantity,
    };

    openPositions.set(orderId, order);
  }

  return openPositions;
}

export function userBalanceToJSON(user_balance: Map<string, number>): string {
  const balanceArray: [string, number][] = Array.from(user_balance.entries());

  const serializable: UserBalanceJSON = {
    user_balance: balanceArray
  };

  return JSON.stringify(serializable, null, 2);
}

/**
 * Converts JSON string back to user_balance Map
 */
export function jsonToUserBalance(jsonString: string): Map<string, number> {
  const parsed: UserBalanceJSON = JSON.parse(jsonString);
  
  const userBalance = new Map<string, number>();

  for (const [userId, balance] of parsed.user_balance) {
    userBalance.set(userId, balance);
  }

  return userBalance;
}



export function shortOrderHmToJSON(
  shortOrderHm: Map<string, MinPriorityQueue<liqOrder>>
): string {
  const shortOrderArray: [string, LiqOrderJSON[]][] = Array.from(
    shortOrderHm.entries()
  ).map(([asset, priorityQueue]) => {
    const ordersArray: liqOrder[] = [];
    const tempQueue = new MinPriorityQueue<liqOrder>((order) => order.liqPrice);

    // Extract all elements and store them
    while (!priorityQueue.isEmpty()) {
      const order = priorityQueue.dequeue();
      ordersArray.push(order!);
      tempQueue.enqueue(order!); // Keep for restoration
    }

    // Restore the original queue
    while (!tempQueue.isEmpty()) {
      priorityQueue.enqueue(tempQueue.dequeue()!);
    }

    return [asset, ordersArray];
  });

  const serializable: ShortOrderHmJSON = {
    shortOrderHm: shortOrderArray,
  };

  return JSON.stringify(serializable, null, 2);
}

export function JSONToShortOrderHm(
  jsonString: string
): Map<string, MinPriorityQueue<liqOrder>> {
  const parsed: ShortOrderHmJSON = JSON.parse(jsonString);
  const shortOrderHm = new Map<string, MinPriorityQueue<liqOrder>>();

  for (const [asset, ordersArray] of parsed.shortOrderHm) {
    const priorityQueue = new MinPriorityQueue<liqOrder>(
      (order) => order.liqPrice
    );

    for (const orderJSON of ordersArray) {
      const order: liqOrder = {
        orderId: orderJSON.orderId,
        liqPrice: orderJSON.liqPrice,
        userId: orderJSON.userId,
        asset: orderJSON.asset,
      };

      priorityQueue.enqueue(order);
    }
    shortOrderHm.set(asset, priorityQueue);
  }

  return shortOrderHm;
}

export function longOrderHmToJSON(
  longOrderHm: Map<string, MaxPriorityQueue<liqOrder>>
) {
  const longOrderArray: [string, liqOrder[]][] = Array.from(
    longOrderHm.entries()
  ).map(([asset, priorityQueue]) => {
    const ordersArray: liqOrder[] = [];
    const tempQueue = new MaxPriorityQueue<liqOrder>();

    while (!priorityQueue.isEmpty()) {
      const order = priorityQueue.dequeue();
      ordersArray.push(order!);
      tempQueue.enqueue(order!);
    }

    while (!tempQueue.isEmpty()) {
      priorityQueue.enqueue(tempQueue.dequeue()!);
    }

    return [asset, ordersArray];
  });

  const serializable: ShortOrderHmJSON = {
    shortOrderHm: longOrderArray,
  };

  return JSON.stringify(serializable, null, 2);
}

export function JSONToLongOrderHm(
  jsonString: string
): Map<string, MaxPriorityQueue<liqOrder>> {
  const parsed: ShortOrderHmJSON = JSON.parse(jsonString);
  const longOrderHm = new Map<string, MaxPriorityQueue<liqOrder>>();

  for (const [asset, ordersArray] of parsed.shortOrderHm) {
    const priorityQueue = new MaxPriorityQueue<liqOrder>(
      (order) => order.liqPrice
    );

    for (const orderJSON of ordersArray) {
      const order: liqOrder = {
        orderId: orderJSON.orderId,
        liqPrice: orderJSON.liqPrice,
        userId: orderJSON.userId,
        asset: orderJSON.asset,
      };

      priorityQueue.enqueue(order);
    }
    longOrderHm.set(asset, priorityQueue);
  }

  return longOrderHm;
}
