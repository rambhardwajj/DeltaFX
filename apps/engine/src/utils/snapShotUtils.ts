import {
  MaxPriorityQueue,
  MinPriorityQueue,
} from "@datastructures-js/priority-queue";
import type {
  BalanceAmt,
  BalanceAmtJSON,
  liqOrder,
  LiqOrderJSON,
  LongOrderHmJSON,
  OpenPositionsJSON,
  OrderI,
  OrderJSON,
  ShortOrderHmJSON,
  UserBalanceJSON,
  UserI,
  UserJSON,
  UsersJSON,
} from "./types";

// users 

export function usersToJSON(users: Map<string, UserI>): string {
  try {
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
  } catch (error) {
    console.error("Error serializing users to JSON:", error);
    return JSON.stringify({ users: [] }, null, 2);
  }
}

// json to users 
export function JSONToUsers(jsonString: string): Map<string, UserI> {
  try {
    if (!jsonString || jsonString.trim() === '') {
      console.warn("Empty jsonString provided for JSONToUsers");
      return new Map<string, UserI>();
    }

    const parsed: UsersJSON = JSON.parse(jsonString);
    const users = new Map<string, UserI>();

    if (!parsed || typeof parsed !== 'object' || !parsed.users || !Array.isArray(parsed.users)) {
      console.warn("Invalid users JSON structure, returning empty map");
      return users;
    }

    for (const [userId, userJSON] of parsed.users) {
      if (!userId || !userJSON || !userJSON.id || !userJSON.email) {
        console.warn(`Skipping invalid user data for userId: ${userId}`);
        continue;
      }

      const balanceMap = new Map<string, BalanceAmt>();

      if (Array.isArray(userJSON.balance)) {
        for (const [asset, balanceAmt] of userJSON.balance) {
          if (asset && balanceAmt && 
              typeof balanceAmt.balance === 'number' && 
              typeof balanceAmt.type === 'string') {
            balanceMap.set(asset, balanceAmt);
          } else {
            console.warn(`Invalid balance data for user ${userId}, asset ${asset}`);
          }
        }
      }

      const user: UserI = {
        id: userJSON.id,
        email: userJSON.email,
        balance: balanceMap,
      };

      users.set(userId, user);
    }

    return users;
  } catch (error) {
    console.error("Error parsing users JSON:", error);
    return new Map<string, UserI>();
  }
}

// ==================== OPEN POSITIONS SERIALIZATION ====================

export function openPositionsToJSON(openPositions: Map<string, OrderI>): string {
  try {
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
  } catch (error) {
    console.error("Error serializing open positions to JSON:", error);
    return JSON.stringify({ open_positions: [] }, null, 2);
  }
}

