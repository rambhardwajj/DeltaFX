import { redisConsumer } from "../config/redisConsumer";

const idPromseMap = new Map<string, (value: any) => any>();

let startLoop = false;
let offset = "$";

async function runLoop() {
  while (idPromseMap.size > 0) {
    console.log("checking")
    const res = await redisConsumer.xRead(
      {
        key: "return-stream",
        id: offset,
      },
      {
        BLOCK: 0,
        COUNT: 1,
      }
    );

    if (!res) continue;
  
    // console.log(res)

    // @ts-ignore
    const { name, messages } = res[0];
    // console.log(name, messages)
    const  data  = JSON.parse(messages[0].message.data);
    console.log(data)
    // if (!data) continue;

    const orderId = data.orderId;
    if (idPromseMap.has(orderId)) {
      idPromseMap.get(orderId)!(data);
      idPromseMap.delete(orderId)
    }
  }
}

export const waitForId = async (orderId: string) => {
  const newPromise = new Promise((resolve, reject) => {
    idPromseMap.set(orderId, resolve);
    console.log("promiseData mai ")
    setTimeout(() => {
      reject(null);
    }, 5000);
  });
  if (idPromseMap.size === 1) {
    runLoop();
  }


  return newPromise;
};
