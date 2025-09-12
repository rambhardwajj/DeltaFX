import { ASSETS } from "@repo/config";
import WebSocket, { WebSocketServer } from "ws";
import { redisConsumer } from "./redisConsumer";
type User = { ws: WebSocket };

const users: User[] = [];
const wss = new WebSocketServer({ port: 8080 });

// async function connectClient() {
//   try {
//     await redisConsumer.connect();
//     console.log("connected to redis subs client ");
//   } catch (error) {
//     console.log(error);
//   }
// }

// connectClient();

wss.on("connection", (ws) => {
  const user: User = { ws };
  users.push(user);

  ws.on("close", () => {
    console.log("user disconnected");
    const ind = users.indexOf(user);
    if (ind != -1) users.splice(ind, 1);
  });
});


async function subscribeToTheStream() {
  while (true) {
    const response = await redisConsumer.xRead(
      [
        {
          key: "stream",
          id: "$",
        },
      ],
      {
        BLOCK: 0,
        COUNT: 1,
      }
    );

    if (response === null) continue;
    // @ts-ignore
    const { messages } = response[0];
    console.log(messages);
    const { streamName, data } = JSON.parse(messages[0].message.data);

    switch (streamName) {
      case "curr-prices": {
        // sall connected users ko data send
        users.forEach((user) => {
          user.ws.send(JSON.stringify(data));
        });
        break;
      }
      default: {
        break;
      }
    }
  }
}

subscribeToTheStream();