export function JSONToOpenPositions(jsonString: string): Map<string, OrderI> {
  try {
    if (!jsonString || jsonString.trim() === '') {
      console.warn("Empty jsonString provided for JSONToOpenPositions");
      return new Map<string, OrderI>();
    }

    const parsed: OpenPositionsJSON = JSON.parse(jsonString);
    const openPositions = new Map<string, OrderI>();

    if (!parsed || typeof parsed !== 'object' || !parsed.open_positions || !Array.isArray(parsed.open_positions)) {
      console.warn("Invalid open positions JSON structure, returning empty map");
      return openPositions;
    }

    for (const [orderId, orderJSON] of parsed.open_positions) {
      if (!orderId || !orderJSON || !orderJSON.id || !orderJSON.userId) {
        console.warn(`Skipping invalid order data for orderId: ${orderId}`);
        continue;
      }

      // Validate required numeric fields
      if (typeof orderJSON.margin !== 'number' || 
          typeof orderJSON.leverage !== 'number' ||
          typeof orderJSON.entryPrice !== 'number' ||
          typeof orderJSON.quantity !== 'number') {
        console.warn(`Skipping order with invalid numeric fields for orderId: ${orderId}`);
        continue;
      }

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
  } catch (error) {
    console.error("Error parsing open positions JSON:", error);
    return new Map<string, OrderI>();
  }
}

// ==================== USER BALANCE SERIALIZATION ====================

export function userBalanceToJSON(user_balance: Map<string, number>): string {
  try {
    const balanceArray: [string, number][] = Array.from(user_balance.entries());

    const serializable: UserBalanceJSON = {
      user_balance: balanceArray
    };

    return JSON.stringify(serializable, null, 2);
  } catch (error) {
    console.error("Error serializing user balance to JSON:", error);
    return JSON.stringify({ user_balance: [] }, null, 2);
  }
}

export function jsonToUserBalance(jsonString: string): Map<string, number> {
  try {
    if (!jsonString || jsonString.trim() === '') {
      console.warn("Empty jsonString provided for jsonToUserBalance");
      return new Map<string, number>();
    }

    const parsed: UserBalanceJSON = JSON.parse(jsonString);
    const userBalance = new Map<string, number>();

    if (!parsed || typeof parsed !== 'object' || !parsed.user_balance || !Array.isArray(parsed.user_balance)) {
      console.warn("Invalid user balance JSON structure, returning empty map");
      return userBalance;
    }

    for (const [userId, balance] of parsed.user_balance) {
      if (userId && typeof balance === 'number' && !isNaN(balance)) {
        userBalance.set(userId, balance);
      } else {
        console.warn(`Skipping invalid balance data for userId: ${userId}, balance: ${balance}`);
      }
    }

    return userBalance;
  } catch (error) {
    console.error("Error parsing user balance JSON:", error);
    return new Map<string, number>();
  }
}

// ==================== SHORT ORDER SERIALIZATION ====================

export function shortOrderHmToJSON(
  shortOrderHm: Map<string, MinPriorityQueue<liqOrder>>
): string {
  try {
    const shortOrderArray: [string, LiqOrderJSON[]][] = Array.from(
      shortOrderHm.entries()
    ).map(([asset, priorityQueue]) => {
      const ordersArray: liqOrder[] = [];
      const tempQueue = new MinPriorityQueue<liqOrder>((order) => order.liqPrice);

      // Extract all elements and store them
      while (!priorityQueue.isEmpty()) {
        const order = priorityQueue.dequeue();
        if (order) {
          ordersArray.push(order);
          tempQueue.enqueue(order); // Keep for restoration
        }
      }

      // Restore the original queue
      while (!tempQueue.isEmpty()) {
        const order = tempQueue.dequeue();
        if (order) {
          priorityQueue.enqueue(order);
        }
      }

      return [asset, ordersArray];
    });

    const serializable: ShortOrderHmJSON = {
      shortOrderHm: shortOrderArray,
    };

    return JSON.stringify(serializable, null, 2);
  } catch (error) {
    console.error("Error serializing short orders to JSON:", error);
    return JSON.stringify({ shortOrderHm: [] }, null, 2);
  }
}

export function JSONToShortOrderHm(
  jsonString: string
): Map<string, MinPriorityQueue<liqOrder>> {
  try {
    if (!jsonString || jsonString.trim() === '') {
      console.warn("Empty jsonString provided for JSONToShortOrderHm");
      return new Map<string, MinPriorityQueue<liqOrder>>();
    }

    const parsed: ShortOrderHmJSON = JSON.parse(jsonString);
    const shortOrderHm = new Map<string, MinPriorityQueue<liqOrder>>();

    if (!parsed || typeof parsed !== 'object' || !parsed.shortOrderHm || !Array.isArray(parsed.shortOrderHm)) {
      console.warn("Invalid short order JSON structure, returning empty map");
      return shortOrderHm;
    }

    for (const [asset, ordersArray] of parsed.shortOrderHm) {
      if (!asset || !Array.isArray(ordersArray)) {
        console.warn(`Skipping invalid short order data for asset: ${asset}`);
        continue;
      }

      const priorityQueue = new MinPriorityQueue<liqOrder>(
        (order) => order.liqPrice
      );

      for (const orderJSON of ordersArray) {
        if (orderJSON && 
            orderJSON.orderId && 
            typeof orderJSON.liqPrice === 'number' && 
            !isNaN(orderJSON.liqPrice) &&
            orderJSON.userId &&
            orderJSON.asset) {
          const order: liqOrder = {
            orderId: orderJSON.orderId,
            liqPrice: orderJSON.liqPrice,
            userId: orderJSON.userId,
            asset: orderJSON.asset,
          };
          priorityQueue.enqueue(order);
        } else {
          console.warn(`Skipping invalid order in short queue for asset ${asset}:`, orderJSON);
        }
      }
      
      shortOrderHm.set(asset, priorityQueue);
    }

    return shortOrderHm;
  } catch (error) {
    console.error("Error parsing short orders JSON:", error);
    return new Map<string, MinPriorityQueue<liqOrder>>();
  }
}

// ==================== LONG ORDER SERIALIZATION ====================

export function longOrderHmToJSON(
  longOrderHm: Map<string, MaxPriorityQueue<liqOrder>>
): string {
  try {
    const longOrderArray: [string, liqOrder[]][] = Array.from(
      longOrderHm.entries()
    ).map(([asset, priorityQueue]) => {
      const ordersArray: liqOrder[] = [];
      const tempQueue = new MaxPriorityQueue<liqOrder>((order) => order.liqPrice);

      while (!priorityQueue.isEmpty()) {
        const order = priorityQueue.dequeue();
        if (order) {
          ordersArray.push(order);
          tempQueue.enqueue(order);
        }
      }

      while (!tempQueue.isEmpty()) {
        const order = tempQueue.dequeue();
        if (order) {
          priorityQueue.enqueue(order);
        }
      }

      return [asset, ordersArray];
    });

    const serializable: LongOrderHmJSON = {
      longOrderHm: longOrderArray,
    };

    return JSON.stringify(serializable, null, 2);
  } catch (error) {
    console.error("Error serializing long orders to JSON:", error);
    return JSON.stringify({ longOrderHm: [] }, null, 2);
  }
}

export function JSONToLongOrderHm(
  jsonString: string
): Map<string, MaxPriorityQueue<liqOrder>> {
  try {
    if (!jsonString || jsonString.trim() === '') {
      console.warn("Empty jsonString provided for JSONToLongOrderHm");
      return new Map<string, MaxPriorityQueue<liqOrder>>();
    }

    // FIXED: Use LongOrderHmJSON instead of ShortOrderHmJSON
    const parsed: LongOrderHmJSON = JSON.parse(jsonString);
    const longOrderHm = new Map<string, MaxPriorityQueue<liqOrder>>();

    // FIXED: Check for longOrderHm property instead of shortOrderHm
    if (!parsed || typeof parsed !== 'object' || !parsed.longOrderHm || !Array.isArray(parsed.longOrderHm)) {
      console.warn("Invalid long order JSON structure, returning empty map");
      return longOrderHm;
    }

    // FIXED: Use longOrderHm property instead of shortOrderHm
    for (const [asset, ordersArray] of parsed.longOrderHm) {
      if (!asset || !Array.isArray(ordersArray)) {
        console.warn(`Skipping invalid long order data for asset: ${asset}`);
        continue;
      }

      const priorityQueue = new MaxPriorityQueue<liqOrder>(
        (order) => order.liqPrice
      );

      for (const orderJSON of ordersArray) {
        if (orderJSON && 
            orderJSON.orderId && 
            typeof orderJSON.liqPrice === 'number' && 
            !isNaN(orderJSON.liqPrice) &&
            orderJSON.userId &&
            orderJSON.asset) {
          const order: liqOrder = {
            orderId: orderJSON.orderId,
            liqPrice: orderJSON.liqPrice,
            userId: orderJSON.userId,
            asset: orderJSON.asset,
          };
          priorityQueue.enqueue(order);
        } else {
          console.warn(`Skipping invalid order in long queue for asset ${asset}:`, orderJSON);
        }
      }
      
      longOrderHm.set(asset, priorityQueue);
    }

    return longOrderHm;
  } catch (error) {
    console.error("Error parsing long orders JSON:", error);
    return new Map<string, MaxPriorityQueue<liqOrder>>();
  }
}